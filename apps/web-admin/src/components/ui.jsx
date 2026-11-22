import { useI18n } from '../i18n.jsx';

export function Icon({ name, className = '' }) {
  return (
    <span className={`material-symbols-outlined ${className}`} aria-hidden="true">
      {name}
    </span>
  );
}

const STATUS = {
  pending: { box: 'bg-amber-tint text-on-amber-tint', dot: 'bg-status-amber' },
  in_progress: { box: 'bg-blue-tint text-on-blue-tint', dot: 'bg-status-blue' },
  completed: { box: 'bg-emerald-tint text-on-emerald-tint', dot: 'bg-status-emerald' },
  cancelled: { box: 'bg-error-tint text-on-error-tint', dot: 'bg-status-error' },
};

export function StatusBadge({ status }) {
  const { t } = useI18n();
  const key = STATUS[status] ? status : 'pending';
  const s = STATUS[key];
  return (
    <span role="status" className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${s.box}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
      <span className="text-label-sm">{t(`status.${key}`)}</span>
    </span>
  );
}

export const money = (n) => `$${Number(n).toFixed(2)}`;
export const formatCode = (code = '') => (code.length === 6 ? `${code.slice(0, 3)}-${code.slice(3)}` : code);
export const initials = (name = '') => name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
// Thời gian đã chờ và khoảng lưu trú: dùng elapsed() / stayLabel() trong i18n.jsx (theo ngôn ngữ)
