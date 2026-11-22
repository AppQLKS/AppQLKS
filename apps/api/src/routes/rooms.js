import { Router } from 'express';
import { db, findRoom, findActiveStayByRoom, folioForStay } from '../data/store.js';
import { rotateAccessCode } from '../auth/guestSessions.js';
import { HttpError } from '../middleware/errors.js';
import { requireStaff } from '../middleware/requireStaff.js';
import { checkIn, markRoomReady } from '../services/rooms.js';

const router = Router();

// Mọi route phòng chỉ dành cho nhân viên (có tên khách, mã cửa, hoá đơn)
router.use(requireStaff());

// Lưới phòng (không trả mã cửa ra danh sách)
router.get('/', (req, res) => {
  const rooms = db.rooms.map((room) => {
    const stay = findActiveStayByRoom(room.number);
    return { ...room, guestName: stay?.guestName ?? null, checkoutRequested: stay?.checkoutRequested ?? false };
  });
  res.json(rooms);
});

// Chi tiết phòng; mã cửa chỉ trả cho lễ tân / quản lý
router.get('/:number', (req, res) => {
  const room = findRoom(req.params.number);
  if (!room) throw new HttpError(404, 'Room not found');
  const stay = findActiveStayByRoom(room.number) ?? null;
  const canSeeCode = ['reception', 'manager'].includes(req.staff.department);
  const safeStay = stay && !canSeeCode ? { ...stay, accessCode: undefined } : stay;
  res.json({ ...room, stay: safeStay, folio: stay ? folioForStay(stay) : null });
});

// POST /api/rooms/:number/code -> sinh mã cửa mới, đăng xuất mọi thiết bị khách của phòng
router.post('/:number/code', requireStaff('reception', 'manager'), (req, res) => {
  const stay = findActiveStayByRoom(req.params.number);
  if (!stay) throw new HttpError(404, 'No active stay in this room');
  res.json({ accessCode: rotateAccessCode(stay) });
});

// POST /api/rooms/:number/checkin { guestName, guests, checkOut } -> nhận phòng, trả lượt lưu trú kèm mã cửa
router.post('/:number/checkin', requireStaff('reception', 'manager'), (req, res) => {
  res.status(201).json(checkIn(req.params.number, req.body, req.staff));
});

// POST /api/rooms/:number/ready -> phòng đã dọn xong, chuyển về Trống
router.post('/:number/ready', requireStaff('reception', 'manager', 'housekeeping'), (req, res) => {
  res.json(markRoomReady(req.params.number, req.staff));
});

export default router;
