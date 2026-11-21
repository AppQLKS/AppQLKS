import { db, folioForRoom, presentRequest } from '../data/store.js';
import { HOTEL_INFO_TOPICS, hotelInfo } from '../data/hotelInfo.js';
import { AMENITIES, SLOTS } from '../services/housekeeping.js';
import { checkoutStatus } from '../services/checkout.js';
import { MAX_NOTE, MAX_QTY } from '../services/foodOrders.js';

/**
 * Định nghĩa tool cho Claude (strict: true -> input luôn đúng schema).
 * Tool đọc dữ liệu chạy ngay; tool thay đổi dữ liệu chỉ "chuẩn bị" (stage) thao tác,
 * khách bấm Confirm trên app thì server mới thực hiện (xem concierge.js).
 * Thứ tự cố định để không làm hỏng prompt cache.
 */
export const TOOL_DEFINITIONS = [
  {
    name: 'get_hotel_info',
    description:
      'Look up official hotel information: breakfast times, restaurant/bar hours, amenities (spa, gym, pool, laundry, transfers), policies, Wi-Fi, nearby attractions and transport. Use this for any factual question about the hotel or the area instead of answering from memory.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: { topic: { type: 'string', enum: HOTEL_INFO_TOPICS, description: 'Which section to read' } },
      required: ['topic'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_menu',
    description: 'List room service dishes with menu_id, price (USD) and preparation time. Call before staging a food order so you use real menu_ids and prices.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: { category: { type: 'string', enum: ['all', 'breakfast', 'local', 'drinks'] } },
      required: ['category'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_my_requests',
    description: "List this room's recent room service and housekeeping requests with their live status (pending, in_progress, completed, cancelled) and assigned staff.",
    strict: true,
    input_schema: { type: 'object', properties: {}, required: [], additionalProperties: false },
  },
  {
    name: 'get_folio',
    description: "Get this room's itemized room service bill: lines, 10% service charge and total (USD).",
    strict: true,
    input_schema: { type: 'object', properties: {}, required: [], additionalProperties: false },
  },
  {
    name: 'place_food_order',
    description:
      'Stage a room service order for the guest to confirm. The order is NOT sent until the guest taps Confirm in the app, so tell them to confirm. Only use menu_ids returned by get_menu.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        // strict mode không hỗ trợ minimum/maximum/minItems -> kiểm tra trong stageAction
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              menu_id: { type: 'string' },
              qty: { type: 'integer', description: `1 to ${MAX_QTY}` },
            },
            required: ['menu_id', 'qty'],
            additionalProperties: false,
          },
        },
        note: { type: 'string', description: 'Kitchen note, e.g. "less spicy". Empty string if none.' },
      },
      required: ['items', 'note'],
      additionalProperties: false,
    },
  },
  {
    name: 'request_housekeeping',
    description:
      'Stage a housekeeping request for the guest to confirm: clean the room now, schedule a cleaning slot, and/or bring amenities. NOT sent until the guest taps Confirm.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        service: { type: 'string', enum: ['clean_now', 'scheduled', 'none'], description: '"none" = amenities only' },
        slot: { type: 'string', enum: [...SLOTS, 'none'], description: 'Cleaning time for "scheduled", otherwise "none"' },
        amenities: { type: 'array', items: { type: 'string', enum: Object.keys(AMENITIES) } },
        note: { type: 'string', description: 'Note for the attendant. Empty string if none.' },
      },
      required: ['service', 'slot', 'amenities', 'note'],
      additionalProperties: false,
    },
  },
  {
    name: 'request_checkout',
    description: 'Stage an express checkout request for the guest to confirm. Reception approves it and the door code is then deactivated. Show the folio total first.',
    strict: true,
    input_schema: { type: 'object', properties: {}, required: [], additionalProperties: false },
  },
];

/** Lỗi do model gửi dữ liệu sai -> trả về tool_result is_error để model tự sửa. */
export class ToolInputError extends Error {}

