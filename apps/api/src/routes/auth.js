import { Router } from 'express';
import {
  clearFailures,
  createSession,
  destroySession,
  isLockedOut,
  recordFailure,
} from '../auth/guestSessions.js';
import { HttpError, notImplemented } from '../middleware/errors.js';
import { bearerToken } from '../middleware/requireGuest.js';
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

// TODO(feature/staff-web-portal): POST /staff { staffId, password, department }
router.post('/staff', notImplemented('feature/staff-web-portal'));
export default router;
