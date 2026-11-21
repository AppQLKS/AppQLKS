import { createApp } from '../src/app.js';

/** Khởi động API trên cổng ngẫu nhiên; trả về các hàm gọi tiện dụng. */
export async function startApi() {
  const server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  const base = `http://127.0.0.1:${server.address().port}/api`;

  const call = (method, path, body, token) =>
    fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  return {
    base,
    close: () => server.close(),
    get: (path, token) => call('GET', path, undefined, token),
    post: (path, body, token) => call('POST', path, body ?? {}, token),
    /** Đăng nhập nhân viên demo, trả về token. */
    staffToken: async (login = 'RC-01', password = 'shift2026') =>
      (await (await call('POST', '/auth/staff', { login, password })).json()).token,
    guestToken: async (code) => (await (await call('POST', '/auth/guest', { code })).json()).token,
  };
}
