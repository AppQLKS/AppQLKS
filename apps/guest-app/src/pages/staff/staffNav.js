export const STAFF_NAV = [
  { to: '/staff/tasks', label: 'nav.tasks', icon: 'assignment' },
  { to: '/staff/rooms', label: 'nav.rooms', icon: 'meeting_room' },
  { to: '/staff/profile', label: 'nav.profile', icon: 'badge' },
];


export const elapsedMinutes = (iso) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));

/** Danh sách món/đồ dùng; srv dịch tên do server trả về (nếu có). */
export const itemsText = (items, srv = (x) => x) => items.map((i) => (i.qty > 1 ? `${i.qty}x ${srv(i.name)}` : srv(i.name))).join(', ');
