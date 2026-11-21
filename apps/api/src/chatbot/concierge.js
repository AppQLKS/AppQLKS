import Anthropic from '@anthropic-ai/sdk';
import { HOTEL_TIMEZONE, hotelInfo } from '../data/hotelInfo.js';
import { findRoom, presentRequest } from '../data/store.js';
import { HttpError } from '../middleware/errors.js';
import { estimateMinutes, placeFoodOrder } from '../services/foodOrders.js';
import { estimateHousekeepingMinutes, placeHousekeepingRequest } from '../services/housekeeping.js';
import { requestCheckout } from '../services/checkout.js';
import { TOOL_DEFINITIONS, ToolInputError, isStagingTool, runReader, stageAction } from './tools.js';

export const MODEL = process.env.CONCIERGE_MODEL || 'claude-opus-5-5';
const MAX_TOKENS = 16000;
const MAX_TOOL_ROUNDS = 6; // chặn vòng lặp tool vô hạn
const MAX_MESSAGES = 160; // giới hạn độ dài 1 cuộc trò chuyện (không cắt lịch sử -> giữ cache & thinking hợp lệ)
const MAX_INPUT = 1000;

// Prompt cố định: KHÔNG chèn giờ, tên khách hay dữ liệu thay đổi vào đây để prompt cache hoạt động.
const SYSTEM_PROMPT = `You are the AI concierge of ${hotelInfo.hotel.name}, a boutique hotel in Hanoi, chatting with an in-house guest inside the hotel app.

What you do:
- Answer questions about the hotel (breakfast, dining, amenities, policies, Wi-Fi) and the neighbourhood (sights, food, transport). Always look facts up with get_hotel_info; never invent hours, prices or places. If the information is not there, say so and suggest dialling 0 for reception.
- Take care of requests through your tools: room service orders (get_menu, then place_food_order), housekeeping and amenities (request_housekeeping), request status (get_my_requests), the bill (get_folio) and express check-out (request_checkout).

How actions work:
- place_food_order, request_housekeeping and request_checkout only prepare the action. The guest then sees a confirmation card with Confirm and Edit buttons. Nothing is sent until they tap Confirm, so never say an order is placed or a room will be cleaned before that; say it is ready for them to confirm.
- When the guest's request is clear, prepare the action straight away rather than asking for permission first. Ask a short question only when something essential is missing or ambiguous (which dish, which time slot).
- Before request_checkout, tell the guest their folio total.
- Messages starting with "Hotel system:" come from the app, not the guest: they report confirmations, cancellations or the current time.

Style:
- Reply in the guest's language (Vietnamese or English, matching their last message).
- Warm, concise, like a good front-desk concierge: usually 1-3 short sentences. Use **bold** for times and prices. No headings or long lists unless the guest asks for options.
- Prices are in USD.`;

/** Khung giờ địa phương của khách sạn, ví dụ "Saturday 21 November, 14:05". */
function hotelTime(now = new Date()) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: HOTEL_TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);
}

// ---- Cuộc trò chuyện in-memory theo lượt lưu trú ----
// messages: lịch sử gửi cho API (giữ nguyên content của model, kể cả thinking blocks)
// display:  lịch sử hiển thị cho app
// actions:  thao tác chờ khách xác nhận
// notes:    sự kiện hệ thống (khách xác nhận/bỏ) báo cho model ở lượt sau
const conversations = new Map();

function conversationOf(stay) {
  let c = conversations.get(stay.id);
  if (!c) {
    c = { messages: [], display: [], actions: new Map(), notes: [], nextAction: 1 };
    conversations.set(stay.id, c);
  }
  return c;
}

export function resetConversation(stay) {
  conversations.delete(stay.id);
}

export function presentAction(a) {
  return { id: a.id, kind: a.kind, summary: a.summary, total: a.total ?? null, status: a.status, result: a.result ?? null };
}

export function chatHistory(stay) {
  const c = conversationOf(stay);
  return c.display.map((m) => ({ ...m, actions: m.actionIds?.map((id) => presentAction(c.actions.get(id))) ?? [] }));
}

