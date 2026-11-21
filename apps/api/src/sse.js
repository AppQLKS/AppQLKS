import { bus } from './data/store.js';

const HEARTBEAT_MS = 25_000;

/**
 * Mở luồng Server-Sent Events.
 *  - event: request   -> một yêu cầu thay đổi (lọc bằng filter)
 *  - event: stay      -> sự kiện lưu trú: xin trả phòng / huỷ / đã trả phòng (lọc bằng stayFilter)
 *  - event: checkout  -> (khách) phòng mình vừa trả xong; luồng đóng ngay sau đó
 *  - event: unauthorized -> phiên không còn hợp lệ; luồng đóng
 *
 * @param {(request) => boolean} filter
 * @param {() => boolean} [stillAllowed] kiểm tra lại quyền trước mỗi lần gửi
 * @param {{ stayFilter?: (event) => boolean, closeOnCheckout?: (event) => boolean }} [options]
 */
export function streamRequests(req, res, filter, stillAllowed = () => true, options = {}) {
  const { stayFilter = () => false, closeOnCheckout = () => false } = options;
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(': connected\n\n');

  const send = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);

  const close = () => {
    clearInterval(heartbeat);
    bus.off('request', onRequest);
    bus.off('stay', onStay);
    res.end();
  };

  const onRequest = (request) => {
    if (!stillAllowed()) {
      send('unauthorized', {});
      return close();
    }
    if (filter(request)) send('request', request);
  };

  const onStay = (event) => {
    // Kiểm tra trả phòng trước: lúc này phiên khách đã hết hiệu lực nhưng vẫn cần báo cho khách
    if (closeOnCheckout(event)) {
      send('checkout', event);
      return close();
    }
    if (!stillAllowed()) {
      send('unauthorized', {});
      return close();
    }
    if (stayFilter(event)) send('stay', event);
  };

  const heartbeat = setInterval(() => res.write(': ping\n\n'), HEARTBEAT_MS);
  bus.on('request', onRequest);
  bus.on('stay', onStay);
  req.on('close', close);
}
