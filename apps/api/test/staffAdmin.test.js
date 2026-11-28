import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startApi } from './helpers.js';

let api;
before(async () => (api = await startApi()));
after(() => api.close());

const send = (method, path, body, token) =>
  fetch(api.base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

test('only managers can manage staff accounts; hashes never leave the server', async () => {
  for (const id of ['RC-01', 'KT-02', 'HK-04']) {
    assert.equal((await api.get('/staff', await api.staffToken(id))).status, 403, id);
  }
  assert.equal((await api.get('/staff')).status, 401);

  const list = await (await api.get('/staff', await api.staffToken('MG-01'))).json();
  assert.equal(list.length, 5);
  assert.deepEqual(list.map((s) => s.department), ['reception', 'kitchen', 'housekeeping', 'housekeeping', 'manager']);
  for (const s of list) {
    assert.equal(s.passwordHash, undefined);
    assert.equal(s.active, true);
  }
});

test('a manager adds a staff member who can then sign in', async () => {
  const manager = await api.staffToken('MG-01');
  const bad = [
    { name: '', email: 'a@b.vn', department: 'kitchen', password: 'longenough' },
    { name: 'An', email: 'not-an-email', department: 'kitchen', password: 'longenough' },
    { name: 'An', email: 'an@apphotel.vn', department: 'spa', password: 'longenough' },
    { name: 'An', email: 'an@apphotel.vn', department: 'kitchen', password: 'short' },
  ];
  for (const body of bad) assert.equal((await api.post('/staff', body, manager)).status, 400, JSON.stringify(body));
  // Email trùng (không phân biệt hoa thường)
  assert.equal((await api.post('/staff', { name: 'X', email: 'MARCO@apphotel.vn', department: 'kitchen', password: 'longenough' }, manager)).status, 409);

  const res = await api.post('/staff', { name: '  Lê   Hoa ', email: 'Hoa@AppHotel.vn', department: 'housekeeping', password: 'hoa-secret-1' }, manager);
  assert.equal(res.status, 201);
  const hoa = await res.json();
  assert.equal(hoa.id, 'HK-06'); // sau HK-05
  assert.equal(hoa.name, 'Lê Hoa');
  assert.equal(hoa.email, 'hoa@apphotel.vn');
  assert.equal(hoa.passwordHash, undefined);

  const login = await api.post('/auth/staff', { login: 'hoa@apphotel.vn', password: 'hoa-secret-1' });
  assert.equal(login.status, 201);
  assert.equal((await login.json()).staff.id, 'HK-06');

  const kt = await (await api.post('/staff', { name: 'Bao', email: 'bao@apphotel.vn', department: 'kitchen', password: 'bao-secret-1' }, manager)).json();
  assert.equal(kt.id, 'KT-03');
});

test('reset password signs the staff member out everywhere', async () => {
  const manager = await api.staffToken('MG-01');
  const soraia = await api.staffToken('HK-05');
  assert.equal((await api.post('/staff/HK-05/password', { password: 'short' }, manager)).status, 400);
  assert.equal((await api.post('/staff/HK-05/password', { password: 'new-pass-2026' }, manager)).status, 200);

  assert.equal((await api.get('/auth/staff/me', soraia)).status, 401);
  assert.equal((await api.post('/auth/staff', { login: 'HK-05', password: 'shift2026' })).status, 401);
  assert.equal((await api.post('/auth/staff', { login: 'HK-05', password: 'new-pass-2026' })).status, 201);
});

test('deactivating an account signs it out and returns its tasks to the queue', async () => {
  const manager = await api.staffToken('MG-01');
  const marco = await api.staffToken('KT-02');
  // REQ-410 đang do Marco làm
  assert.equal((await (await api.get('/requests?room=302', manager)).json()).find((r) => r.id === 'REQ-410').assignedTo, 'KT-02');

  const off = await send('POST', '/staff/KT-02/active', { active: false }, manager);
  assert.equal(off.status, 200);
  assert.equal((await off.json()).active, false);
  assert.equal((await api.get('/auth/staff/me', marco)).status, 401);
  assert.equal((await api.post('/auth/staff', { login: 'KT-02', password: 'shift2026' })).status, 401);
  const req410 = (await (await api.get('/requests?room=302', manager)).json()).find((r) => r.id === 'REQ-410');
  assert.equal(req410.status, 'pending');
  assert.equal(req410.assignedTo, null);

  assert.equal((await send('POST', '/staff/KT-02/active', { active: true }, manager)).status, 200);
  assert.equal((await api.post('/auth/staff', { login: 'KT-02', password: 'shift2026' })).status, 201);
  assert.equal((await send('POST', '/staff/KT-02/active', { active: 'no' }, manager)).status, 400);
});

test('edits keep at least one active manager and nobody locks themselves out', async () => {
  const manager = await api.staffToken('MG-01');
  assert.equal((await send('POST', '/staff/MG-01/active', { active: false }, manager)).status, 409);
  assert.equal((await send('PATCH', '/staff/MG-01', { department: 'reception' }, manager)).status, 409);
  assert.equal((await send('PATCH', '/staff/ZZ-99', { name: 'X' }, manager)).status, 404);

  const edited = await (await send('PATCH', '/staff/RC-01', { name: 'Maya Lin-Tran', department: 'manager' }, manager)).json();
  assert.equal(edited.name, 'Maya Lin-Tran');
  assert.equal(edited.department, 'manager');
  // Có 2 quản lý: Maya được hạ về lễ tân, nhưng không được hạ quản lý cuối cùng
  const maya = await api.staffToken('RC-01');
  assert.equal((await send('PATCH', '/staff/RC-01', { department: 'reception' }, maya)).status, 409); // tự đổi chính mình
  assert.equal((await send('PATCH', '/staff/RC-01', { department: 'reception' }, manager)).status, 200);
  assert.equal((await send('PATCH', '/staff/RC-01', { email: 'david@apphotel.vn' }, manager)).status, 409);
});
