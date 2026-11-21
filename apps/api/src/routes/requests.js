import { Router } from 'express';
import { db } from '../data/store.js';
import { notImplemented } from '../middleware/errors.js';

const router = Router();
router.get('/', (req, res) => res.json(db.requests));
// TODO(feature/room-service-dining, feature/housekeeping): tạo yêu cầu
router.post('/', notImplemented('feature/room-service-dining | feature/housekeeping'));
// TODO(feature/staff-web-portal): nhận (claim) task
router.post('/:id/claim', notImplemented('feature/staff-web-portal'));
// TODO(feature/request-tracking): cập nhật trạng thái
router.patch('/:id/status', notImplemented('feature/request-tracking'));
export default router;
