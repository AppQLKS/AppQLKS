import { Router } from 'express';
import { db, findRoom, folioForRoom, presentRequest } from '../data/store.js';
import { requireGuest } from '../middleware/requireGuest.js';

/** Thông tin phiên trả cho app khách — không bao giờ kèm mã cửa. */
export function presentSession(stay) {
  const room = findRoom(stay.roomNumber);
  return {
    guest: { name: stay.guestName, guests: stay.guests },
    room: { number: room.number, type: room.type, floor: room.floor },
    stay: { checkIn: stay.checkIn, checkOut: stay.checkOut },
  };
}

const router = Router();
router.use(requireGuest);

// GET /api/me -> phiên hiện tại
router.get('/', (req, res) => res.json(presentSession(req.stay)));

// GET /api/me/requests -> yêu cầu của phòng mình
router.get('/requests', (req, res) => {
  const list = db.requests
    .filter((r) => r.roomNumber === req.stay.roomNumber)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(presentRequest);
  res.json(list);
});

// GET /api/me/folio -> hoá đơn dịch vụ phòng
router.get('/folio', (req, res) => res.json(folioForRoom(req.stay.roomNumber)));

export default router;
