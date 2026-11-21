// Vite proxy chuyển /api -> http://localhost:4000
export async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

// Phòng demo cho tới khi feature/guest-auth-room-code có phiên đăng nhập thật
export const DEMO_ROOM = '305';
