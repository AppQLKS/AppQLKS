import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

/** Khởi động API trên cổng ngẫu nhiên; trả về các hàm gọi tiện dụng. */
export async function startApi(options) {
  const server = createApp(options).listen(0);
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

/** Mở luồng SSE, gom các sự kiện 'request' cho tới khi gọi stop(). */
export async function openSse(base, path, token) {
  const controller = new AbortController();
  const res = await fetch(base + path, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
  assert.equal(res.headers.get('content-type'), 'text/event-stream');
  const events = [];
  const waiters = [];
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf('\n\n')) >= 0) {
          const chunk = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const type = /^event: (.+)$/m.exec(chunk)?.[1];
          const data = /^data: (.+)$/m.exec(chunk)?.[1];
          if (type) events.push({ type, data: JSON.parse(data) });
          waiters.splice(0).forEach((w) => w());
        }
      }
    } catch {
      /* aborted */
    }
  })();
  const waitFor = async (pred, ms = 1000) => {
    const end = Date.now() + ms;
    while (!events.some(pred)) {
      if (Date.now() > end) throw new Error('timed out waiting for event');
      await new Promise((r) => {
        waiters.push(r);
        setTimeout(r, 50);
      });
    }
    return events.find(pred);
  };
  return { events, waitFor, stop: () => controller.abort() };
}

