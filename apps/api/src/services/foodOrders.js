import { addRequest, db } from '../data/store.js';
import { HttpError } from '../middleware/errors.js';

export const MAX_LINES = 20;
export const MAX_QTY = 10;
export const MAX_NOTE = 200;

/**
 * Tạo đơn đồ ăn cho một phòng.
 * Giá luôn lấy từ thực đơn ở server — không tin giá do client gửi.
 * Dùng chung cho app khách (POST /api/me/requests) và chatbot (tool calling).
 *
 * @param {string} roomNumber
 * @param {{ items: Array<{ menuId: string, qty: number }>, note?: string }} input
 */
export function placeFoodOrder(roomNumber, { items, note } = {}) {
  if (!Array.isArray(items) || items.length === 0) throw new HttpError(400, 'Your order is empty.');
  if (items.length > MAX_LINES) throw new HttpError(400, `Orders are limited to ${MAX_LINES} different dishes.`);

  // Gộp các dòng trùng món
  const merged = new Map();
  for (const line of items) {
    const qty = Number(line?.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      throw new HttpError(400, `Quantity must be a whole number from 1 to ${MAX_QTY}.`);
    }
    const dish = db.menu.find((m) => m.id === line?.menuId);
    if (!dish) throw new HttpError(400, `Unknown menu item: ${line?.menuId}`);
    merged.set(dish.id, { dish, qty: (merged.get(dish.id)?.qty ?? 0) + qty });
  }
  for (const { qty } of merged.values()) {
    if (qty > MAX_QTY) throw new HttpError(400, `Quantity must be a whole number from 1 to ${MAX_QTY}.`);
  }

  const cleanNote = typeof note === 'string' ? note.trim() : '';
  if (cleanNote.length > MAX_NOTE) throw new HttpError(400, `Notes are limited to ${MAX_NOTE} characters.`);

  return addRequest({
    roomNumber,
    type: 'food',
    title: 'Room Service',
    items: [...merged.values()].map(({ dish, qty }) => ({ menuId: dish.id, name: dish.name, qty, price: dish.price })),
    note: cleanNote,
  });
}

/** Thời gian chờ ước tính: món lâu nhất + 10 phút giao. */
export function estimateMinutes(request) {
  const prep = Math.max(...request.items.map((i) => db.menu.find((m) => m.id === i.menuId)?.prepMinutes ?? 15));
  return prep + 10;
}
