import { useI18n } from '../i18n.jsx';
import { Icon } from './ui.jsx';

function Kpi({ label, value, icon, tone, chip }) {
  return (
    <article className="panel p-gutter-lg h-full flex flex-col justify-between gap-gutter-sm">
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-label-md text-on-surface-variant whitespace-nowrap">{label}</h2>
        <span className={`w-7 h-7 rounded flex items-center justify-center shrink-0 ${tone}`}>
          <Icon name={icon} className="text-[17px]" />
        </span>
      </header>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-headline-lg tabular-nums whitespace-nowrap">{value}</p>
        <span className={`text-label-sm px-2 py-0.5 rounded-full tabular-nums whitespace-nowrap ${tone}`}>{chip}</span>
      </div>
    </article>
  );
}

export default function KpiRow({ rooms, requests }) {
  const occupied = rooms.filter((r) => r.status === 'occupied').length;
  const pct = rooms.length ? Math.round((occupied / rooms.length) * 100) : 0;
  const food = requests.filter((r) => r.department === 'kitchen' && ['pending', 'in_progress'].includes(r.status)).length;
  const hk = requests.filter((r) => r.department === 'housekeeping' && ['pending', 'in_progress'].includes(r.status));
  const hkActive = hk.filter((r) => r.status === 'in_progress').length;
  const { t } = useI18n();

  return (
    <section aria-label={t('kpi.label')} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 items-stretch gap-gutter-lg">
      <Kpi label={t('kpi.occupied')} value={`${occupied}/${rooms.length}`} icon="hotel" tone="bg-emerald-tint text-on-emerald-tint" chip={t('kpi.occupancy', { pct })} />
      <Kpi label={t('kpi.food')} value={food} icon="restaurant_menu" tone="bg-amber-tint text-on-amber-tint" chip={t('kpi.kitchenQueue')} />
      <Kpi label={t('kpi.hk')} value={hk.length} icon="cleaning_services" tone="bg-blue-tint text-on-blue-tint" chip={t('kpi.active', { n: hkActive })} />
      {/* TODO(analytics): tính thời gian phản hồi trung bình từ lịch sử trạng thái */}
      <Kpi label={t('kpi.response')} value={t('kpi.responseValue')} icon="timer" tone="bg-emerald-tint text-on-emerald-tint" chip={t('kpi.target')} />
    </section>
  );
}
