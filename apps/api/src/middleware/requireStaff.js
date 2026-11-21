import { resolveStaffSession } from '../auth/staffSessions.js';
import { HttpError } from './errors.js';
import { bearerToken } from './requireGuest.js';

/**
 * Yêu cầu phiên nhân viên hợp lệ; gắn req.staff.
 * requireStaff()                       -> mọi nhân viên
 * requireStaff('reception', 'manager') -> chỉ các bộ phận này
 */
export function requireStaff(...departments) {
  return (req, res, next) => {
    const staff = resolveStaffSession(bearerToken(req));
    if (!staff) return next(new HttpError(401, 'Please sign in to your shift.'));
    if (departments.length && !departments.includes(staff.department)) {
      return next(new HttpError(403, 'Your role cannot do this.'));
    }
    req.staff = staff;
    next();
  };
}