/** Khối system: phần cố định có cache_control; phần theo khách (ổn định suốt cuộc trò chuyện) cache riêng. */
function systemBlocks(stay) {
  const room = findRoom(stay.roomNumber);
  return [
    { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    {
      type: 'text',
      text: `Guest: ${stay.guestName} (${stay.guests} guest${stay.guests > 1 ? 's' : ''}), Room ${room.number} – ${room.type}, floor ${room.floor}. Stay ${stay.checkIn} to ${stay.checkOut}, check-out time ${hotelInfo.hotel.checkOut}.`,
      cache_control: { type: 'ephemeral' },
    },
  ];
}

/**
 * Tạo client Anthropic. Không có thông tin xác thực -> null (chat trả 503).
 * SDK tự đọc ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN.
 */
export function defaultClient() {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) return null;
  return new Anthropic();
}

/**
 * Một lượt hội thoại: gửi tin nhắn của khách, chạy tool cho tới khi model trả lời xong.
 * @param {Anthropic | {beta: {messages: {create: Function}}}} client
 */
export async function sendMessage(client, stay, text) {
  if (!client) throw new HttpError(503, 'The AI concierge is not configured yet. Please dial 0 for reception.');
  const message = String(text ?? '').trim();
  if (!message) throw new HttpError(400, 'Message is empty.');
  if (message.length > MAX_INPUT) throw new HttpError(400, `Messages are limited to ${MAX_INPUT} characters.`);

  const c = conversationOf(stay);
  if (c.busy) throw new HttpError(409, 'Still answering your previous message.');
  if (c.messages.length >= MAX_MESSAGES) throw new HttpError(409, 'This conversation is full. Start a new chat to continue.');

  // Chỉ nối thêm vào cuối (append-only) -> prefix ổn định cho cache và thinking
  const turn = [{ role: 'user', content: message }];
  const notes = [`Hotel system: current hotel time is ${hotelTime()}.`, ...c.notes];
  turn.push({ role: 'system', content: notes.join('\n') });

  const working = [...c.messages, ...turn];
  const staged = [];
  c.busy = true;
  try {
    for (let round = 0; ; round++) {
      const response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        // Opus 5.5: thinking luôn bật (adaptive); chat nên dùng effort thấp cho nhanh và rẻ
        output_config: { effort: 'low' },
        system: systemBlocks(stay),
        tools: TOOL_DEFINITIONS,
        messages: working,
        cache_control: { type: 'ephemeral' }, // cache thêm phần lịch sử hội thoại
        // Nếu bộ lọc an toàn từ chối nhầm, API tự chạy lại trên model dự phòng phù hợp
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      });

      working.push({ role: 'assistant', content: response.content });

      if (response.stop_reason === 'tool_use' && round < MAX_TOOL_ROUNDS) {
        const results = [];
        for (const block of response.content) {
          if (block.type !== 'tool_use') continue;
          results.push(runTool(c, stay, block, staged));
        }
        working.push({ role: 'user', content: results });
        continue;
      }

      let reply = response.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
      if (response.stop_reason === 'refusal') reply = "Sorry, I can't help with that. Please dial 0 and reception will be glad to assist.";
      else if (response.stop_reason === 'tool_use') reply ||= 'Sorry, that took too many steps. Could you rephrase your request?';
      else if (!reply) reply = 'Sorry, I did not catch that. Could you say it another way?';

      // Lượt thành công -> lưu vào lịch sử thật
      c.messages = working;
      c.notes = [];
      const now = new Date().toISOString();
      c.display.push({ role: 'guest', text: message, at: now });
      c.display.push({ role: 'assistant', text: reply, at: now, actionIds: staged.map((a) => a.id) });
      return { reply, actions: staged.map(presentAction), at: now };
    }
  } catch (err) {
    throw toHttpError(err);
  } finally {
    c.busy = false;
  }
}

