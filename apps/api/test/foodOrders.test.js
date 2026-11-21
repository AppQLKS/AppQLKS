import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

let server;
let base;
let token;

before(async () => {
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
  token = (await (await post('/auth/guest', { code: 'A8K92P' })).json()).token; // phòng 305
});

after(() => server.close());

function post(path, body, auth) {
  return fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(auth && { Authorization: `Bearer ${auth}` }) },
    body: JSON.stringify(body),
  });
}
const order = (body) => post('/me/requests', { type: 'food', ...body }, token);

test('guest places an order priced by the server, merged per dish', async () => {
  const res = await order({
    items: [{ menuId: 'm1', qty: 1, price: 0.01 }, { menuId: 'm2', qty: 2 }, { menuId: 'm1', qty: 1 }],
    note: '  Less spicy, no onions  ',
  });
  assert.equal(res.status, 201);
  const req = await res.json();
  assert.match(req.id, /^REQ-\d+$/);
  assert.equal(req.roomNumber, '305');
  assert.equal(req.status, 'pending');
  assert.equal(req.department, 'kitchen');
  assert.equal(req.note, 'Less spicy, no onions');
  assert.deepEqual(
    req.items.map(({ menuId, qty, price }) => ({ menuId, qty, price })),
    [{ menuId: 'm1', qty: 2, price: 18 }, { menuId: 'm2', qty: 2, price: 6.5 }],
  );
  assert.equal(req.etaMinutes, 28);

  // Hiện trong hàng đợi bếp và hoá đơn phòng
  const kitchen = await (await fetch(`${base}/requests?department=kitchen`)).json();
  assert.equal(kitchen[0].id, req.id);
  const folio = await (await fetch(`${base}/me/folio`, { headers: { Authorization: `Bearer ${token}` } })).json();
  assert.ok(folio.lines.some((l) => l.requestId === req.id && l.amount === 36));
});

test('order ids keep increasing', async () => {
  const a = await (await order({ items: [{ menuId: 'm3', qty: 1 }] })).json();
  const b = await (await order({ items: [{ menuId: 'm4', qty: 1 }] })).json();
  assert.equal(Number(b.id.slice(4)), Number(a.id.slice(4)) + 1);
});

test('rejects invalid orders', async () => {
  for (const body of [
    { items: [] },
    { items: [{ menuId: 'nope', qty: 1 }] },
    { items: [{ menuId: 'm1', qty: 0 }] },
    { items: [{ menuId: 'm1', qty: 1.5 }] },
    { items: [{ menuId: 'm1', qty: 6 }, { menuId: 'm1', qty: 6 }] },
    { items: [{ menuId: 'm1', qty: 1 }], note: 'x'.repeat(201) },
  ]) {
    assert.equal((await order(body)).status, 400, JSON.stringify(body).slice(0, 60));
  }
  assert.equal((await post('/me/requests', { type: 'laundry', items: [] }, token)).status, 400);
});

test('requires a guest session', async () => {
  assert.equal((await post('/me/requests', { type: 'food', items: [{ menuId: 'm1', qty: 1 }] })).status, 401);
});
