import { resolveSession } from '../auth/guestSessions.js';
import { HttpError } from './errors.js';

export function bearerToken(req) {
  const header = req.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

/** Yêu cầu phiên khách hợp lệ; gắn req.stay và req.token. */
export function requireGuest(req, res, next) {
  const token = bearerToken(req);
  const stay = resolveSession(token);
  if (!stay) return next(new HttpError(401, 'Session expired. Please enter your room code again.'));
  req.token = token;
  req.stay = stay;
  next();
}
