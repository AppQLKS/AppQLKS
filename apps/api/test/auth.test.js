import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { _resetAuthState } from '../src/auth/guestSessions.js';

let server;
let base;

before(async () => {
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(() => server.close());
beforeEach(() => _resetAuthState());

const post = (path, body, token) =>
  fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: JSON.stringify(body ?? {}),
  });
const get = (path, token) => fetch(base + path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

test('valid room code (with dash, lowercase) logs in without leaking the code', async () => {
  const res = await post('/auth/guest', { code: 'a8k-92p' });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.match(body.token, /^[0-9a-f]{64}$/);
  assert.equal(body.room.number, '305');
  assert.equal(body.guest.name, 'Elena Rostova');
  assert.ok(!JSON.stringify(body).includes('A8K92P'));
});

test('wrong code is rejected', async () => {
  const res = await post('/auth/guest', { code: 'ZZZ999' });
  assert.equal(res.status, 401);
});

test('malformed code is a 400', async () => {
  assert.equal((await post('/auth/guest', { code: 'AB' })).status, 400);
});

test('/me requires a valid token and returns only own room data', async () => {
  assert.equal((await get('/me')).status, 401);
  const { token } = await (await post('/auth/guest', { code: 'X7M41Q' })).json();

  const me = await (await get('/me', token)).json();
  assert.equal(me.room.number, '204');

  const requests = await (await get('/me/requests', token)).json();
  assert.ok(requests.length > 0);
  assert.ok(requests.every((r) => r.roomNumber === '204'));

  const folio = await (await get('/me/folio', token)).json();
  assert.equal(folio.total, 58.3);
});

test('rotating the door code signs out existing guest sessions', async () => {
  const { token } = await (await post('/auth/guest', { code: 'K4R92B' })).json();
  assert.equal((await get('/me', token)).status, 200);

  const { accessCode } = await (await post('/rooms/101/code')).json();
  assert.match(accessCode, /^[A-Z2-9]{6}$/);
  assert.notEqual(accessCode, 'K4R92B');

  assert.equal((await get('/me', token)).status, 401);
  assert.equal((await post('/auth/guest', { code: 'K4R92B' })).status, 401);
  assert.equal((await post('/auth/guest', { code: accessCode })).status, 201);
});

test('logout invalidates the token', async () => {
  const { token } = await (await post('/auth/guest', { code: 'P9T31W' })).json();
  assert.equal((await post('/auth/guest/logout', {}, token)).status, 204);
  assert.equal((await get('/me', token)).status, 401);
});

test('locks out after 5 wrong attempts, even for a correct code', async () => {
  for (let i = 0; i < 5; i++) assert.equal((await post('/auth/guest', { code: 'WRONG1' })).status, 401);
  assert.equal((await post('/auth/guest', { code: 'M2V84N' })).status, 429);
});
