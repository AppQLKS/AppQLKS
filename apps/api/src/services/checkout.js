import {
  addRequest,
  db,
  findActiveStayByRoom,
  findRoom,
  folioForStay,
  publishStay,
  setRequestStatus,
} from '../data/store.js';
import { HttpError } from '../middleware/errors.js';

const OPEN = ['pending', 'in_progress'];

const openRequestsOf = (roomNumber) => db.requests.filter((r) => r.roomNumber === roomNumber && OPEN.includes(r.status));

/** Tình trạng trả phòng của một lượt lưu trú (dùng cho khách và lễ tân). */
export function checkoutStatus(stay) {
  return {
    roomNumber: stay.roomNumber,
    guestName: stay.guestName,
    checkOut: stay.checkOut,
    requested: !!stay.checkoutRequested,
    requestedAt: stay.checkoutRequestedAt ?? null,
    folio: folioForStay(stay),
    openRequests: openRequestsOf(stay.roomNumber).length,
  };
}

/** Khách xin trả phòng nhanh. Gọi lại nhiều lần vẫn an toàn. */
export function requestCheckout(stay) {
  if (!stay.checkoutRequested) {
    stay.checkoutRequested = true;
    stay.checkoutRequestedAt = new Date().toISOString();
    publishStay('checkout_requested', stay, { folioTotal: folioForStay(stay).total });
  }
  return checkoutStatus(stay);
}

/** Khách đổi ý, huỷ yêu cầu trả phòng. */
export function cancelCheckoutRequest(stay) {
  if (stay.checkoutRequested) {
    stay.checkoutRequested = false;
    stay.checkoutRequestedAt = null;
    publishStay('checkout_cancelled', stay);
  }
  return checkoutStatus(stay);
}

/** Danh sách phòng đang chờ lễ tân duyệt trả phòng (cũ nhất trước). */
export function pendingCheckouts() {
  return db.stays
    .filter((s) => s.active && s.checkoutRequested)
    .sort((a, b) => a.checkoutRequestedAt.localeCompare(b.checkoutRequestedAt))
    .map(checkoutStatus);
}

/**
 * Lễ tân hoàn tất trả phòng (có hoặc không có yêu cầu từ khách):
 *  1. Chốt hoá đơn
 *  2. Huỷ các yêu cầu còn mở của phòng
 *  3. Kết thúc lượt lưu trú -> mã cửa và mọi phiên khách hết hiệu lực
 *  4. Phòng chuyển sang "cần dọn" và tạo việc dọn phòng cho buồng phòng
 */
export function completeCheckout(roomNumber, staff) {
  const stay = findActiveStayByRoom(roomNumber);
  if (!stay) throw new HttpError(404, 'No active stay in this room.');

  const folio = folioForStay(stay);
  for (const request of openRequestsOf(roomNumber)) {
    setRequestStatus(request, 'cancelled', { by: staff.id, reason: 'Guest checked out' });
  }

  const at = new Date().toISOString();
  Object.assign(stay, { active: false, checkoutRequested: false, checkedOutAt: at, checkedOutBy: staff.id, finalFolio: folio });
  const room = findRoom(roomNumber);
  room.status = 'cleaning';

  // Báo "đã trả phòng" trước khi phát thêm sự kiện nào khác, để luồng của khách
  // nhận được thông báo này thay vì bị đóng vì phiên đã hết hiệu lực
  publishStay('checked_out', stay, { folioTotal: folio.total });

  const turnover = addRequest({
    roomNumber,
    type: 'housekeeping',
    kind: 'turnover',
    title: 'Turnover Cleaning',
    items: [{ name: 'Full Linen & Bath Reset', qty: 1 }, { name: 'Minibar restock check', qty: 1 }],
    note: `Checked out by ${staff.name}`,
  });
  return { roomNumber, guestName: stay.guestName, checkedOutAt: at, folio, turnoverRequestId: turnover.id };
}
