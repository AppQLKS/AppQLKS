export const STAFF_NAV = [
  { to: '/staff/tasks', label: 'Tasks', icon: 'assignment' },
  { to: '/staff/rooms', label: 'Rooms', icon: 'meeting_room' },
  { to: '/staff/profile', label: 'Shift Profile', icon: 'badge' },
];

// Nhân viên demo cho tới khi có đăng nhập thật (feature/staff-web-portal)
export const DEMO_STAFF = { id: 'HK-04', name: 'Minh Anh', initials: 'MA', department: 'Housekeeping' };

export const elapsedMinutes = (iso) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));

export const itemsText = (items) => items.map((i) => (i.qty > 1 ? `${i.qty}x ${i.name}` : i.name)).join(', ');
