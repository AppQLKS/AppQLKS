import { Router } from 'express';
import { db, departmentOf, presentRequest } from '../data/store.js';
import { HttpError, notImplemented } from '../middleware/errors.js';

const router = Router();

// GET /api/requests?department=kitchen|housekeeping&room=305
router.get('/', (req, res) => {
  const { department, room } = req.query;
  const list = db.requests
    .filter((r) => !department || departmentOf(r.type) === department)
    .filter((r) => !room || r.roomNumber === String(room))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(presentRequest);
  res.json(list);
});

router.get('/:id', (req, res) => {
  const found = db.requests.find((r) => r.id === req.params.id);
  if (!found) throw new HttpError(404, 'Request not found');
  res.json(presentRequest(found));
});

// TODO(feature/room-service-dining, feature/housekeeping): tạo yêu cầu
router.post('/', notImplemented('feature/room-service-dining | feature/housekeeping'));
// TODO(feature/staff-web-portal): nhận (claim) task
router.post('/:id/claim', notImplemented('feature/staff-web-portal'));
// TODO(feature/request-tracking): cập nhật trạng thái
router.patch('/:id/status', notImplemented('feature/request-tracking'));
export default router;
