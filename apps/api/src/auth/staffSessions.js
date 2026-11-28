import { randomBytes } from 'node:crypto';
import { db } from '../data/store.js';
import { verifyPassword } from './passwords.js';

// Phiên đăng nhập nhân viên, in-memory: token -> { staffId, createdAt }
const sessions = new Map();
const SESSION_TTL_MS = 12 * 60 * 60_000; // một ca làm việc

/** Tìm nhân viên theo mã (HK-04) hoặc email, không phân biệt hoa thường. */
export function findStaffByLogin(login) {
  const key = String(login ?? '').trim().toLowerCase();
  if (!key) return null;
  return db.staff.find((s) => s.id.toLowerCase() === key || s.email?.toLowerCase() === key) ?? null;
}

/** Trả về nhân viên nếu đúng mật khẩu, ngược lại null. */
export function authenticateStaff(login, password) {
  const staff = findStaffByLogin(login);
  // Vẫn chạy verify khi không có tài khoản để thời gian phản hồi tương đương
  const ok = verifyPassword(password, staff?.passwordHash ?? DUMMY_HASH);
  // Tài khoản bị khoá trả lỗi giống sai mật khẩu (không lộ tài khoản nào tồn tại)
  return staff && ok && staff.active !== false ? staff : null;
}

export function createStaffSession(staff) {
  const token = randomBytes(32).toString('hex');
  sessions.set(token, { staffId: staff.id, createdAt: Date.now() });
  return token;
}

export function resolveStaffSession(token) {
  const session = token && sessions.get(token);
  if (!session) return null;
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    sessions.delete(token);
    return null;
  }
  const staff = db.staff.find((s) => s.id === session.staffId);
  if (!staff || staff.active === false) {
    sessions.delete(token);
    return null;
  }
  return staff;
}

/** Đăng xuất mọi thiết bị của một nhân viên (đổi mật khẩu, khoá tài khoản). */
export function destroySessionsOf(staffId) {
  for (const [token, s] of sessions) if (s.staffId === staffId) sessions.delete(token);
}

export function destroyStaffSession(token) {
  sessions.delete(token);
}

/** Thông tin nhân viên trả cho client — không kèm hash mật khẩu. */
export function presentStaff(staff) {
  const { passwordHash, ...rest } = staff; // eslint-disable-line no-unused-vars
  return rest;
}

export function _resetStaffSessions() {
  sessions.clear();
}

// Hash giả (mật khẩu ngẫu nhiên) để so sánh khi không tìm thấy tài khoản
const DUMMY_HASH = 'scrypt$00000000000000000000000000000000$' + '0'.repeat(64);
