import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApi } from './helpers.js';

let api;
before(async () => (api = await startApi()));
after(() => api.close());

test('staff signs in with ID or email; password hash never leaves the server', async () => {
  const res = await api.post('/auth/staff', { login: 'hk-04', password: 'shift2026', department: 'housekeeping' });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.match(body.token, /^[0-9a-f]{64}$/);
  assert.equal(body.staff.name, 'Minh Anh');
  assert.equal(body.staff.passwordHash, undefined);

  const byEmail = await api.post('/auth/staff', { login: 'Marco@AppHotel.vn', password: 'shift2026' });
  assert.equal(byEmail.status, 201);

  const me = await (await api.get('/auth/staff/me', body.token)).json();
  assert.equal(me.staff.id, 'HK-04');
});

test('wrong password, unknown user and wrong department are rejected', async () => {
  assert.equal((await api.post('/auth/staff', { login: 'HK-04', password: 'nope' })).status, 401);
  assert.equal((await api.post('/auth/staff', { login: 'XX-99', password: 'shift2026' })).status, 401);
  assert.equal((await api.post('/auth/staff', { login: 'HK-04' })).status, 400);
  assert.equal((await api.post('/auth/staff', { login: 'HK-04', password: 'shift2026', department: 'kitchen' })).status, 403);
  // Quản lý đăng nhập được mọi bộ phận
  assert.equal((await api.post('/auth/staff', { login: 'MG-01', password: 'shift2026', department: 'kitchen' })).status, 201);
});

test('rooms and request queue need a staff session; guests are refused', async () => {
  const guest = await api.guestToken('A8K92P');
  for (const path of ['/rooms', '/rooms/204', '/requests', '/requests/REQ-412']) {
    assert.equal((await api.get(path)).status, 401, path);
    assert.equal((await api.get(path, guest)).status, 401, `${path} with guest token`);
  }
  const staff = await api.staffToken('KT-02');
  assert.equal((await api.get('/rooms', staff)).status, 200);
  assert.equal((await api.get('/requests', staff)).status, 200);
});

test('only reception/manager see and rotate door codes', async () => {
  const kitchen = await api.staffToken('KT-02');
  const reception = await api.staffToken('RC-01');

  const asKitchen = await (await api.get('/rooms/204', kitchen)).json();
  assert.equal(asKitchen.stay.accessCode, undefined);
  assert.equal(asKitchen.stay.guestName, 'Elena Vance');
  assert.equal((await api.post('/rooms/204/code', {}, kitchen)).status, 403);

  const asReception = await (await api.get('/rooms/204', reception)).json();
  assert.match(asReception.stay.accessCode, /^[A-Z0-9]{6}$/);
});

test('assignee in the queue exposes only public staff fields', async () => {
  const list = await (await api.get('/requests', await api.staffToken())).json();
  const assigned = list.find((r) => r.assignee);
  assert.deepEqual(Object.keys(assigned.assignee).sort(), ['department', 'id', 'name']);
});

test('claiming locks a task: the second claimer gets 409', async () => {
  const marco = await api.staffToken('KT-02');
  const david = await api.staffToken('MG-01');

  // Bấm cùng lúc
  const [a, b] = await Promise.all([api.post('/requests/REQ-412/claim', {}, marco), api.post('/requests/REQ-412/claim', {}, david)]);
  const statuses = [a.status, b.status].sort();
  assert.deepEqual(statuses, [200, 409]);

  const winner = a.status === 200 ? await a.json() : await b.json();
  assert.equal(winner.status, 'in_progress');
  assert.ok(['KT-02', 'MG-01'].includes(winner.assignedTo));
  assert.ok(winner.claimedAt);

  const loser = a.status === 409 ? await a.json() : await b.json();
  assert.match(loser.error, /Already claimed by/);
});

test('kitchen cannot claim housekeeping tasks; unknown task is 404', async () => {
  const marco = await api.staffToken('KT-02');
  assert.equal((await api.post('/requests/REQ-411/claim', {}, marco)).status, 403);
  assert.equal((await api.post('/requests/REQ-999/claim', {}, marco)).status, 404);

  const minh = await api.staffToken('HK-04');
  const claimed = await (await api.post('/requests/REQ-411/claim', {}, minh)).json();
  assert.equal(claimed.assignee.name, 'Minh Anh');
});

test('staff logout ends the session', async () => {
  const token = await api.staffToken('HK-05');
  assert.equal((await api.post('/auth/staff/logout', {}, token)).status, 204);
  assert.equal((await api.get('/requests', token)).status, 401);
});

test('reception does not claim tasks; managers can step in', async () => {
  const maya = await api.staffToken('RC-01');
  const david = await api.staffToken('MG-01');
  // REQ-409: yêu cầu đồ dùng (buồng phòng) đang chờ
  assert.equal((await api.post('/requests/REQ-409/claim', {}, maya)).status, 403);
  const queue = await (await api.get('/requests?room=202', maya)).json();
  assert.equal(queue.find((r) => r.id === 'REQ-409').status, 'pending');
  assert.equal((await api.post('/requests/REQ-409/claim', {}, david)).status, 200);
});
