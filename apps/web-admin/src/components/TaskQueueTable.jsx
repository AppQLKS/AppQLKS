import { useState } from 'react';
import { api } from '../api.js';
import { useStaff } from '../staff.jsx';
import { useI18n } from '../i18n.jsx';
import { Icon, StatusBadge, initials } from './ui.jsx';

/** Giống quy tắc ở server: bếp chỉ nhận việc bếp, buồng phòng nhận việc buồng phòng. */
const canClaim = (staff, task) =>
  staff.department === 'manager' || staff.department === 'reception' || staff.department === task.department;

const TABS = ['all', 'kitchen', 'housekeeping'];
const COLUMNS = ['id', 'room', 'service', 'elapsed', 'staff', 'status'];

export default function TaskQueueTable({ requests, setRequests, reload, initialDept = 'all' }) {
  const { staff } = useStaff();
  const { t: tr, srv, apiError, elapsed } = useI18n();
  const itemsText = (items) => items.map((i) => (i.qty > 1 ? `${i.qty}x ${srv(i.name)}` : srv(i.name))).join(' & ');
  const [dept, setDept] = useState(initialDept);
  const [claiming, setClaiming] = useState(null);
  const [error, setError] = useState('');
  const rows = requests.filter((r) => dept === 'all' || r.department === dept);

  // Server khoá việc: nếu người khác đã nhận trước, trả 409 và ta tải lại hàng đợi
  const claim = async (id) => {
    setClaiming(id);
    setError('');
    try {
      const updated = await api(`/requests/${id}/claim`, { method: 'POST' });
      setRequests((list) => list.map((r) => (r.id === id ? updated : r)));
    } catch (e) {
      setError(`#${id}: ${apiError(e)}`);
      if (e.status === 409) reload?.();
    } finally {
      setClaiming(null);
    }
  };

  return (
    <section aria-label={tr('queue.section')} className="panel flex flex-col">
      <div className="p-gutter-xl border-b border-outline-variant flex flex-wrap items-center justify-between gap-gutter-md">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-headline-md">{tr('queue.section')}</h2>
          <p className="text-body-sm text-on-surface-variant">{tr('queue.hint')}</p>
        </div>
        <div role="tablist" aria-label={tr('queue.filters')} className="inline-flex items-center p-1 rounded bg-surface-container border border-outline-variant gap-1">
          {TABS.map((id) => (
            <button
              key={id}
              role="tab"
              aria-selected={dept === id}
              onClick={() => setDept(id)}
              className={`px-3 py-1.5 rounded-sm text-label-lg transition-colors duration-state-change ${
                dept === id ? 'bg-surface-low text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tr(`queue.tab.${id}`)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="mx-gutter-xl mt-gutter-md flex items-center gap-2 p-gutter-md rounded bg-error-tint text-on-error-tint text-body-sm">
          <Icon name="error" className="text-[18px] shrink-0" />
          {error}
        </p>
      )}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-outline-variant bg-surface text-label-md text-on-surface-variant">
              {COLUMNS.map((c) => (
                <th key={c} scope="col" className="py-3 px-4 whitespace-nowrap font-medium">{tr(`queue.col.${c}`)}</th>
              ))}
              <th scope="col" className="py-3 px-4 text-right whitespace-nowrap font-medium">{tr('queue.col.action')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {rows.map((t) => (
              <tr key={t.id} className="hover:bg-surface transition-colors duration-state-change">
                <td className="py-3.5 px-4 font-mono text-mono-sm text-on-surface-variant tabular-nums whitespace-nowrap">#{t.id}</td>
                <td className="py-3.5 px-4 text-title-md tabular-nums whitespace-nowrap">{t.roomNumber}</td>
                <td className="py-3.5 px-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-body-md">{srv(t.title)} · {itemsText(t.items)}</span>
                    {t.note && <span className="text-body-sm text-on-surface-variant">{tr('queue.note', { note: t.note })}</span>}
                  </div>
                </td>
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-sm bg-surface-container text-on-surface-variant text-label-sm tabular-nums">{elapsed(t.createdAt)}</span>
                </td>
                <td className="py-3.5 px-4">
                  {t.assignee ? (
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-brand-slate text-on-brand-slate flex items-center justify-center text-label-sm shrink-0">{initials(t.assignee.name)}</span>
                      <span className="text-body-sm whitespace-nowrap">{t.assignee.name}</span>
                    </div>
                  ) : (
                    <span className="text-body-sm text-on-surface-variant">{tr('queue.unassigned')}</span>
                  )}
                </td>
                <td className="py-3.5 px-4 whitespace-nowrap"><StatusBadge status={t.status} /></td>
                <td className="py-3.5 px-4 text-right">
                  {t.status === 'pending' ? (
                    <button
                      type="button"
                      onClick={() => claim(t.id)}
                      disabled={claiming === t.id || !canClaim(staff, t)}
                      title={canClaim(staff, t) ? undefined : tr('queue.onlyDept', { dept: tr(`dept.${t.department}`) })}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded bg-primary text-on-primary hover:bg-on-blue-tint disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-state-change whitespace-nowrap"
                    >
                      <Icon name="lock" className="text-[15px]" />
                      <span className="text-label-lg">{claiming === t.id ? tr('queue.claiming') : tr('queue.claim')}</span>
                    </button>
                  ) : (
                    <button type="button" disabled className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded bg-surface-container text-on-surface-variant border border-outline-variant cursor-not-allowed whitespace-nowrap">
                      <Icon name="verified_user" className="text-[15px]" />
                      <span className="text-label-lg">{t.status === 'completed' ? tr('queue.done') : tr('queue.locked')}</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 px-4 text-center text-body-sm text-on-surface-variant">{tr('queue.empty')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
