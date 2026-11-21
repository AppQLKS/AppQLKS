import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { BottomNav, Icon } from '../../components/ui.jsx';
import { DEMO_STAFF, STAFF_NAV, elapsedMinutes, itemsText } from './staffNav.js';

const FILTERS = [
  { id: 'all', label: 'My Queue' },
  { id: 'housekeeping', label: 'Housekeeping' },
  { id: 'kitchen', label: 'Kitchen / F&B' },
  { id: 'completed', label: 'Completed' },
];

export default function TaskQueue() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('all');
  const [onShift, setOnShift] = useState(true);
  const [claimed, setClaimed] = useState([]); // id đã claim (tạm thời ở client)

  useEffect(() => {
    api('/requests').then(setTasks).catch(() => {});
  }, []);

  const matches = (t) =>
    filter === 'all' ? t.status !== 'completed' : filter === 'completed' ? t.status === 'completed' : t.department === filter && t.status !== 'completed';

  const visible = useMemo(() => tasks.filter(matches), [tasks, filter]); // eslint-disable-line react-hooks/exhaustive-deps
  const incoming = visible.filter((t) => t.status === 'pending' && !claimed.includes(t.id));
  const active = visible.filter((t) => t.status !== 'pending' || claimed.includes(t.id));
  const openCount = tasks.filter((t) => t.status !== 'completed').length;

  // TODO(feature/staff-web-portal): POST /api/requests/:id/claim
  const claim = (id) => setClaimed((c) => [...c, id]);

  return (
    <div className="min-h-screen max-w-[390px] mx-auto flex flex-col pb-24">
      <header className="px-page-margin pt-2xl pb-md flex items-center justify-between gap-sm">
        <div className="flex items-center gap-sm min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 border border-accent/60 font-label text-label-md">
            {DEMO_STAFF.initials}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-title text-title-sm truncate">{DEMO_STAFF.name}</span>
            <span className="text-body-sm text-on-surface-variant truncate">{DEMO_STAFF.department}</span>
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
            <span className="font-label text-label-sm">{onShift ? 'On Shift' : 'On Break'}</span>
          </button>
          <button type="button" aria-label={`Notifications, ${incoming.length} unread`} className="relative inline-flex items-center justify-center w-10 h-10 rounded-full bg-surface-container-lowest border border-outline-variant hover:bg-surface-container-low transition-colors duration-state-change">
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
        <div className="flex items-center gap-sm overflow-x-auto pb-xs" role="tablist" aria-label="Task filters">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)} className={`pill ${filter === f.id ? 'pill-active' : 'pill-idle'}`}>
              {f.id === 'all' ? `${f.label} (${openCount})` : f.label}
            </button>
          ))}
        </div>

        {incoming.map((t) => (
          <article key={t.id} className="card !border-2 !border-accent p-lg flex flex-col gap-md">
            <header className="flex items-center justify-between gap-sm">
              <span className="inline-flex items-center gap-xs px-md py-xs rounded-full bg-secondary-container text-on-secondary-container">
                <Icon name="bolt" className="text-label-md text-secondary" />
                <span className="font-label text-label-sm tabular-nums">NEW REQUEST • {elapsedMinutes(t.createdAt)} min ago</span>
              </span>
              <span className="font-mono text-mono-sm text-secondary">#{t.id}</span>
            </header>
            <div className="flex flex-col gap-sm">
              <h3 className="font-title text-title-md text-balance">Room {t.roomNumber} — {t.title}: {itemsText(t.items)}</h3>
              {t.note && (
                <div className="flex items-start gap-sm p-md rounded-md bg-surface-container-low border border-outline-variant/60">
                  <Icon name="sticky_note_2" className="text-title-md text-primary shrink-0" />
                  <p className="text-body-sm text-on-surface-variant text-pretty">{t.note}</p>
                </div>
              )}
            </div>
            <button type="button" onClick={() => claim(t.id)} className="btn-primary w-full px-xl py-md">Claim Task</button>
          </article>
        ))}

        <section aria-labelledby="active-heading" className="flex flex-col gap-sm">
          <div className="flex items-center justify-between">
            <h2 id="active-heading" className="font-title text-title-md">{filter === 'completed' ? 'Completed' : 'Active Tasks'}</h2>
            <span className="text-body-sm text-on-surface-variant tabular-nums">{active.length} {filter === 'completed' ? 'done' : 'active'}</span>
          </div>
          {active.map((t) => {
            const mine = claimed.includes(t.id) || t.assignedTo === DEMO_STAFF.id;
            return (
              <article key={t.id} className="card !border-outline-variant p-lg flex flex-col gap-md">
                <header className="flex items-center justify-between gap-sm">
                  <span className="font-label text-label-sm text-secondary uppercase tracking-wider tabular-nums">
                    {t.status === 'completed' ? 'Completed' : 'In Progress'} • {elapsedMinutes(t.createdAt)} mins elapsed
                  </span>
                  <span className={`inline-flex items-center px-md py-xs rounded-full font-label text-label-sm shrink-0 ${mine ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container-low text-on-surface-variant'}`}>
                    {mine ? 'Assigned to You' : t.assignee?.name ?? 'Unassigned'}
                  </span>
                </header>
                <div className="flex flex-col gap-xs">
                  <h3 className="font-title text-title-md text-balance">Room {t.roomNumber} — {t.title} ({itemsText(t.items)})</h3>
                  {t.note && <p className="text-body-sm text-on-surface-variant">{t.note}</p>}
                </div>
                <Link to={`/staff/tasks/${t.id}`} className="btn-outline w-full px-xl py-md">
                  {t.status === 'completed' ? 'View Details' : 'Update Status'}
                  <Icon name="arrow_forward" className="text-title-md" />
                </Link>
              </article>
            );
          })}
          {active.length === 0 && <p className="text-body-sm text-on-surface-variant">Nothing here yet.</p>}
        </section>
      </main>

      <BottomNav items={STAFF_NAV} />
    </div>
  );
}
