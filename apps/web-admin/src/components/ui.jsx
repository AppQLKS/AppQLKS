export function Icon({ name, className = '' }) {
  return (
    <span className={`material-symbols-outlined ${className}`} aria-hidden="true">
      {name}
    </span>
  );
}

const STATUS = {
  pending: { label: 'Pending', box: 'bg-amber-tint text-on-amber-tint', dot: 'bg-status-amber' },
  in_progress: { label: 'In Progress', box: 'bg-blue-tint text-on-blue-tint', dot: 'bg-status-blue' },
  completed: { label: 'Completed', box: 'bg-emerald-tint text-on-emerald-tint', dot: 'bg-status-emerald' },
  cancelled: { label: 'Cancelled', box: 'bg-error-tint text-on-error-tint', dot: 'bg-status-error' },
};

export function StatusBadge({ status }) {
  const s = STATUS[status] ?? STATUS.pending;
  return (
    <span role="status" className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${s.box}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
      <span className="text-label-sm">{s.label}</span>
    </span>
  );
}

export const money = (n) => `$${Number(n).toFixed(2)}`;
export const formatCode = (code = '') => (code.length === 6 ? `${code.slice(0, 3)}-${code.slice(3)}` : code);
export const initials = (name = '') => name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
export const elapsedLabel = (iso) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  return m < 60 ? `${m}m ago` : `${Math.floor(m / 60)}h ago`;
};
export const formatStay = (stay) => {
  const fmt = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(stay.checkIn)} – ${fmt(stay.checkOut)} (${stay.guests} Guest${stay.guests > 1 ? 's' : ''})`;
};