const money = (n) => `$${Number(n).toFixed(2)}`;

/** Tool chỉ đọc: chạy ngay, trả JSON cho model. */
const READERS = {
  get_hotel_info: (_stay, { topic }) => ({ topic, info: hotelInfo[topic] }),

  get_menu: (_stay, { category }) =>
    db.menu
      .filter((m) => category === 'all' || m.category === category)
      .map(({ id, name, description, price, prepMinutes, category: c }) => ({ menu_id: id, name, description, price, prepMinutes, category: c })),

  get_my_requests: (stay) =>
    db.requests
      .filter((r) => r.roomNumber === stay.roomNumber)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 10)
      .map((r) => {
        const p = presentRequest(r);
        return { id: p.id, title: p.title, items: p.items.map((i) => `${i.qty}x ${i.name}`), status: p.status, assignedTo: p.assignee?.name ?? null, createdAt: p.createdAt };
      }),

  get_folio: (stay) => folioForRoom(stay.roomNumber),
};

/**
 * Tool thay đổi dữ liệu: kiểm tra input rồi trả về một "thao tác chờ xác nhận".
 * @returns {{ kind, summary, payload, total? }}
 */
const STAGERS = {
  place_food_order: (_stay, { items, note }) => {
    if (items.length === 0) throw new ToolInputError('The order has no items.');
    const lines = items.map(({ menu_id, qty }) => {
      if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) throw new ToolInputError(`qty must be 1 to ${MAX_QTY}.`);
      const dish = db.menu.find((m) => m.id === menu_id);
      if (!dish) throw new ToolInputError(`Unknown menu_id "${menu_id}". Call get_menu and use one of its menu_id values.`);
      return { menuId: dish.id, name: dish.name, qty, price: dish.price };
    });
    if (note.length > MAX_NOTE) throw new ToolInputError(`Note is longer than ${MAX_NOTE} characters.`);
    const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
    return {
      kind: 'food_order',
      summary: lines.map((l) => `${l.qty}× ${l.name}`).join(' & '),
      total,
      payload: { items: lines.map(({ menuId, qty }) => ({ menuId, qty })), note },
    };
  },

  request_housekeeping: (_stay, { service, slot, amenities, note }) => {
    if (service === 'scheduled' && slot === 'none') throw new ToolInputError(`Pick a slot: ${SLOTS.join(', ')}.`);
    if (service === 'none' && amenities.length === 0) throw new ToolInputError('Nothing to request: choose a cleaning option or at least one amenity.');
    if (note.length > MAX_NOTE) throw new ToolInputError(`Note is longer than ${MAX_NOTE} characters.`);
    const parts = [
      service === 'clean_now' && 'Clean room now',
      service === 'scheduled' && `Cleaning at ${slot}`,
      ...[...new Set(amenities)].map((a) => AMENITIES[a].name),
    ].filter(Boolean);
    return {
      kind: 'housekeeping',
      summary: parts.join(' + '),
      payload: { service: service === 'none' ? null : service, slot: service === 'scheduled' ? slot : undefined, amenities, note },
    };
  },

  request_checkout: (stay) => {
    const status = checkoutStatus(stay);
    if (status.requested) throw new ToolInputError('Express checkout was already requested and is waiting for reception.');
    return { kind: 'checkout', summary: `Express check-out for Room ${stay.roomNumber}`, total: status.folio.total, payload: {} };
  },
};

export const isStagingTool = (name) => name in STAGERS;

/** Chạy tool đọc dữ liệu. */
export function runReader(name, stay, input) {
  const fn = READERS[name];
  if (!fn) throw new ToolInputError(`Unknown tool: ${name}`);
  return fn(stay, input);
}

/** Kiểm tra + dựng thao tác chờ xác nhận. */
export function stageAction(name, stay, input) {
  return STAGERS[name](stay, input);
}

export const describeTotal = (total) => (total === undefined ? '' : ` (${money(total)})`);
