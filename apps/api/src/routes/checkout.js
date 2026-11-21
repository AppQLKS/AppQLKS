import { Router } from 'express';
import { notImplemented } from '../middleware/errors.js';

const router = Router();
// TODO(feature/express-checkout): xem hoá đơn, yêu cầu & duyệt trả phòng nhanh, thu hồi mã phòng
router.get('/:roomNumber/folio', notImplemented('feature/express-checkout'));
router.post('/:roomNumber/request', notImplemented('feature/express-checkout'));
router.post('/:roomNumber/approve', notImplemented('feature/express-checkout'));
export default router;
