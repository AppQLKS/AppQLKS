import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { openSse, startApi } from './helpers.js';

let api;
before(async () => (api = await startApi()));
after(() => api.close());

const del = (path, token) => fetch(api.base + path, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });

test('guest requests express checkout, can cancel, and reception sees the queue', async () => {
  const guest = await api.guestToken('A8K92P'); // phòng 305
  const reception = await api.staffToken('RC-01');

  const before = await (await api.get('/me/checkout', guest)).json();
  assert.equal(before.requested, false);
  assert.equal(before.folio.total, 26.95);

  const requested = await (await api.post('/me/checkout', {}, guest)).json();
  assert.equal(requested.requested, true);
  assert.ok(requested.requestedAt);
  // Gọi lại vẫn an toàn, giữ nguyên thời điểm xin
  assert.equal((await (await api.post('/me/checkout', {}, guest)).json()).requestedAt, requested.requestedAt);

  const queue = await (await api.get('/checkout', reception)).json();
  assert.deepEqual(queue.map((q) => q.roomNumber), ['305']);
  assert.equal(queue[0].folio.total, 26.95);
  const rooms = await (await api.get('/rooms', reception)).json();
  assert.equal(rooms.find((r) => r.number === '305').checkoutRequested, true);

  const cancelled = await (await del('/me/checkout', guest)).json();
  assert.equal(cancelled.requested, false);
  assert.deepEqual(await (await api.get('/checkout', reception)).json(), []);
});

test('approving checkout ends the stay, revokes the code and queues turnover cleaning', async () => {
  const guest = await api.guestToken('X7M41Q'); // phòng 204, có REQ-412 đang chờ
  const reception = await api.staffToken('RC-01');
  await api.post('/me/checkout', {}, guest);

  const guestStream = await openSse(api.base, '/me/events', guest);
  const staffStream = await openSse(api.base, '/requests/events', reception);

  const res = await api.post('/checkout/204/approve', {}, reception);
  assert.equal(res.status, 200);
  const done = await res.json();
  assert.equal(done.folio.total, 58.3);
  assert.match(done.turnoverRequestId, /^REQ-\d+$/);

  // Khách được báo đã trả phòng, luồng đóng
  const ev = await guestStream.waitFor((e) => e.type === 'checkout');
  assert.equal(ev.data.roomNumber, '204');
  await staffStream.waitFor((e) => e.type === 'stay' && e.data.type === 'checked_out');

  // Phiên khách và mã cửa hết hiệu lực
  assert.equal((await api.get('/me', guest)).status, 401);
  assert.equal((await api.post('/auth/guest', { code: 'X7M41Q' })).status, 401);

  // Yêu cầu còn mở bị huỷ, phòng chuyển sang cần dọn, có việc dọn phòng mới
  const requests = await (await api.get('/requests?room=204', reception)).json();
  assert.equal(requests.find((r) => r.id === 'REQ-412').status, 'cancelled');
  const turnover = requests.find((r) => r.id === done.turnoverRequestId);
  assert.equal(turnover.title, 'Turnover Cleaning');
  assert.equal(turnover.department, 'housekeeping');
  const room = await (await api.get('/rooms/204', reception)).json();
  assert.equal(room.status, 'cleaning');
  assert.equal(room.stay, null);

  // Không trả phòng 2 lần
  assert.equal((await api.post('/checkout/204/approve', {}, reception)).status, 404);
  guestStream.stop();
  staffStream.stop();
});

test('only reception and managers handle checkout', async () => {
  const kitchen = await api.staffToken('KT-02');
  assert.equal((await api.get('/checkout', kitchen)).status, 403);
  assert.equal((await api.post('/checkout/305/approve', {}, kitchen)).status, 403);
  const guest = await api.guestToken('A8K92P');
  assert.equal((await api.get('/checkout', guest)).status, 401);
  assert.equal((await api.post('/me/checkout')).status, 401);
});

test('front desk can check out a guest who did not request it', async () => {
  const manager = await api.staffToken('MG-01');
  const res = await api.post('/checkout/308/approve', {}, manager);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).guestName, 'Daniel Brooks');
});
