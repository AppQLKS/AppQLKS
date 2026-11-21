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

const openStream = (path, token) => openSse(api.base, path, token);

test('claim -> complete records history and is visible to the guest', async () => {
  const minh = await api.staffToken('HK-04');
  await api.post('/requests/REQ-411/claim', {}, minh);
  const res = await patch('/requests/REQ-411/status', { status: 'completed' }, minh);
  assert.equal(res.status, 200);
  const done = await res.json();
  assert.equal(done.status, 'completed');
  assert.ok(done.completedAt);
  assert.deepEqual(done.history.map((h) => h.status), ['pending', 'in_progress', 'completed']);
  assert.equal(done.history.at(-1).byName, 'Minh Anh');
});

test('only the assignee or a supervisor can complete; status rules enforced', async () => {
  const marco = await api.staffToken('KT-02');
  const david = await api.staffToken('MG-01');
  await api.post('/requests/REQ-412/claim', {}, marco);

  const soraia = await api.staffToken('HK-05');
  assert.equal((await patch('/requests/REQ-412/status', { status: 'completed' }, soraia)).status, 403);
  assert.equal((await patch('/requests/REQ-412/status', { status: 'shipped' }, marco)).status, 400);
  assert.equal((await patch('/requests/REQ-409/status', { status: 'completed' }, david)).status, 409); // vẫn đang chờ
  assert.equal((await patch('/requests/REQ-412/status', { status: 'completed' }, david)).status, 200); // quản lý làm thay
  assert.equal((await patch('/requests/REQ-412/status', { status: 'completed' }, marco)).status, 409); // đã xong
});

test('release puts a task back in the queue for someone else', async () => {
  const minh = await api.staffToken('HK-04');
  await api.post('/requests/REQ-409/claim', {}, minh);
  const released = await (await patch('/requests/REQ-409/status', { status: 'pending', reason: 'Out of pillows' }, minh)).json();
  assert.equal(released.status, 'pending');
  assert.equal(released.assignedTo, null);
  assert.equal(released.history.at(-1).reason, 'Out of pillows');

  const soraia = await api.staffToken('HK-05');
  assert.equal((await api.post('/requests/REQ-409/claim', {}, soraia)).status, 200);
});

test('cancel needs a supervisor and a reason', async () => {
  const guest = await api.guestToken('Q8C50Z'); // phòng 107
  const order = await (await api.post('/me/requests', { type: 'food', items: [{ menuId: 'm2', qty: 1 }] }, guest)).json();

  const marco = await api.staffToken('KT-02');
  const maya = await api.staffToken('RC-01');
  assert.equal((await patch(`/requests/${order.id}/status`, { status: 'cancelled', reason: 'x' }, marco)).status, 403);
  assert.equal((await patch(`/requests/${order.id}/status`, { status: 'cancelled' }, maya)).status, 400);
  const cancelled = await (await patch(`/requests/${order.id}/status`, { status: 'cancelled', reason: 'Guest changed mind' }, maya)).json();
  assert.equal(cancelled.status, 'cancelled');

  // Đơn huỷ không còn tính vào hoá đơn
  const folio = await (await api.get('/me/folio', guest)).json();
  assert.ok(!folio.lines.some((l) => l.requestId === order.id));
});

test('staff stream sees new orders; guest stream only sees own room', async () => {
  const staff = await api.staffToken('RC-01');
  const guest305 = await api.guestToken('A8K92P');
  const guest204 = await api.guestToken('X7M41Q');

  const staffStream = await openStream('/requests/events', staff);
  const stream305 = await openStream('/me/events', guest305);

  const order = await (await api.post('/me/requests', { type: 'food', items: [{ menuId: 'm1', qty: 1 }] }, guest204)).json();
  const seen = await staffStream.waitFor((e) => e.data.id === order.id);
  assert.equal(seen.data.status, 'pending');

  await new Promise((r) => setTimeout(r, 100));
  assert.ok(!stream305.events.some((e) => e.data.id === order.id), 'room 305 must not see room 204 orders');

  const own = await (await api.post('/me/requests', { type: 'food', items: [{ menuId: 'm2', qty: 1 }] }, guest305)).json();
  const kitchen = await api.staffToken('KT-02');
  await api.post(`/requests/${own.id}/claim`, {}, kitchen);
  const claimed = await stream305.waitFor((e) => e.data.id === own.id && e.data.status === 'in_progress');
  assert.equal(claimed.data.assignee.name, 'Marco Rossi');

  staffStream.stop();
  stream305.stop();
});

test('streams require a session', async () => {
  assert.equal((await api.get('/requests/events')).status, 401);
  assert.equal((await api.get('/me/events')).status, 401);
});

test('guest stream closes once the door code is rotated', async () => {
  const guest = await api.guestToken('B3F77D'); // phòng 201
  const stream = await openStream('/me/events', guest);
  const maya = await api.staffToken('RC-01');
  await api.post('/rooms/201/code', {}, maya);
  // sự kiện bất kỳ kích hoạt kiểm tra lại phiên
  const other = await api.guestToken('W5Y28K');
  await api.post('/me/requests', { type: 'food', items: [{ menuId: 'm2', qty: 1 }] }, other);
  await stream.waitFor((e) => e.type === 'unauthorized');
  stream.stop();
});
