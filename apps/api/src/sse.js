import { bus } from './data/store.js';

const HEARTBEAT_MS = 25_000;

/**
 * Mở luồng Server-Sent Events gửi các thay đổi yêu cầu.
 * @param {(request) => boolean} filter  chỉ gửi yêu cầu thoả điều kiện
 * @param {() => boolean} [stillAllowed] kiểm tra lại quyền trước mỗi lần gửi (vd: phiên khách bị thu hồi)
 */
export function streamRequests(req, res, filter, stillAllowed = () => true) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(': connected\n\n');

  const close = () => {
    clearInterval(heartbeat);
    bus.off('request', onRequest);
    res.end();
  };

  const onRequest = (request) => {
    if (!stillAllowed()) {
      res.write('event: unauthorized\ndata: {}\n\n');
      return close();
    }
    if (filter(request)) res.write(`event: request\ndata: ${JSON.stringify(request)}\n\n`);
  };

  const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);
  bus.on('request', onRequest);
  req.on('close', close);
}
