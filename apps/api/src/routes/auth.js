import { Router } from 'express';
import {
  clearFailures,
  createSession,
  destroySession,
  isLockedOut,
  recordFailure,
} from '../auth/guestSessions.js';
import { authenticateStaff, createStaffSession, destroyStaffSession, presentStaff } from '../auth/staffSessions.js';
import { HttpError } from '../middleware/errors.js';
import { bearerToken } from '../middleware/requireGuest.js';
import { requireStaff } from '../middleware/requireStaff.js';
import { presentSession } from './me.js';

const router = Router();

// POST /api/auth/guest { code: "A8K-92P" } -> { token, ...session }
router.post('/guest', (req, res) => {
  const key = req.ip ?? 'unknown';
  if (isLockedOut(key)) throw new HttpError(429, 'Too many attempts. Please wait a few minutes or dial 0 for reception.');

  const code = String(req.body?.code ?? '').replace(/[^a-z0-9]/gi, '').toUpperCase();
  if (code.length !== 6) throw new HttpError(400, 'Room code must be 6 characters.');

  const result = createSession(code);
  if (!result) {
    recordFailure(key);
    throw new HttpError(401, 'That code is not valid. Check your keycard or dial 0 for reception.');
  }
  clearFailures(key);
  res.status(201).json({ token: result.token, ...presentSession(result.stay) });
});

router.post('/guest/logout', (req, res) => {
  destroySession(bearerToken(req));
  res.status(204).end();
});

// POST /api/auth/staff { login: "HK-04" | email, password, department? } -> { token, staff }
// department (nếu gửi) phải khớp bộ phận của tài khoản; quản lý đăng nhập được mọi bộ phận.
router.post('/staff', (req, res) => {
  const key = `staff:${req.ip ?? 'unknown'}`;
  if (isLockedOut(key)) throw new HttpError(429, 'Too many attempts. Please wait a few minutes or contact your manager.');

  const { login, password, department } = req.body ?? {};
  if (!login || !password) throw new HttpError(400, 'Enter your staff ID and password.');

  const staff = authenticateStaff(login, password);
  if (!staff) {
    recordFailure(key);
    throw new HttpError(401, 'Staff ID or password is incorrect.');
  }
  if (department && staff.department !== department && staff.department !== 'manager') {
    throw new HttpError(403, `This account belongs to ${staff.department}, not ${department}.`);
  }
  clearFailures(key);
  res.status(201).json({ token: createStaffSession(staff), staff: presentStaff(staff) });
});

router.get('/staff/me', requireStaff(), (req, res) => res.json({ staff: presentStaff(req.staff) }));

router.post('/staff/logout', (req, res) => {
  destroyStaffSession(bearerToken(req));
  res.status(204).end();
});

export default router;
