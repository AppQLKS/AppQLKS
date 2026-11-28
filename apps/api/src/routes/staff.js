import { Router } from 'express';
import { requireStaff } from '../middleware/requireStaff.js';
import { createStaff, listStaff, resetPassword, setActive, updateStaff } from '../services/staff.js';

// Quản lý tài khoản nhân viên — chỉ quản lý
const router = Router();
router.use(requireStaff('manager'));

// GET /api/staff -> danh sách (không kèm hash mật khẩu)
router.get('/', (req, res) => res.json(listStaff()));

// POST /api/staff { name, email, department, password } -> nhân viên mới, mã tự sinh theo bộ phận
router.post('/', (req, res) => res.status(201).json(createStaff(req.body)));

// PATCH /api/staff/:id { name?, email?, department? }
router.patch('/:id', (req, res) => res.json(updateStaff(req.params.id, req.body, req.staff)));

// POST /api/staff/:id/password { password } -> đặt lại mật khẩu, đăng xuất mọi thiết bị
router.post('/:id/password', (req, res) => res.json(resetPassword(req.params.id, req.body)));

// POST /api/staff/:id/active { active } -> khoá / mở khoá tài khoản
router.post('/:id/active', (req, res) => res.json(setActive(req.params.id, req.body, req.staff)));

export default router;
