import { hashPassword } from '../auth/passwords.js';
import { destroySessionsOf, presentStaff } from '../auth/staffSessions.js';
import { db, setRequestStatus } from '../data/store.js';
import { HttpError } from '../middleware/errors.js';

export const DEPARTMENTS = ['reception', 'kitchen', 'housekeeping', 'manager'];
const PREFIX = { reception: 'RC', kitchen: 'KT', housekeeping: 'HK', manager: 'MG' };
export const MIN_PASSWORD = 8;
const MAX_NAME = 80;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isActive = (staff) => staff.active !== false;

function requireMember(id) {
  const staff = db.staff.find((s) => s.id === String(id).toUpperCase());
  if (!staff) throw new HttpError(404, 'Staff member not found.');
  return staff;
}

/** Thông tin cho trang quản lý: thêm số việc đang làm. */
function presentForAdmin(staff) {
  const activeTasks = db.requests.filter((r) => r.assignedTo === staff.id && r.status === 'in_progress').length;
  return { ...presentStaff(staff), active: isActive(staff), activeTasks };
}

/** Mã tiếp theo theo bộ phận: HK-06, RC-02... (không dùng lại mã cũ). */
function nextStaffId(department) {
  const prefix = PREFIX[department];
  const max = db.staff
    .filter((s) => s.id.startsWith(`${prefix}-`))
    .reduce((m, s) => Math.max(m, Number(s.id.slice(prefix.length + 1)) || 0), 0);
  return `${prefix}-${String(max + 1).padStart(2, '0')}`;
}

function cleanName(value) {
  const name = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  if (!name) throw new HttpError(400, 'Enter the staff member’s name.');
  if (name.length > MAX_NAME) throw new HttpError(400, `Name is limited to ${MAX_NAME} characters.`);
  return name;
}

function cleanEmail(value, exceptId) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(email) || email.length > 120) throw new HttpError(400, 'Enter a valid email address.');
  if (db.staff.some((s) => s.id !== exceptId && s.email?.toLowerCase() === email)) {
    throw new HttpError(409, 'This email is already used by another staff member.');
  }
  return email;
}

function cleanDepartment(value) {
  if (!DEPARTMENTS.includes(value)) throw new HttpError(400, 'Choose a department.');
  return value;
}

function cleanPassword(value) {
  const password = typeof value === 'string' ? value : '';
  if (password.length < MIN_PASSWORD || password.length > 128) {
    throw new HttpError(400, `Password must be at least ${MIN_PASSWORD} characters.`);
  }
  return password;
}

/** Luôn còn ít nhất một quản lý đang hoạt động, để không ai bị khoá ngoài trang này. */
function assertKeepsAManager(target, { department = target.department, active = isActive(target) } = {}) {
  const stillManager = department === 'manager' && active;
  if (target.department === 'manager' && isActive(target) && !stillManager) {
    const others = db.staff.filter((s) => s.id !== target.id && s.department === 'manager' && isActive(s));
    if (others.length === 0) throw new HttpError(409, 'At least one active manager is required.');
  }
}

/** Trả các việc đang làm của nhân viên về hàng chờ (khi bị khoá / đổi bộ phận). */
function releaseTasksOf(staff, by, reason) {
  for (const r of db.requests.filter((x) => x.assignedTo === staff.id && x.status === 'in_progress')) {
    setRequestStatus(r, 'pending', { by: by.id, assignedTo: null, reason });
  }
}

export function listStaff() {
  const order = Object.fromEntries(DEPARTMENTS.map((d, i) => [d, i]));
  return [...db.staff]
    .sort((a, b) => order[a.department] - order[b.department] || a.id.localeCompare(b.id))
    .map(presentForAdmin);
}

export function createStaff(body = {}) {
  const department = cleanDepartment(body.department);
  const staff = {
    id: nextStaffId(department),
    name: cleanName(body.name),
    department,
    email: cleanEmail(body.email),
    passwordHash: hashPassword(cleanPassword(body.password)),
    active: true,
  };
  db.staff.push(staff);
  return presentForAdmin(staff);
}

/** Sửa tên / email / bộ phận. Không tự đổi bộ phận của chính mình. */
export function updateStaff(id, body = {}, actor) {
  const staff = requireMember(id);
  const next = {
    name: body.name === undefined ? staff.name : cleanName(body.name),
    email: body.email === undefined ? staff.email : cleanEmail(body.email, staff.id),
    department: body.department === undefined ? staff.department : cleanDepartment(body.department),
  };
  if (next.department !== staff.department) {
    if (staff.id === actor.id) throw new HttpError(409, 'You cannot change your own department.');
    assertKeepsAManager(staff, { department: next.department });
    releaseTasksOf(staff, actor, 'Moved to another department');
  }
  Object.assign(staff, next);
  return presentForAdmin(staff);
}

/** Đặt lại mật khẩu: mọi phiên đang đăng nhập của người đó bị đăng xuất. */
export function resetPassword(id, body = {}) {
  const staff = requireMember(id);
  staff.passwordHash = hashPassword(cleanPassword(body.password));
  destroySessionsOf(staff.id);
  return presentForAdmin(staff);
}

/** Khoá / mở khoá tài khoản. Khoá thì đăng xuất ngay và trả việc đang làm về hàng chờ. */
export function setActive(id, body = {}, actor) {
  const staff = requireMember(id);
  if (typeof body.active !== 'boolean') throw new HttpError(400, 'Send active: true or false.');
  if (!body.active) {
    if (staff.id === actor.id) throw new HttpError(409, 'You cannot deactivate your own account.');
    assertKeepsAManager(staff, { active: false });
    destroySessionsOf(staff.id);
    releaseTasksOf(staff, actor, 'Staff account deactivated');
  }
  staff.active = body.active;
  return presentForAdmin(staff);
}
