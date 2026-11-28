import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadSession, staffApi } from '../../api.js';
import { mergeRequest, subscribeRequests } from '../../live.js';
import { BottomNav, Icon } from '../../components/ui.jsx';
import { initialsOf, useStaffAuth } from '../../staffAuth.jsx';
import { useI18n } from '../../i18n.jsx';
import { STAFF_NAV, elapsedMinutes, itemsText } from './staffNav.js';

/** Giống quy tắc ở server. */
const canHandle = (staff, task) =>
  staff.department === 'manager' || staff.department === task.department; // lễ tân không nhận việc

const FILTERS = [
  { id: 'all', label: 'queue.my' },
  { id: 'housekeeping', label: 'dept.housekeeping' },
  { id: 'kitchen', label: 'dept.kitchen' },
  { id: 'completed', label: 'queue.completed' },
];

export default function TaskQueue() {
  // Đặt tên tr (không phải t) vì vòng lặp bên dưới dùng biến t cho task
  const { t: tr, srv } = useI18n();
  const { staff, logout } = useStaffAuth();
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [onShift, setOnShift] = useState(true);
  const [claiming, setClaiming] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    staffApi('/requests').then(setTasks).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  // Việc mới / thay đổi trạng thái đến ngay, không cần tải lại
  useEffect(
    () =>
      subscribeRequests('/requests/events', {
        token: loadSession('staff')?.token,
        onRequest: (r) => setTasks((list) => mergeRequest(list, r)),
        onUnauthorized: logout,
      }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // "My Queue": việc đang chờ mà mình được nhận + việc mình đang làm
  const mine = (t) => t.status !== 'completed' && ((t.status === 'pending' && canHandle(staff, t)) || t.assignedTo === staff.id);
  const matches = (t) =>
    filter === 'all' ? mine(t) : filter === 'completed' ? t.status === 'completed' : t.department === filter && t.status !== 'completed';

  const visible = useMemo(() => tasks.filter(matches), [tasks, filter, staff]); // eslint-disable-line react-hooks/exhaustive-deps
  const incoming = visible.filter((t) => t.status === 'pending');
  const active = visible.filter((t) => t.status !== 'pending');
  const myCount = tasks.filter(mine).length;

  const claim = async (id) => {
    setClaiming(id);
    setError('');
    try {
      const updated = await staffApi(`/requests/${id}/claim`, { method: 'POST' });
      setTasks((list) => list.map((t) => (t.id === id ? updated : t)));
    } catch (e) {
      setError(`#${id}: ${e.message}`);
      if (e.status === 409) load(); // người khác nhận trước -> tải lại
    } finally {
      setClaiming(null);
    }
  };

  return (
    <div className="min-h-screen max-w-[390px] mx-auto flex flex-col pb-24">
      <header className="px-page-margin pt-2xl pb-md flex items-center justify-between gap-sm">
        <div className="flex items-center gap-sm min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 border border-accent/60 font-label text-label-md">
            {initialsOf(staff.name)}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-title text-title-sm truncate">{staff.name}</span>
            <span className="text-body-sm text-on-surface-variant truncate">{tr(`dept.${staff.department}`)}</span>
          </div>
        </div>
        <div className="flex items-center gap-sm shrink-0">
          <button
            type="button"
            aria-pressed={onShift}
            onClick={() => setOnShift((v) => !v)}
            className={`inline-flex items-center gap-xs px-md py-xs rounded-full border transition-colors duration-state-change ${
              onShift ? 'bg-success-container text-on-success-container border-success/30' : 'bg-surface-container text-on-surface-variant border-outline-variant'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${onShift ? 'bg-success' : 'bg-outline'}`} aria-hidden="true" />
            <span className="font-label text-label-sm">{onShift ? tr('queue.onShift') : tr('queue.onBreak')}</span>
          </button>
          <button type="button" aria-label={tr('queue.notifications', { n: incoming.length })} className="relative inline-flex items-center justify-center w-10 h-10 rounded-full bg-surface-container-lowest border border-outline-variant hover:bg-surface-container-low transition-colors duration-state-change">
            <Icon name="notifications" className="text-title-lg" />
            {incoming.length > 0 && (
              <span aria-hidden="true" className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-5 h-5 px-xs rounded-full bg-error text-on-error font-label text-label-sm tabular-nums">
                {incoming.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <main className="px-page-margin flex flex-col gap-lg flex-1">
        <div className="flex items-center gap-sm overflow-x-auto pb-xs" role="tablist" aria-label={tr('queue.filters')}>
          {FILTERS.map((f) => (
            <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)} className={`pill ${filter === f.id ? 'pill-active' : 'pill-idle'}`}>
              {f.id === 'all' ? `${tr(f.label)} (${myCount})` : tr(f.label)}
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className="flex items-start gap-xs p-md rounded-md bg-error-container text-error text-body-sm">
            <Icon name="error" className="text-title-sm shrink-0 mt-[1px]" />
            {error}
          </p>
        )}

        {incoming.map((t) => (
          <article key={t.id} className="card !border-2 !border-accent p-lg flex flex-col gap-md">
            <header className="flex items-center justify-between gap-sm">
              <span className="inline-flex items-center gap-xs px-md py-xs rounded-full bg-secondary-container text-on-secondary-container">
                <Icon name="bolt" className="text-label-md text-secondary" />
                <span className="font-label text-label-sm tabular-nums">{tr('queue.newRequest', { n: elapsedMinutes(t.createdAt) })}</span>
              </span>
              <span className="font-mono text-mono-sm text-secondary">#{t.id}</span>
            </header>
            <div className="flex flex-col gap-sm">
              <h3 className="font-title text-title-md text-balance">{tr('common.room', { n: t.roomNumber })} — {srv(t.title)}: {itemsText(t.items, srv)}</h3>
              {t.note && (
                <div className="flex items-start gap-sm p-md rounded-md bg-surface-container-low border border-outline-variant/60">
                  <Icon name="sticky_note_2" className="text-title-md text-primary shrink-0" />
                  <p className="text-body-sm text-on-surface-variant text-pretty">{t.note}</p>
                </div>
              )}
            </div>
            {canHandle(staff, t) ? (
              <button type="button" onClick={() => claim(t.id)} disabled={claiming === t.id} className="btn-primary w-full px-xl py-md">
                {claiming === t.id ? tr('queue.claiming') : tr('queue.claim')}
              </button>
            ) : (
              <p className="text-center text-body-sm text-on-surface-variant">{tr('queue.forDept', { dept: tr(`dept.${t.department}`) })}</p>
            )}
          </article>
        ))}

        <section aria-labelledby="active-heading" className="flex flex-col gap-sm">
          <div className="flex items-center justify-between">
            <h2 id="active-heading" className="font-title text-title-md">{filter === 'completed' ? tr('queue.completed') : tr('queue.active')}</h2>
            <span className="text-body-sm text-on-surface-variant tabular-nums">{tr(filter === 'completed' ? 'queue.countDone' : 'queue.countActive', { n: active.length })}</span>
          </div>
          {active.map((t) => {
            const mine = t.assignedTo === staff.id;
            return (
              <article key={t.id} className="card !border-outline-variant p-lg flex flex-col gap-md">
                <header className="flex items-center justify-between gap-sm">
                  <span className="font-label text-label-sm text-secondary uppercase tracking-wider tabular-nums">
                    {tr('queue.elapsed', { status: tr(t.status === 'completed' ? 'status.completed' : 'status.in_progress'), n: elapsedMinutes(t.createdAt) })}
                  </span>
                  <span className={`inline-flex items-center px-md py-xs rounded-full font-label text-label-sm shrink-0 ${mine ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-low text-on-surface-variant'}`}>
                    {mine ? tr('queue.assignedYou') : t.assignee?.name ?? tr('queue.unassigned')}
                  </span>
                </header>
                <div className="flex flex-col gap-xs">
                  <h3 className="font-title text-title-md text-balance">{tr('common.room', { n: t.roomNumber })} — {srv(t.title)} ({itemsText(t.items, srv)})</h3>
                  {t.note && <p className="text-body-sm text-on-surface-variant">{t.note}</p>}
                </div>
                <Link to={`/staff/tasks/${t.id}`} className="btn-outline w-full px-xl py-md">
                  {t.status === 'completed' ? tr('queue.viewDetails') : tr('queue.update')}
                  <Icon name="arrow_forward" className="text-title-md" />
                </Link>
              </article>
            );
          })}
          {active.length === 0 && <p className="text-body-sm text-on-surface-variant">{tr('queue.empty')}</p>}
        </section>
      </main>

      <BottomNav items={STAFF_NAV} />
    </div>
  );
}
