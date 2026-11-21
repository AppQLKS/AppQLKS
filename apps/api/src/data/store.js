import { EventEmitter } from 'node:events';
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
  const staff = req.assignedTo ? findStaff(req.assignedTo) : null;
  // Chỉ lộ thông tin công khai của nhân viên (không bao giờ kèm passwordHash/email)
  const assignee = staff ? { id: staff.id, name: staff.name, department: staff.department } : null;
  const history = (req.history ?? []).map((h) => ({ ...h, byName: h.by ? findStaff(h.by)?.name ?? null : null }));
  return { ...req, history, department: departmentOf(req.type), assignee };
}

/** Mã yêu cầu tiếp theo: REQ-<số lớn nhất + 1>. */
export function nextRequestId() {
  const max = db.requests.reduce((m, r) => Math.max(m, Number(r.id.replace(/\D/g, '')) || 0), 0);
  return `REQ-${max + 1}`;
}

/** Thêm yêu cầu mới (đã được kiểm tra hợp lệ) vào hàng đợi. */
export function addRequest({ roomNumber, type, title, items, note }) {
  const createdAt = new Date().toISOString();
  const request = {
    id: nextRequestId(),
    roomNumber,
    type,
    title,
    items,
    note: note || undefined,
    status: 'pending',
    assignedTo: null,
    createdAt,
    history: [{ status: 'pending', at: createdAt, by: null }],
  };
  db.requests.push(request);
  publishRequest(request);
  return request;
}

/**
 * Đổi trạng thái yêu cầu, ghi lịch sử và phát sự kiện realtime.
 * Kiểm tra quyền/điều kiện nằm ở services/requestStatus.js.
 */
export function setRequestStatus(request, status, { by = null, assignedTo, reason } = {}) {
  const at = new Date().toISOString();
  request.status = status;
  if (assignedTo !== undefined) request.assignedTo = assignedTo;
  if (status === 'in_progress') request.claimedAt = at;
  if (status === 'completed') request.completedAt = at;
  request.history.push({ status, at, by, ...(reason && { reason }) });
  publishRequest(request);
  return request;
}

// ---- Sự kiện realtime: mọi thay đổi yêu cầu đi qua đây ----
export const bus = new EventEmitter();
bus.setMaxListeners(0);

export function publishRequest(request) {
  bus.emit('request', presentRequest(request));
}

// Dữ liệu mẫu chưa có lịch sử -> dựng lại từ trạng thái hiện tại
for (const r of db.requests) {
  if (r.history) continue;
  const t0 = new Date(r.createdAt).getTime();
  const at = (min) => new Date(t0 + min * 60_000).toISOString();
  r.history = [{ status: 'pending', at: r.createdAt, by: null }];
  if (r.assignedTo) {
    r.claimedAt = at(2);
    r.history.push({ status: 'in_progress', at: r.claimedAt, by: r.assignedTo });
  }
  if (r.status === 'completed') {
    r.completedAt = at(15);
    r.history.push({ status: 'completed', at: r.completedAt, by: r.assignedTo });
  }
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