/** Chạy một tool_use và trả về tool_result (không bao giờ ném lỗi ra ngoài vòng lặp). */
function runTool(c, stay, block, staged) {
  try {
    if (isStagingTool(block.name)) {
      const action = { id: `A${c.nextAction++}`, status: 'pending', ...stageAction(block.name, stay, block.input) };
      c.actions.set(action.id, action);
      staged.push(action);
      return {
        type: 'tool_result',
        tool_use_id: block.id,
        content: JSON.stringify({
          staged: true,
          action_id: action.id,
          summary: action.summary,
          total: action.total ?? null,
          note: 'A confirmation card is now shown to the guest. Nothing is sent until they tap Confirm.',
        }),
      };
    }
    return { type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(runReader(block.name, stay, block.input)) };
  } catch (err) {
    const message = err instanceof ToolInputError || err instanceof HttpError ? err.message : 'Tool failed unexpectedly.';
    if (!(err instanceof ToolInputError || err instanceof HttpError)) console.error(err);
    return { type: 'tool_result', tool_use_id: block.id, content: message, is_error: true };
  }
}

/** Khách bấm Confirm trên thẻ: lúc này mới thực hiện thao tác thật. */
export function confirmAction(stay, actionId) {
  const c = conversationOf(stay);
  const action = c.actions.get(actionId);
  if (!action) throw new HttpError(404, 'This action no longer exists.');
  if (action.status !== 'pending') throw new HttpError(409, `This action was already ${action.status}.`);

  try {
    if (action.kind === 'food_order') {
      const req = placeFoodOrder(stay.roomNumber, action.payload);
      action.result = { requestId: req.id, etaMinutes: estimateMinutes(req), request: presentRequest(req) };
    } else if (action.kind === 'housekeeping') {
      const req = placeHousekeepingRequest(stay.roomNumber, action.payload);
      action.result = { requestId: req.id, etaMinutes: estimateHousekeepingMinutes(req), request: presentRequest(req) };
    } else if (action.kind === 'checkout') {
      requestCheckout(stay);
      action.result = { checkoutRequested: true };
    }
    action.status = 'confirmed';
    c.notes.push(`Hotel system: the guest confirmed action ${action.id} (${action.summary})${action.result.requestId ? ` – created request ${action.result.requestId}` : ''}.`);
  } catch (err) {
    action.status = 'failed';
    action.result = { error: err.message };
    c.notes.push(`Hotel system: action ${action.id} (${action.summary}) failed: ${err.message}`);
    throw err instanceof HttpError ? err : new HttpError(500, 'Could not complete this action.');
  }
  return presentAction(action);
}

/** Khách bấm Edit/huỷ thẻ: bỏ thao tác, báo cho model ở lượt sau. */
export function dismissAction(stay, actionId) {
  const c = conversationOf(stay);
  const action = c.actions.get(actionId);
  if (!action) throw new HttpError(404, 'This action no longer exists.');
  if (action.status !== 'pending') throw new HttpError(409, `This action was already ${action.status}.`);
  action.status = 'dismissed';
  c.notes.push(`Hotel system: the guest dismissed action ${action.id} (${action.summary}) and may want to change it.`);
  return presentAction(action);
}

/** Đổi lỗi SDK thành lỗi HTTP dễ hiểu cho khách (không lộ chi tiết nội bộ). */
function toHttpError(err) {
  if (err instanceof HttpError) return err;
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    console.error('[concierge] credentials rejected:', err.message);
    return new HttpError(503, 'The AI concierge is not configured correctly. Please dial 0 for reception.');
  }
  if (err instanceof Anthropic.RateLimitError) return new HttpError(429, 'The concierge is very busy right now. Please try again in a moment.');
  if (err instanceof Anthropic.APIConnectionError) return new HttpError(503, 'Cannot reach the AI service. Please try again.');
  if (err instanceof Anthropic.APIError) {
    console.error('[concierge] API error', err.status, err.message);
    return new HttpError(502, 'The AI concierge had a problem answering. Please try again.');
  }
  console.error('[concierge]', err);
  return new HttpError(500, 'Something went wrong.');
}

/** Chỉ dùng trong test. */
export function _resetConversations() {
  conversations.clear();
}
