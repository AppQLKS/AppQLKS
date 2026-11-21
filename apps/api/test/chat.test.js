import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startApi } from './helpers.js';
import { _resetConversations } from '../src/chatbot/concierge.js';

// ---- Client Anthropic giả: trả lời theo kịch bản, ghi lại mọi request ----
const calls = [];
let script = [];
const fakeAnthropic = {
  beta: {
    messages: {
      create: async (params) => {
        calls.push(structuredClone(params));
        const next = script.shift();
        if (!next) throw new Error('fake client: no scripted response left');
        return typeof next === 'function' ? next(params) : next;
      },
    },
  },
};

let toolSeq = 0;
const toolUse = (name, input) => ({
  stop_reason: 'tool_use',
  content: [{ type: 'thinking', thinking: '', signature: 'sig' }, { type: 'tool_use', id: `toolu_${++toolSeq}`, name, input }],
});
const say = (text) => ({ stop_reason: 'end_turn', content: [{ type: 'text', text }] });
const lastToolResults = (params) => params.messages.at(-1).content;

let api;
let offline;
before(async () => {
  api = await startApi({ anthropic: fakeAnthropic });
  offline = await startApi({ anthropic: null });
});
after(() => {
  api.close();
  offline.close();
});
beforeEach(() => {
  calls.length = 0;
  script = [];
  _resetConversations();
});

const chat = (token, message) => api.post('/chat', { message }, token);

test('answers hotel questions from the knowledge base tool, with caching and fallbacks configured', async () => {
  const guest = await api.guestToken('A8K92P');
  script = [toolUse('get_hotel_info', { topic: 'breakfast' }), say('Breakfast is **06:30 – 10:30** in the Garden Conservatory.')];

  const res = await chat(guest, 'Mấy giờ ăn sáng vậy?');
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.match(body.reply, /06:30/);
  assert.deepEqual(body.actions, []);

  const [first, second] = calls;
  assert.equal(first.model, 'claude-opus-5-5');
  assert.deepEqual(first.output_config, { effort: 'low' });
  assert.equal(first.thinking, undefined); // Opus 5.5: không gửi thinking (luôn adaptive)
  assert.equal(first.tool_choice, undefined); // không ép dùng tool (400 trên Opus 5.5)
  assert.deepEqual(first.betas, ['server-side-fallback-2026-07-01']);
  assert.equal(first.fallbacks, 'default');
  assert.ok(first.tools.every((t) => t.strict === true && t.input_schema.additionalProperties === false));
  // Prompt cố định được cache, không chứa giờ hay tên khách
  assert.deepEqual(first.system[0].cache_control, { type: 'ephemeral' });
  assert.ok(!first.system[0].text.includes('Elena'));
  assert.match(first.system[1].text, /Elena Rostova.*Room 305/);
  // Giờ hiện tại đi kèm tin nhắn dưới dạng system message (append-only, không phá cache)
  assert.deepEqual(first.messages.map((m) => m.role), ['user', 'system']);
  assert.match(first.messages[1].content, /current hotel time/);

  // Kết quả tool lấy từ dữ liệu khách sạn
  const [result] = lastToolResults(second);
  assert.equal(result.type, 'tool_result');
  assert.match(result.content, /06:30/);
  // Thinking block được gửi lại nguyên vẹn
  assert.equal(second.messages[2].content[0].type, 'thinking');
});

test('food order is only staged; it is created when the guest confirms', async () => {
  const guest = await api.guestToken('A8K92P');
  const before = (await (await api.get('/me/requests', guest)).json()).length;

  script = [
    toolUse('get_menu', { category: 'all' }),
    toolUse('place_food_order', { items: [{ menu_id: 'm1', qty: 1 }, { menu_id: 'm2', qty: 1 }], note: 'Less spicy' }),
    say('Your Beef Pho and Iced Coffee are ready — tap **Confirm** to send them to the kitchen.'),
  ];
  const body = await (await chat(guest, 'Order 1 beef pho and 1 iced coffee please')).json();

  assert.equal(body.actions.length, 1);
  const [action] = body.actions;
  assert.equal(action.kind, 'food_order');
  assert.equal(action.status, 'pending');
  assert.equal(action.total, 24.5);
  assert.equal(action.summary, '1× Tenderloin Beef Pho & 1× Artisan Iced Coffee');
  // get_menu trả menu thật cho model
  assert.match(lastToolResults(calls[1])[0].content, /"menu_id":"m1"/);
  // Chưa có đơn nào được tạo
  assert.equal((await (await api.get('/me/requests', guest)).json()).length, before);

  const confirmed = await (await api.post(`/chat/actions/${action.id}/confirm`, {}, guest)).json();
  assert.equal(confirmed.status, 'confirmed');
  assert.match(confirmed.result.requestId, /^REQ-\d+$/);
  const requests = await (await api.get('/me/requests', guest)).json();
  assert.equal(requests.length, before + 1);
  assert.equal(requests[0].note, 'Less spicy');

  assert.equal((await api.post(`/chat/actions/${action.id}/confirm`, {}, guest)).status, 409);

  // Lượt sau model được báo khách đã xác nhận
  script = [say('Enjoy your meal!')];
  await chat(guest, 'Thanks!');
  const note = calls.at(-1).messages.at(-1);
  assert.equal(note.role, 'system');
  assert.match(note.content, new RegExp(`confirmed action ${action.id}.*${confirmed.result.requestId}`));
});

