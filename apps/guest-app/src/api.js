// Trên web: gọi /api (Vite proxy chuyển sang http://localhost:4000).
// Trong app Android (Capacitor): không có proxy -> gọi thẳng VITE_API_URL (xem .env.android).
export const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
// App này có 2 loại phiên độc lập: khách ('guest') và nhân viên ('staff').

const STORAGE_KEYS = { guest: 'apphotel.guest', staff: 'apphotel.staff.mobile' };

export function loadSession(kind = 'guest') {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS[kind])) ?? null;
  } catch {
    return null;
  }
}

export function saveSession(session, kind = 'guest') {
  try {
    if (session) localStorage.setItem(STORAGE_KEYS[kind], JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEYS[kind]);
  } catch {
    /* private mode / storage bị chặn: phiên chỉ sống trong bộ nhớ */
  }
}

const unauthorizedHandlers = { guest: () => {}, staff: () => {} };
/** Provider đăng ký hàm xử lý khi phiên hết hạn (401). */
export function setUnauthorizedHandler(fn, kind = 'guest') {
  unauthorizedHandlers[kind] = fn;
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * Gọi API. options.auth = 'guest' (mặc định) | 'staff' chọn token gửi kèm.
 */
export async function api(path, { auth = 'guest', ...options } = {}) {
  const token = loadSession(auth)?.token;
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const isLogin = path === '/auth/guest' || path === '/auth/staff';
    if (res.status === 401 && token && !isLogin) unauthorizedHandlers[auth]();
    throw new ApiError(res.status, data.error ?? `HTTP ${res.status}`);
  }
  return data;
}

/** Gọi API bằng phiên nhân viên. */
export const staffApi = (path, options = {}) => api(path, { ...options, auth: 'staff' });
