import { Router } from 'express';
import { db, findRoom, findActiveStayByRoom, folioForRoom } from '../data/store.js';
import { rotateAccessCode } from '../auth/guestSessions.js';
import { HttpError } from '../middleware/errors.js';

const router = Router();

// Lưới phòng cho lễ tân (không trả mã phòng ra danh sách)
router.get('/', (req, res) => {
  const rooms = db.rooms.map((room) => {
    const stay = findActiveStayByRoom(room.number);
    return { ...room, guestName: stay?.guestName ?? null, checkoutRequested: stay?.checkoutRequested ?? false };
  });
  res.json(rooms);
});

// TODO(feature/staff-web-portal): bảo vệ 2 route dưới bằng xác thực nhân viên (có trả/đổi mã cửa)
router.get('/:number', (req, res) => {
  const room = findRoom(req.params.number);
  if (!room) throw new HttpError(404, 'Room not found');
  const stay = findActiveStayByRoom(room.number) ?? null;
  res.json({ ...room, stay, folio: stay ? folioForRoom(room.number) : null });
});

// POST /api/rooms/:number/code -> sinh mã cửa mới, đăng xuất mọi thiết bị khách của phòng
router.post('/:number/code', (req, res) => {
  const stay = findActiveStayByRoom(req.params.number);
  if (!stay) throw new HttpError(404, 'No active stay in this room');
  res.json({ accessCode: rotateAccessCode(stay) });
});

export default router;
