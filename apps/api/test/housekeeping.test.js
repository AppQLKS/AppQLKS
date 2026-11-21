import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { nextSlotTime } from '../src/services/housekeeping.js';

let server;
let base;

before(async () => {
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(() => server.close());

const post = (path, body, token) =>
  fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: JSON.stringify(body),
  });
const login = async (code) => (await (await post('/auth/guest', { code })).json()).token;
const request = (token, body) => post('/me/requests', { type: 'housekeeping', ...body }, token);

test('clean now + amenities creates one housekeeping request', async () => {
  const token = await login('K4R92B'); // phòng 101
  const res = await request(token, { service: 'clean_now', amenities: ['towels', 'water', 'towels'], note: 'Eco-friendly please' });
  assert.equal(res.status, 201);
  const req = await res.json();
  assert.equal(req.type, 'housekeeping');
  assert.equal(req.department, 'housekeeping');
  assert.equal(req.title, 'Clean Room Now');
  assert.equal(req.roomNumber, '101');
  assert.deepEqual(req.items.map((i) => i.name), ['Full room tidying & bed making', 'Fresh Bath Towels', 'Bottled Water']);
  assert.equal(req.etaMinutes, 20);

  const queue = await (await fetch(`${base}/requests?department=housekeeping`)).json();
  assert.equal(queue[0].id, req.id);
});

test('a second cleaning while one is open is refused, amenities alone still allowed', async () => {
  const token = await login('P9T31W'); // phòng 102
  assert.equal((await request(token, { service: 'clean_now' })).status, 201);
  const dup = await request(token, { service: 'scheduled', slot: '16:00' });
  assert.equal(dup.status, 409);

  const extra = await (await request(token, { amenities: ['toiletries'] })).json();
  assert.equal(extra.type, 'amenity');
  assert.equal(extra.title, 'Amenity Request');
  assert.equal(extra.etaMinutes, 10);
});

test('scheduled cleaning stores the next slot time', async () => {
  const token = await login('M2V84N'); // phòng 104
  const req = await (await request(token, { service: 'scheduled', slot: '19:00' })).json();
  assert.equal(req.title, 'Scheduled Cleaning · 19:00');
  assert.equal(req.etaMinutes, null);
  const at = new Date(req.scheduledFor);
  assert.equal(at.getHours(), 19);
  assert.ok(at > new Date());
});

test('nextSlotTime rolls over to tomorrow once the slot has passed', () => {
  const now = new Date(2026, 10, 21, 17, 30);
  assert.equal(nextSlotTime('19:00', now).getDate(), 21);
  assert.equal(nextSlotTime('10:00', now).getDate(), 22);
  assert.equal(nextSlotTime('17:30', now).getDate(), 22);
});

test('rejects invalid housekeeping requests', async () => {
  const token = await login('J6L15H'); // phòng 106
  for (const body of [
    {},
    { service: 'laundry' },
    { service: 'scheduled' },
    { service: 'scheduled', slot: '03:00' },
    { amenities: ['champagne'] },
    { amenities: 'towels' },
    { amenities: ['towels'], note: 'x'.repeat(201) },
  ]) {
    assert.equal((await request(token, body)).status, 400, JSON.stringify(body));
  }
  assert.equal((await request(null, { service: 'clean_now' })).status, 401);
});
