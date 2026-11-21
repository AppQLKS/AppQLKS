import { randomBytes } from 'node:crypto';
import { db, findActiveStayByCode } from '../data/store.js';

// Phiên đăng nhập của khách, lưu in-memory: token -> { stayId, code, createdAt }.
// Phiên gắn với mã cửa tại thời điểm đăng nhập: khi lễ tân đổi/thu hồi mã,
// mọi phiên cũ của phòng đó tự hết hiệu lực.
const sessions = new Map();

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bỏ 0/O, 1/I dễ nhầm

export function generateAccessCode() {
  const bytes = randomBytes(6);
  return Array.from(bytes, (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
}

export function createSession(code) {
  const stay = findActiveStayByCode(code);
  if (!stay) return null;
  const token = randomBytes(32).toString('hex');
  sessions.set(token, { stayId: stay.id, code: stay.accessCode, createdAt: Date.now() });
  return { token, stay };
}

/** Trả về stay nếu token còn hợp lệ, ngược lại null (và xoá phiên hỏng). */
export function resolveSession(token) {
  const session = token && sessions.get(token);
  if (!session) return null;
  const stay = db.stays.find((s) => s.id === session.stayId);
  if (!stay || !stay.active || stay.accessCode !== session.code) {
    sessions.delete(token);
    return null;
  }
  return stay;
}

export function destroySession(token) {
  sessions.delete(token);
}

/** Đổi mã cửa của phòng -> các phiên cũ không còn hợp lệ. */
export function rotateAccessCode(stay) {
  let code;
  do code = generateAccessCode();
  while (db.stays.some((s) => s.active && s.accessCode === code));
  stay.accessCode = code;
  return code;
}

// Giới hạn đăng nhập sai để chống dò mã (6 ký tự ~ 1 tỷ tổ hợp, nhưng vẫn nên chặn).
const MAX_FAILS = 5;
const WINDOW_MS = 5 * 60_000;
const failures = new Map(); // key -> { count, resetAt }

export function isLockedOut(key) {
  const f = failures.get(key);
  if (!f) return false;
  if (Date.now() > f.resetAt) {
    failures.delete(key);
    return false;
  }
  return f.count >= MAX_FAILS;
}

export function recordFailure(key) {
  const now = Date.now();
  const f = failures.get(key);
  if (!f || now > f.resetAt) failures.set(key, { count: 1, resetAt: now + WINDOW_MS });
  else f.count += 1;
}

export function clearFailures(key) {
  failures.delete(key);
}

/** Chỉ dùng trong test. */
export function _resetAuthState() {
  sessions.clear();
  failures.clear();
}
