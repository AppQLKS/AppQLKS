import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSse, startApi } from './helpers.js';

let api;
before(async () => (api = await startApi()));
after(() => api.close());

const patch = (path, body, token) =>
  fetch(api.base + path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });

const dayFromToday = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('en-CA');
};
const guest = (name = 'Lan Nguyen') => ({ guestName: name, guests: 2, checkOut: dayFromToday(2) });

test('check-in validates the room, the guest and the dates', async () => {
  const reception = await api.staffToken('RC-01');
  const kitchen = await api.staffToken('KT-02');

  assert.equal((await api.post('/rooms/103/checkin', guest(), kitchen)).status, 403);
  assert.equal((await api.post('/rooms/103/checkin', guest())).status, 401);
  assert.equal((await api.post('/rooms/999/checkin', guest(), reception)).status, 404);
  assert.equal((await api.post('/rooms/101/checkin', guest(), reception)).status, 409); // có khách
  assert.equal((await api.post('/rooms/304/checkin', guest(), reception)).status, 409); // cần dọn

  for (const bad of [
    { ...guest(), guestName: '   ' },
    { ...guest(), guestName: 'x'.repeat(81) },
    { ...guest(), guests: 0 },
    { ...guest(), guests: 2.5 },
    { ...guest(), guests: 7 },
    { ...guest(), checkOut: dayFromToday(0) },
    { ...guest(), checkOut: dayFromToday(-1) },
    { ...guest(), checkOut: dayFromToday(61) },
    { ...guest(), checkOut: '2026-02-30' },
    { ...guest(), checkOut: 'tomorrow' },
  ]) {
    assert.equal((await api.post('/rooms/103/checkin', bad, reception)).status, 400, JSON.stringify(bad));
  }
  // Không tạo nhầm lượt lưu trú nào
  assert.equal((await (await api.get('/rooms/103', reception)).json()).status, 'vacant');
});

test('checking in a vacant room creates a stay with a working door code', async () => {
  const reception = await api.staffToken('RC-01');
  const stream = await openSse(api.base, '/requests/events', reception);

  const res = await api.post('/rooms/103/checkin', { guestName: '  Lan   Nguyen ', guests: 2, checkOut: dayFromToday(3) }, reception);
  assert.equal(res.status, 201);
  const { stay } = await res.json();
  assert.equal(stay.guestName, 'Lan Nguyen');
  assert.equal(stay.checkIn, dayFromToday(0));
  assert.match(stay.accessCode, /^[A-Z0-9]{6}$/);
  await stream.waitFor((e) => e.type === 'stay' && e.data.type === 'checked_in' && e.data.roomNumber === '103');
  stream.stop();

  const rooms = await (await api.get('/rooms', reception)).json();
  const room = rooms.find((r) => r.number === '103');
  assert.equal(room.status, 'occupied');
  assert.equal(room.guestName, 'Lan Nguyen');

  // Khách đăng nhập bằng mã mới, hoá đơn trống
  const token = await api.guestToken(stay.accessCode);
  const me = await (await api.get('/me', token)).json();
  assert.equal(me.guest.name, 'Lan Nguyen');
  assert.equal((await (await api.get('/me/folio', token)).json()).total, 0);

  // Không nhận phòng 2 lần
  assert.equal((await api.post('/rooms/103/checkin', guest('Someone Else'), reception)).status, 409);
});

test('finishing turnover cleaning frees the room, and the next guest starts with a clean bill', async () => {
  const reception = await api.staffToken('RC-01');
  const minh = await api.staffToken('HK-04');

  // Khách cũ phòng 305 có đơn đồ ăn trên hoá đơn
  const oldGuest = await api.guestToken('A8K92P');
  assert.ok((await (await api.get('/me/folio', oldGuest)).json()).total > 0);
  const { turnoverRequestId } = await (await api.post('/checkout/305/approve', {}, reception)).json();
  assert.equal((await api.post('/rooms/305/checkin', guest(), reception)).status, 409); // chưa dọn

  const stream = await openSse(api.base, '/requests/events', reception);
  assert.equal((await api.post(`/requests/${turnoverRequestId}/claim`, {}, minh)).status, 200);
  assert.equal((await patch(`/requests/${turnoverRequestId}/status`, { status: 'completed' }, minh)).status, 200);
  await stream.waitFor((e) => e.type === 'stay' && e.data.type === 'room_ready' && e.data.roomNumber === '305');
  stream.stop();
  assert.equal((await (await api.get('/rooms/305', reception)).json()).status, 'vacant');

  const { stay } = await (await api.post('/rooms/305/checkin', guest('Minh Tran'), reception)).json();
  const newGuest = await api.guestToken(stay.accessCode);
  const folio = await (await api.get('/me/folio', newGuest)).json();
  assert.equal(folio.total, 0);
  assert.deepEqual(folio.lines, []);
  assert.deepEqual(await (await api.get('/me/requests', newGuest)).json(), []);
  // Lễ tân cũng thấy hoá đơn mới trống
  assert.equal((await (await api.get('/rooms/305', reception)).json()).folio.total, 0);
});

test('front desk or housekeeping can mark a room ready by hand', async () => {
  const kitchen = await api.staffToken('KT-02');
  const soraia = await api.staffToken('HK-05');
  const manager = await api.staffToken('MG-01');

  assert.equal((await api.post('/rooms/304/ready', {}, kitchen)).status, 403);
  assert.equal((await api.post('/rooms/304/ready', {}, soraia)).status, 200);
  assert.equal((await (await api.get('/rooms/304', soraia)).json()).status, 'vacant');
  assert.equal((await api.post('/rooms/304/ready', {}, soraia)).status, 409); // đã Trống

  // Đánh dấu tay thì việc dọn phòng còn mở được đóng lại
  const { turnoverRequestId } = await (await api.post('/checkout/308/approve', {}, manager)).json();
  assert.equal((await api.post('/rooms/308/ready', {}, manager)).status, 200);
  const requests = await (await api.get('/requests?room=308', manager)).json();
  assert.equal(requests.find((r) => r.id === turnoverRequestId).status, 'cancelled');
});
