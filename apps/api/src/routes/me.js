import { Router } from 'express';
import { db, findRoom, folioForRoom, presentRequest } from '../data/store.js';
import { requireGuest } from '../middleware/requireGuest.js';
import { HttpError } from '../middleware/errors.js';
import { estimateMinutes, placeFoodOrder } from '../services/foodOrders.js';
import { estimateHousekeepingMinutes, placeHousekeepingRequest } from '../services/housekeeping.js';
import { resolveSession } from '../auth/guestSessions.js';
import { streamRequests } from '../sse.js';
import { cancelCheckoutRequest, checkoutStatus, requestCheckout } from '../services/checkout.js';

/** Thông tin phiên trả cho app khách — không bao giờ kèm mã cửa. */
export function presentSession(stay) {
  const room = findRoom(stay.roomNumber);
  return {
    guest: { name: stay.guestName, guests: stay.guests },
    room: { number: room.number, type: room.type, floor: room.floor },
    stay: { checkIn: stay.checkIn, checkOut: stay.checkOut, checkoutRequested: !!stay.checkoutRequested },
  };
}

const router = Router();
router.use(requireGuest);

// GET /api/me -> phiên hiện tại
router.get('/', (req, res) => res.json(presentSession(req.stay)));

// GET /api/me/events -> luồng realtime các thay đổi yêu cầu của phòng mình (Server-Sent Events).
// Đóng luồng ngay khi phiên bị thu hồi (lễ tân đổi mã cửa / khách đăng xuất).
router.get('/events', (req, res) => {
  const { token, stay } = req;
  const ownRoom = (e) => e.roomNumber === stay.roomNumber;
  streamRequests(req, res, ownRoom, () => resolveSession(token) === stay, {
    stayFilter: ownRoom,
    closeOnCheckout: (e) => e.type === 'checked_out' && ownRoom(e),
  });
});

// GET /api/me/requests -> yêu cầu của phòng mình
router.get('/requests', (req, res) => {
  const list = db.requests
    .filter((r) => r.roomNumber === req.stay.roomNumber)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(presentRequest);
  res.json(list);
});

// POST /api/me/requests { type: 'food', items: [{ menuId, qty }], note }
router.post('/requests', (req, res) => {
//                  { type: 'housekeeping', service: 'clean_now'|'scheduled'|null, slot, amenities: [...], note }
  const { type } = req.body ?? {};
  if (type === 'food') {
    const request = placeFoodOrder(req.stay.roomNumber, req.body);
    return res.status(201).json({ ...presentRequest(request), etaMinutes: estimateMinutes(request) });
  }
  if (type === 'housekeeping') {
    const request = placeHousekeepingRequest(req.stay.roomNumber, req.body);
    return res.status(201).json({ ...presentRequest(request), etaMinutes: estimateHousekeepingMinutes(request) });
  }
  throw new HttpError(400, `Unsupported request type: ${type}`);
});

// GET /api/me/folio -> hoá đơn dịch vụ phòng
router.get('/folio', (req, res) => res.json(folioForRoom(req.stay.roomNumber)));

// Trả phòng nhanh: xem tình trạng / xin trả phòng / huỷ yêu cầu
router.get('/checkout', (req, res) => res.json(checkoutStatus(req.stay)));
router.post('/checkout', (req, res) => res.json(requestCheckout(req.stay)));
router.delete('/checkout', (req, res) => res.json(cancelCheckoutRequest(req.stay)));

export default router;
