import { seed } from './seed.js';

// Kho dữ liệu in-memory. Reset mỗi lần khởi động lại server.
export const db = seed();

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
