import { Router } from 'express';
import { db, departmentOf, presentRequest } from '../data/store.js';
import { HttpError, notImplemented } from '../middleware/errors.js';
import { requireStaff } from '../middleware/requireStaff.js';

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

router.get('/:id', (req, res) => {
  const found = db.requests.find((r) => r.id === req.params.id);
  if (!found) throw new HttpError(404, 'Request not found');
  res.json(presentRequest(found));
});

/** Bộ phận nào được nhận việc của bộ phận nào. */
export function canHandle(staff, request) {
  if (staff.department === 'manager' || staff.department === 'reception') return true;
  return staff.department === departmentOf(request.type);
}

// POST /api/requests/:id/claim -> khoá quyền xử lý cho nhân viên đang đăng nhập.
// Node xử lý tuần tự nên kiểm tra + gán trong cùng một lượt là nguyên tử:
// hai người bấm cùng lúc thì người sau nhận 409.
router.post('/:id/claim', (req, res) => {
  const found = db.requests.find((r) => r.id === req.params.id);
  if (!found) throw new HttpError(404, 'Request not found');
  if (!canHandle(req.staff, found)) {
    throw new HttpError(403, `This is a ${departmentOf(found.type)} task.`);
  }
  if (found.status !== 'pending') {
    const by = presentRequest(found).assignee?.name;
    throw new HttpError(409, by ? `Already claimed by ${by}.` : `This request is already ${found.status.replace('_', ' ')}.`);
  }
  found.status = 'in_progress';
  found.assignedTo = req.staff.id;
  found.claimedAt = new Date().toISOString();
  res.json(presentRequest(found));
});

// TODO(feature/request-tracking): cập nhật trạng thái (hoàn thành, báo sự cố)
router.patch('/:id/status', notImplemented('feature/request-tracking'));
export default router;
