import { seed } from './seed.js';

// Kho dữ liệu in-memory. Reset mỗi lần khởi động lại server.
export const db = seed();

export const SERVICE_RATE = 0.1;

export function findRoom(number) {
  return db.rooms.find((r) => r.number === String(number));
}

export function findActiveStayByRoom(number) {
  return db.stays.find((s) => s.roomNumber === String(number) && s.active);
}

export function findActiveStayByCode(code) {
  const normalized = String(code).replace(/[^a-z0-9]/gi, '').toUpperCase();
  return db.stays.find((s) => s.active && s.accessCode === normalized);
}

export const departmentOf = (type) => (type === 'food' ? 'kitchen' : 'housekeeping');

export function findStaff(id) {
  return db.staff.find((s) => s.id === id) ?? null;
}

/** Yêu cầu kèm department + thông tin nhân viên được giao. */
export function presentRequest(req) {
  return { ...req, department: departmentOf(req.type), assignee: req.assignedTo ? findStaff(req.assignedTo) : null };
}

/** Mã yêu cầu tiếp theo: REQ-<số lớn nhất + 1>. */
export function nextRequestId() {
  const max = db.requests.reduce((m, r) => Math.max(m, Number(r.id.replace(/\D/g, '')) || 0), 0);
  return `REQ-${max + 1}`;
}

/** Thêm yêu cầu mới (đã được kiểm tra hợp lệ) vào hàng đợi. */
export function addRequest({ roomNumber, type, title, items, note }) {
  const request = {
    id: nextRequestId(),
    roomNumber,
    type,
    title,
    items,
    note: note || undefined,
    status: 'pending',
    assignedTo: null,
    createdAt: new Date().toISOString(),
  };
  db.requests.push(request);
  return request;
}

/** Hoá đơn dịch vụ phòng: các đơn đồ ăn chưa huỷ của phòng + phí dịch vụ 10%. */
export function folioForRoom(number) {
  const lines = db.requests
    .filter((r) => r.roomNumber === String(number) && r.type === 'food' && r.status !== 'cancelled')
    .flatMap((r) => r.items.map((i) => ({ requestId: r.id, name: i.name, qty: i.qty, amount: (i.price ?? 0) * i.qty })));
  const subtotal = lines.reduce((sum, l) => sum + l.amount, 0);
  const service = Math.round(subtotal * SERVICE_RATE * 100) / 100;
  return { lines, subtotal, service, total: subtotal + service };
}