test('bad tool input goes back to the model as an error so it can recover', async () => {
  const guest = await api.guestToken('X7M41Q');
  script = [toolUse('place_food_order', { items: [{ menu_id: 'm99', qty: 1 }], note: '' }), say('Sorry, that dish is not on our menu.')];
  const body = await (await chat(guest, 'One lobster please')).json();
  assert.deepEqual(body.actions, []);
  const [result] = lastToolResults(calls[1]);
  assert.equal(result.is_error, true);
  assert.match(result.content, /Unknown menu_id/);
});

test('housekeeping can be staged and dismissed; checkout staging shows the folio total', async () => {
  const guest = await api.guestToken('K4R92B'); // phòng 101
  script = [
    toolUse('request_housekeeping', { service: 'scheduled', slot: '16:00', amenities: ['towels'], note: '' }),
    toolUse('request_checkout', {}),
    say('Cleaning at 16:00 with towels, and your check-out request are ready to confirm.'),
  ];
  const body = await (await chat(guest, 'Clean at 4pm with extra towels, and I want to check out')).json();
  assert.deepEqual(body.actions.map((a) => a.kind), ['housekeeping', 'checkout']);
  assert.equal(body.actions[0].summary, 'Cleaning at 16:00 + Fresh Bath Towels');
  assert.equal(body.actions[1].total, 0); // phòng 101 chưa gọi món nào

  const dismissed = await (await api.post(`/chat/actions/${body.actions[0].id}/dismiss`, {}, guest)).json();
  assert.equal(dismissed.status, 'dismissed');
  assert.equal((await api.post(`/chat/actions/${body.actions[0].id}/confirm`, {}, guest)).status, 409);

  await api.post(`/chat/actions/${body.actions[1].id}/confirm`, {}, guest);
  assert.equal((await (await api.get('/me/checkout', guest)).json()).requested, true);
});

test('refusals and missing configuration get friendly replies; failed turns are not saved', async () => {
  const guest = await api.guestToken('J6L15H');
  script = [{ stop_reason: 'refusal', content: [] }];
  const refused = await (await chat(guest, '...')).json();
  assert.match(refused.reply, /dial 0/);

  script = [() => Promise.reject(new Error('boom'))];
  assert.equal((await chat(guest, 'Hello?')).status, 500);
  const history = await (await api.get('/chat', guest)).json();
  assert.equal(history.enabled, true);
  assert.equal(history.messages.length, 2); // chỉ lượt bị từ chối được lưu

  const offlineGuest = await offline.guestToken('J6L15H');
  const res = await offline.post('/chat', { message: 'hi' }, offlineGuest);
  assert.equal(res.status, 503);
  assert.equal((await (await offline.get('/chat', offlineGuest)).json()).enabled, false);
});

test('conversation is append-only across turns and private to each room', async () => {
  const a = await api.guestToken('C2H48X'); // 301
  const b = await api.guestToken('D7K39S'); // 302
  script = [say('Hi Julian!'), say('Sure.'), say('Hi Amara!')];
  await chat(a, 'Hi');
  await chat(a, 'Can you help?');
  await chat(b, 'Hi');

  const [t1, t2, t3] = calls;
  // Lượt 2 = toàn bộ lượt 1 + tin mới (prefix giữ nguyên)
  assert.deepEqual(t2.messages.slice(0, t1.messages.length + 1), [...t1.messages, { role: 'assistant', content: [{ type: 'text', text: 'Hi Julian!' }] }]);
  assert.equal(t3.messages.length, 2); // phòng 302 bắt đầu cuộc trò chuyện riêng

  const historyA = await (await api.get('/chat', a)).json();
  assert.deepEqual(historyA.messages.map((m) => m.role), ['guest', 'assistant', 'guest', 'assistant']);
  assert.equal((await (await api.get('/chat', b)).json()).messages.length, 2);

  assert.equal((await api.get('/chat')).status, 401);
  assert.equal((await chat(a, '')).status, 400);
  assert.equal((await chat(a, 'x'.repeat(1001))).status, 400);

  assert.equal((await fetch(`${api.base}/chat`, { method: 'DELETE', headers: { Authorization: `Bearer ${a}` } })).status, 204);
  assert.equal((await (await api.get('/chat', a)).json()).messages.length, 0);
});

test('hotel info is public for the knowledge base page', async () => {
  const info = await (await api.get('/hotel-info')).json();
  assert.equal(info.breakfast.hours, '06:30 – 10:30 daily');
  assert.ok(info.attractions.length >= 5);
});
