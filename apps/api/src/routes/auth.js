import { Router } from 'express';
import { notImplemented } from '../middleware/errors.js';

const router = Router();
// TODO(feature/guest-auth-room-code): POST /guest { code } -> token phiên khách
router.post('/guest', notImplemented('feature/guest-auth-room-code'));
// TODO(feature/staff-web-portal): POST /staff { staffId, password, department }
router.post('/staff', notImplemented('feature/staff-web-portal'));
export default router;
