import { Router } from 'express';
import { db, departmentOf, presentRequest } from '../data/store.js';
import { HttpError } from '../middleware/errors.js';
import { requireStaff } from '../middleware/requireStaff.js';
import { claimRequest, updateRequestStatus } from '../services/requestStatus.js';
import { streamRequests } from '../sse.js';

const router = Router();

// Hàng đợi yêu cầu chỉ dành cho nhân viên.
// Khách tạo / xem yêu cầu của mình qua /api/me/requests.
router.use(requireStaff());

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

// GET /api/requests/events -> luồng realtime mọi thay đổi (Server-Sent Events)
router.get('/events', (req, res) => streamRequests(req, res, () => true, undefined, { stayFilter: () => true }));

router.get('/:id', (req, res) => res.json(presentRequest(findRequest(req.params.id))));

// POST /api/requests/:id/claim -> khoá quyền xử lý cho nhân viên đang đăng nhập (người sau nhận 409)
router.post('/:id/claim', (req, res) => {
  res.json(presentRequest(claimRequest(findRequest(req.params.id), req.staff)));
});

// PATCH /api/requests/:id/status { status: 'completed' | 'pending' | 'cancelled', reason? }
router.patch('/:id/status', (req, res) => {
  res.json(presentRequest(updateRequestStatus(findRequest(req.params.id), req.staff, req.body ?? {})));
});

function findRequest(id) {
  const found = db.requests.find((r) => r.id === id);
  if (!found) throw new HttpError(404, 'Request not found');
  return found;
}

export default router;
