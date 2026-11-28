import { departmentOf, findStaff, setRequestStatus } from '../data/store.js';
import { HttpError } from '../middleware/errors.js';
import { markRoomReady } from './rooms.js';

const SUPERVISORS = ['reception', 'manager'];
const isSupervisor = (staff) => SUPERVISORS.includes(staff.department);

/**
 * Ai được nhận việc: đúng bộ phận (bếp / buồng phòng), hoặc quản lý khi cần làm thay.
 * Lễ tân không nhận việc: chỉ theo dõi, huỷ, nhận phòng và trả phòng.
 */
export function canHandle(staff, request) {
  return staff.department === 'manager' || staff.department === departmentOf(request.type);
}

/** Nhận việc: chỉ khi đang chờ. Node xử lý tuần tự nên kiểm tra + gán là nguyên tử. */
export function claimRequest(request, staff) {
  if (!canHandle(staff, request)) throw new HttpError(403, `This is a ${departmentOf(request.type)} task.`);
  if (request.status !== 'pending') throw alreadyTaken(request);
  return setRequestStatus(request, 'in_progress', { by: staff.id, assignedTo: staff.id });
}

/**
 * Cập nhật trạng thái:
 *  - 'completed' : đang làm -> xong (người nhận việc, lễ tân, quản lý)
 *  - 'pending'   : trả việc về hàng đợi để người khác nhận (người nhận việc, lễ tân, quản lý)
 *  - 'cancelled' : huỷ yêu cầu chưa xong (chỉ lễ tân, quản lý; cần lý do)
 */
export function updateRequestStatus(request, staff, { status, reason } = {}) {
  const owner = request.assignedTo === staff.id;
  const cleanReason = typeof reason === 'string' ? reason.trim().slice(0, 200) : '';

  switch (status) {
    case 'completed':
      if (request.status !== 'in_progress') throw new HttpError(409, 'Only a task in progress can be completed.');
      if (!owner && !isSupervisor(staff)) throw new HttpError(403, 'Only the assigned staff member can complete this task.');
      setRequestStatus(request, 'completed', { by: staff.id });
      // Dọn phòng sau trả phòng xong -> phòng về Trống, lễ tân nhận khách mới được
      if (request.kind === 'turnover') markRoomReady(request.roomNumber, staff, { auto: true });
      return request;

    case 'pending':
      if (request.status !== 'in_progress') throw new HttpError(409, 'Only a task in progress can be released.');
      if (!owner && !isSupervisor(staff)) throw new HttpError(403, 'Only the assigned staff member can release this task.');
      return setRequestStatus(request, 'pending', { by: staff.id, assignedTo: null, reason: cleanReason || undefined });

    case 'cancelled':
      if (!isSupervisor(staff)) throw new HttpError(403, 'Only reception or a manager can cancel a request.');
      if (!['pending', 'in_progress'].includes(request.status)) throw new HttpError(409, `This request is already ${request.status}.`);
      if (!cleanReason) throw new HttpError(400, 'Please give a reason for cancelling.');
      return setRequestStatus(request, 'cancelled', { by: staff.id, reason: cleanReason });

    default:
      throw new HttpError(400, `Unsupported status: ${status}`);
  }
}

function alreadyTaken(request) {
  if (request.status === 'in_progress' && request.assignedTo) {
    return new HttpError(409, `Already claimed by ${findStaff(request.assignedTo)?.name ?? request.assignedTo}.`);
  }
  return new HttpError(409, `This request is already ${request.status.replace('_', ' ')}.`);
}
