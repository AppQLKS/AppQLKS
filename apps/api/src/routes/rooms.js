import { Router } from 'express';
import { db, findRoom, findActiveStayByRoom } from '../data/store.js';
import { HttpError } from '../middleware/errors.js';

const router = Router();

// Lưới phòng cho lễ tân (không trả mã phòng ra danh sách)
router.get('/', (req, res) => {
  const rooms = db.rooms.map((room) => ({
    ...room,
    guestName: findActiveStayByRoom(room.number)?.guestName ?? null,
  }));
  res.json(rooms);
});

// TODO(feature/staff-web-portal): bảo vệ route này bằng xác thực nhân viên
router.get('/:number', (req, res) => {
  const room = findRoom(req.params.number);
  if (!room) throw new HttpError(404, 'Room not found');
  res.json({ ...room, stay: findActiveStayByRoom(room.number) ?? null });
});

export default router;
