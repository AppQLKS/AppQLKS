import { rotateAccessCode } from '../auth/guestSessions.js';
import { db, findActiveStayByRoom, findRoom, publishStay, setRequestStatus } from '../data/store.js';
import { HttpError } from '../middleware/errors.js';

export const MAX_GUESTS = 6;
export const MAX_NIGHTS = 60;
const MAX_NAME = 80;

/** Ngày theo giờ máy chủ, dạng YYYY-MM-DD. */
const localDate = (d = new Date()) => d.toLocaleDateString('en-CA');
const addDays = (date, n) => {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + n);
  return localDate(d);
};

function requireRoom(number) {
  const room = findRoom(number);
  if (!room) throw new HttpError(404, 'Room not found');
  return room;
}

/**
 * Lễ tân nhận phòng cho khách mới (walk-in hoặc đặt trước):
 *  1. Kiểm tra phòng đang Trống
 *  2. Tạo lượt lưu trú mới, sinh mã cửa 6 ký tự
 *  3. Phòng chuyển sang "có khách"
 * Hoá đơn và danh sách yêu cầu của lượt mới chỉ tính từ lúc nhận phòng (startedAt).
 */
export function checkIn(roomNumber, body = {}, staff) {
  const room = requireRoom(roomNumber);
  if (room.status === 'occupied' || findActiveStayByRoom(room.number)) throw new HttpError(409, `Room ${room.number} is already occupied.`);
  if (room.status !== 'vacant') throw new HttpError(409, `Room ${room.number} still needs cleaning.`);

  const guestName = typeof body.guestName === 'string' ? body.guestName.trim().replace(/\s+/g, ' ') : '';
  if (!guestName) throw new HttpError(400, 'Enter the guest name.');
  if (guestName.length > MAX_NAME) throw new HttpError(400, `Guest name is limited to ${MAX_NAME} characters.`);

  const guests = Number(body.guests);
  if (!Number.isInteger(guests) || guests < 1 || guests > MAX_GUESTS) {
    throw new HttpError(400, `Number of guests must be from 1 to ${MAX_GUESTS}.`);
  }

  const today = localDate();
  const checkOut = String(body.checkOut ?? '');
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(checkOut) && localDate(new Date(`${checkOut}T00:00:00`)) === checkOut;
  if (!valid || checkOut <= today || checkOut > addDays(today, MAX_NIGHTS)) {
    throw new HttpError(400, `Choose a check-out date from tomorrow up to ${MAX_NIGHTS} nights.`);
  }

  const startedAt = new Date().toISOString();
  const stay = {
    id: `stay-${room.number}-${Date.now()}`,
    roomNumber: room.number,
    guestName,
    guests,
    checkIn: today,
    checkOut,
    accessCode: null,
    active: true,
    checkoutRequested: false,
    startedAt,
    checkedInBy: staff.id,
  };
  rotateAccessCode(stay); // mã không trùng với phòng nào đang có khách
  db.stays.push(stay);
  room.status = 'occupied';
  publishStay('checked_in', stay);
  return { roomNumber: room.number, stay };
}

/**
 * Phòng đã dọn xong -> Trống, sẵn sàng nhận khách.
 *  - Tự động: khi buồng phòng hoàn tất việc "dọn phòng sau trả phòng" (auto = true)
 *  - Thủ công: lễ tân / quản lý / buồng phòng bấm "Đã dọn xong"; việc dọn còn mở của phòng được đóng lại
 */
export function markRoomReady(roomNumber, staff, { auto = false } = {}) {
  const room = requireRoom(roomNumber);
  if (room.status !== 'cleaning') {
    if (auto) return room;
    throw new HttpError(409, `Room ${room.number} is not waiting for cleaning.`);
  }
  if (!auto) {
    const open = db.requests.filter(
      (r) => r.roomNumber === room.number && r.kind === 'turnover' && ['pending', 'in_progress'].includes(r.status),
    );
    for (const r of open) setRequestStatus(r, 'cancelled', { by: staff.id, reason: 'Room marked ready' });
  }
  room.status = 'vacant';
  publishStay('room_ready', { roomNumber: room.number }, { by: staff.id });
  return room;
}
