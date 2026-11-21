export const STAFF_NAV = [
  { to: '/staff/tasks', label: 'Tasks', icon: 'assignment' },
  { to: '/staff/rooms', label: 'Rooms', icon: 'meeting_room' },
  { to: '/staff/profile', label: 'Shift Profile', icon: 'badge' },
];


export const elapsedMinutes = (iso) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));

export const itemsText = (items) => items.map((i) => (i.qty > 1 ? `${i.qty}x ${i.name}` : i.name)).join(', ');
