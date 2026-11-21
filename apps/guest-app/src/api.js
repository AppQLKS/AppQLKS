// Vite proxy chuyển /api -> http://localhost:4000

const STORAGE_KEY = 'apphotel.guest';

export function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? null;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* private mode / storage bị chặn: phiên chỉ sống trong bộ nhớ */
  }
}

let onUnauthorized = () => {};
/** AuthProvider đăng ký hàm xử lý khi phiên hết hạn (401). */
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export async function api(path, options = {}) {
  const token = loadSession()?.token;
  const res = await fetch(`/api${path}`, {
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
    if (res.status === 401 && token && path.startsWith('/me')) onUnauthorized();
    throw new ApiError(res.status, data.error ?? `HTTP ${res.status}`);
  }
  return data;
}
