import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api.js';
import { BackPill, Badge, Icon, StepBar } from '../../components/ui.jsx';
import { elapsedMinutes } from './staffNav.js';

const STEP_OF = { pending: 0, in_progress: 2, completed: 3 };
const SLA_MINUTES = 15;

export default function TaskDetail() {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const [checked, setChecked] = useState([]);
  const [completed, setCompleted] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    api(`/requests/${id}`)
      .then((t) => {
        setTask(t);
        setCompleted(t.status === 'completed');
        return api(`/rooms/${t.roomNumber}`).then(setRoom);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (error) return <p className="p-page-margin text-error">{error}</p>;
  if (!task) return <p className="p-page-margin text-on-surface-variant">Loading…</p>;

  const seconds = Math.max(0, Math.floor((now - new Date(task.createdAt).getTime()) / 1000));
  const elapsed = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const toggle = (i) => setChecked((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]));
  const items = task.items.map((i) => (i.qty > 1 ? `${i.qty}x ${i.name}` : i.name));
  const step = completed ? 3 : STEP_OF[task.status] ?? 0;

  return (
    <div className="min-h-screen max-w-[390px] mx-auto flex flex-col pb-2xl">
      <header className="px-page-margin pt-2xl pb-md flex flex-col gap-md">
        <div className="flex items-center justify-between gap-sm">
          <BackPill to="/staff/tasks" label="Task Queue" />
          <Badge tone="accentBorder" dot>{completed ? 'Completed' : task.status === 'pending' ? 'Pending' : 'In Progress'}</Badge>
        </div>
        <h1 className="font-headline text-headline-lg">Request #{task.id}</h1>
      </header>

      <main className="px-page-margin flex flex-col gap-lg flex-1">
        <article className="card p-lg flex flex-col gap-md">
          <div className="flex items-start justify-between gap-sm">
            <div className="flex flex-col gap-xs">
              <h2 className="font-title text-title-md">Room {task.roomNumber} • {room?.type ?? ''}</h2>
              <p className="text-body-sm text-on-surface-variant">Guest: {room?.stay?.guestName ?? '—'}</p>
            </div>
            {room?.stay && <Badge dot>Active Stay</Badge>}
          </div>
          <div className="grid grid-cols-2 gap-md pt-sm border-t border-outline-variant/60">
            <div className="flex flex-col gap-xs">
              <span className="font-label text-label-sm text-on-surface-variant uppercase tracking-wider">Elapsed</span>
              <span className="font-mono text-mono-lg tabular-nums">{elapsed} mins</span>
            </div>
            <div className="flex flex-col gap-xs items-end text-right">
              <span className="font-label text-label-sm text-on-surface-variant uppercase tracking-wider">SLA Target</span>
              <span className={`font-label text-label-lg tabular-nums ${elapsedMinutes(task.createdAt) > SLA_MINUTES ? 'text-error' : 'text-primary'}`}>
                Target: &lt; {SLA_MINUTES} mins
              </span>
            </div>
          </div>
        </article>

        <article className="card p-lg flex flex-col gap-md">
          <div className="flex items-center justify-between">
            <h2 className="font-title text-title-md">Checklist</h2>
            <span className="font-mono text-mono-sm text-on-surface-variant tabular-nums">{checked.length} / {items.length} done</span>
          </div>
          <ul className="flex flex-col gap-sm">
            {items.map((label, i) => (
              <li key={label}>
                <label className="flex items-center gap-md p-md rounded-md bg-surface-container-low cursor-pointer">
                  <input type="checkbox" checked={checked.includes(i)} onChange={() => toggle(i)} className="w-5 h-5 rounded text-primary border-outline-variant focus:ring-primary" />
                  <span className="text-body-md">{label}</span>
                </label>
              </li>
            ))}
          </ul>
          {task.note && (
            <div className="flex items-start gap-sm p-md rounded-md bg-secondary-container border border-accent">
              <Icon name="info" className="text-title-md text-secondary shrink-0" />
              <p className="text-body-sm text-on-secondary-container text-pretty"><span className="font-semibold">Note:</span> {task.note}</p>
            </div>
          )}
        </article>

        <article className="card p-lg flex flex-col gap-md">
          <h2 className="font-title text-title-sm">Live Status</h2>
          <StepBar steps={['Received', 'Claimed', 'In Progress', 'Completed']} current={step} height="h-2" />
        </article>

        <section aria-label="Task completion actions" className="flex flex-col items-center gap-sm pt-xs">
          {/* TODO(feature/request-tracking): PATCH /api/requests/:id/status { status: 'completed' } */}
          <button type="button" disabled={completed} onClick={() => setCompleted(true)} className="btn-primary w-full px-xl py-lg">
            <Icon name={completed ? 'done_all' : 'check_circle'} className="text-title-md" />
            {completed ? 'Completed • Guest Notified' : 'Mark as Completed & Notify Guest'}
          </button>
          <button type="button" className="px-lg py-sm font-label text-label-md text-on-surface-variant hover:text-error transition-colors duration-state-change rounded-md">
            Report Issue / Reassign
          </button>
        </section>
      </main>
    </div>
  );
}
