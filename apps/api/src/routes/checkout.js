import { Router } from 'express';
import { requireStaff } from '../middleware/requireStaff.js';
import { completeCheckout, pendingCheckouts } from '../services/checkout.js';

// Trả phòng phía lễ tân. Khách xin trả phòng qua /api/me/checkout.
const router = Router();
router.use(requireStaff('reception', 'manager'));

// GET /api/checkout -> các phòng đang chờ duyệt trả phòng nhanh (kèm hoá đơn)
router.get('/', (req, res) => res.json(pendingCheckouts()));

// POST /api/checkout/:roomNumber/approve -> hoàn tất trả phòng, thu hồi mã cửa
router.post('/:roomNumber/approve', (req, res) => res.json(completeCheckout(req.params.roomNumber, req.staff)));

export default router;
