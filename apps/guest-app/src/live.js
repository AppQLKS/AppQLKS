/**
 * Nhận thay đổi yêu cầu realtime qua Server-Sent Events.
 * Dùng fetch thay vì EventSource để gửi token qua header Authorization
 * (không để token lộ trên URL / log). Tự kết nối lại khi rớt mạng.
 *
 * @returns {() => void} hàm huỷ đăng ký
 */
export function subscribeRequests(
  path,
  { token, onRequest, onStay = () => {}, onCheckout = () => {}, onStatus = () => {}, onUnauthorized = () => {} },
) {
  let stopped = false;
  let controller;
  let retry = 1000;

  const connect = async () => {
    controller = new AbortController();
    try {
      const res = await fetch(`/api${path}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
        signal: controller.signal,
      });
      if (res.status === 401) return onUnauthorized();
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      onStatus('live');
      retry = 1000;

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
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
          if (type === 'request' && data) onRequest(JSON.parse(data));
          if (type === 'stay' && data) onStay(JSON.parse(data));
          if (type === 'checkout') return onCheckout(JSON.parse(data));
          if (type === 'unauthorized') return onUnauthorized();
        }
      }
    } catch {
      /* rớt kết nối hoặc đã huỷ */
    }
    if (stopped) return;
    onStatus('reconnecting');
    setTimeout(() => !stopped && connect(), retry);
    retry = Math.min(retry * 2, 15_000);
  };

  connect();
  return () => {
    stopped = true;
    controller?.abort();
  };
}

/** Gộp một yêu cầu vừa cập nhật vào danh sách (mới nhất lên đầu). */
export function mergeRequest(list, updated) {
  const exists = list.some((r) => r.id === updated.id);
  const next = exists ? list.map((r) => (r.id === updated.id ? updated : r)) : [updated, ...list];
  return next.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
