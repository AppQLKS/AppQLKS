import { addRequest, db } from '../data/store.js';
import { HttpError } from '../middleware/errors.js';

export const SLOTS = ['10:00', '13:00', '16:00', '19:00'];
export const AMENITIES = {
  towels: { name: 'Fresh Bath Towels', qty: 2 },
  water: { name: 'Bottled Water', qty: 2 },
  toiletries: { name: 'Toiletries Kit', qty: 1 },
};
export const MAX_NOTE = 200;

const ACTIVE = ['pending', 'in_progress'];

/** Lần tới của khung giờ (hôm nay nếu chưa qua, ngược lại ngày mai). */
export function nextSlotTime(slot, now = new Date()) {
  const [h, m] = slot.split(':').map(Number);
  const at = new Date(now);
  at.setHours(h, m, 0, 0);
  if (at <= now) at.setDate(at.getDate() + 1);
  return at;
}

/**
 * Tạo yêu cầu buồng phòng cho một phòng.
 * Dùng chung cho app khách (POST /api/me/requests) và chatbot (tool calling).
 *
 * @param {string} roomNumber
 * @param {{ service?: 'clean_now'|'scheduled'|null, slot?: string, amenities?: string[], note?: string }} input
 *   service: dọn ngay / hẹn giờ / không dọn (chỉ xin tiện nghi)
 */
export function placeHousekeepingRequest(roomNumber, { service = null, slot, amenities = [], note } = {}) {
  if (service !== null && service !== 'clean_now' && service !== 'scheduled') {
    throw new HttpError(400, `Unknown housekeeping service: ${service}`);
  }
  if (service === 'scheduled' && !SLOTS.includes(slot)) {
    throw new HttpError(400, `Pick one of these times: ${SLOTS.join(', ')}.`);
  }
  if (!Array.isArray(amenities)) throw new HttpError(400, 'Amenities must be a list.');
  const extras = [...new Set(amenities)];
  const unknown = extras.find((a) => !AMENITIES[a]);
  if (unknown) throw new HttpError(400, `Unknown amenity: ${unknown}`);
  if (!service && extras.length === 0) throw new HttpError(400, 'Choose a cleaning option or at least one amenity.');

  const cleanNote = typeof note === 'string' ? note.trim() : '';
  if (cleanNote.length > MAX_NOTE) throw new HttpError(400, `Notes are limited to ${MAX_NOTE} characters.`);

  // Không cho đặt dọn phòng chồng lên một yêu cầu dọn còn đang mở
  if (service) {
    const open = db.requests.find((r) => r.roomNumber === roomNumber && r.type === 'housekeeping' && ACTIVE.includes(r.status));
    if (open) throw new HttpError(409, `Cleaning is already on its way (#${open.id}).`);
  }

  const scheduledFor = service === 'scheduled' ? nextSlotTime(slot).toISOString() : undefined;
  const items = [
    ...(service ? [{ name: 'Full room tidying & bed making', qty: 1 }] : []),
    ...extras.map((a) => ({ ...AMENITIES[a], amenity: a })),
  ];

  const request = addRequest({
    roomNumber,
    type: service ? 'housekeeping' : 'amenity',
    title: service === 'clean_now' ? 'Clean Room Now' : service === 'scheduled' ? `Scheduled Cleaning · ${slot}` : 'Amenity Request',
    items,
    note: cleanNote,
  });
  if (scheduledFor) request.scheduledFor = scheduledFor;
  return request;
}

/** Ước tính phút tới khi nhân viên tới; null nếu là lịch hẹn. */
export function estimateHousekeepingMinutes(request) {
  if (request.scheduledFor) return null;
  return request.type === 'housekeeping' ? 20 : 10;
}
