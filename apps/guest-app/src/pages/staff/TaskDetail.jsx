import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { loadSession, staffApi } from '../../api.js';
import { BackPill, Badge, Icon, StepBar } from '../../components/ui.jsx';
import { subscribeRequests } from '../../live.js';
import { useStaffAuth } from '../../staffAuth.jsx';
import { useI18n } from '../../i18n.jsx';

const STEP_OF = { pending: 0, in_progress: 2, completed: 4 }; // 4 = mọi bước đã xong
const SLA_MINUTES = 15;
const SUPERVISORS = ['reception', 'manager'];


export default function TaskDetail() {
  const { t, fmtTime: timeOf, srv } = useI18n();
  const { id } = useParams();
  const navigate = useNavigate();
  const { staff, logout } = useStaffAuth();
  const [task, setTask] = useState(null);
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busy, setBusy] = useState(null); // 'claim' | 'complete' | 'release'
  const [checked, setChecked] = useState([]);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    staffApi(`/requests/${id}`)
      .then((t) => {
        setTask(t);
        return staffApi(`/rooms/${t.roomNumber}`).then(setRoom);
      })
      .catch((e) => setError(e.message));
  }, [id]);

  // Cập nhật ngay khi người khác nhận / hoàn thành / huỷ yêu cầu này
  useEffect(
    () =>
      subscribeRequests('/requests/events', {
        token: loadSession('staff')?.token,
        onRequest: (r) => r.id === id && setTask(r),
        onUnauthorized: logout,
      }),
    [id], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (error) return <p className="p-page-margin text-error">{error}</p>;
  if (!task) return <p className="p-page-margin text-on-surface-variant">{t('common.loading')}</p>;

  const mine = task.assignedTo === staff.id;
  const supervisor = SUPERVISORS.includes(staff.department);
  const canClaim = task.status === 'pending' && (supervisor || staff.department === task.department);
  const canAct = task.status === 'in_progress' && (mine || supervisor);

  // Đồng hồ dừng khi đã xong
  const end = task.completedAt ? new Date(task.completedAt).getTime() : now;
  const seconds = Math.max(0, Math.floor((end - new Date(task.createdAt).getTime()) / 1000));
  const elapsed = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  const overSla = seconds / 60 > SLA_MINUTES;

  const items = task.items.map((i) => (i.qty > 1 ? `${i.qty}x ${srv(i.name)}` : srv(i.name)));
  const toggle = (i) => setChecked((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]));
  const lastReason = [...task.history].reverse().find((h) => h.reason);

  const act = async (kind, request) => {
    setBusy(kind);
    setActionError('');
    try {
      setTask(await request());
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy(null);
    }
  };

  const claim = () => act('claim', () => staffApi(`/requests/${id}/claim`, { method: 'POST' }));
  const complete = () =>
    act('complete', () => staffApi(`/requests/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'completed' }) }));
  const release = async () => {
    const reason = window.prompt(t('task.reportPrompt'));
    if (reason === null) return;
    await act('release', () => staffApi(`/requests/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'pending', reason }) }));
    navigate('/staff/tasks');
  };

  return (
    <div className="min-h-screen max-w-[390px] mx-auto flex flex-col pb-2xl">
      <header className="px-page-margin pt-2xl pb-md flex flex-col gap-md">
        <div className="flex items-center justify-between gap-sm">
          <BackPill to="/staff/tasks" label={t('task.back')} />
          <Badge tone={task.status === 'completed' ? 'success' : 'accentBorder'} dot>{t(`status.${task.status}`)}</Badge>
        </div>
        <h1 className="font-headline text-headline-lg">{t('task.request', { id: task.id })}</h1>
      </header>

      <main className="px-page-margin flex flex-col gap-lg flex-1">
        <article className="card p-lg flex flex-col gap-md">
          <div className="flex items-start justify-between gap-sm">
            <div className="flex flex-col gap-xs">
              <h2 className="font-title text-title-md">{t('common.room', { n: task.roomNumber })} • {srv(room?.type ?? '')}</h2>
              <p className="text-body-sm text-on-surface-variant">{t('task.guest', { name: room?.stay?.guestName ?? '—' })}</p>
            </div>
            {room?.stay && <Badge dot>{t('task.activeStay')}</Badge>}
          </div>
          <div className="grid grid-cols-2 gap-md pt-sm border-t border-outline-variant/60">
            <div className="flex flex-col gap-xs">
              <span className="font-label text-label-sm text-on-surface-variant uppercase tracking-wider">{task.completedAt ? t('task.totalTime') : t('task.elapsed')}</span>
              <span className="font-mono text-mono-lg tabular-nums">{t('task.clock', { time: elapsed })}</span>
            </div>
            <div className="flex flex-col gap-xs items-end text-right">
              <span className="font-label text-label-sm text-on-surface-variant uppercase tracking-wider">{t('task.sla')}</span>
              <span className={`font-label text-label-lg tabular-nums ${overSla ? 'text-error' : 'text-primary'}`}>{t('task.slaTarget', { n: SLA_MINUTES })}</span>
            </div>
          </div>
        </article>

        <article className="card p-lg flex flex-col gap-md">
          <div className="flex items-center justify-between">
            <h2 className="font-title text-title-md">{t('task.checklist')}</h2>
            <span className="font-mono text-mono-sm text-on-surface-variant tabular-nums">{t('task.checkCount', { a: checked.length, b: items.length })}</span>
          </div>
          <ul className="flex flex-col gap-sm">
            {items.map((label, i) => (
              <li key={label}>
                <label className="flex items-center gap-md p-md rounded-md bg-surface-container-low cursor-pointer">
                  <input type="checkbox" checked={checked.includes(i)} onChange={() => toggle(i)} disabled={!canAct} className="w-5 h-5 rounded text-primary border-outline-variant focus:ring-primary" />
                  <span className="text-body-md">{label}</span>
                </label>
              </li>
            ))}
          </ul>
          {task.note && (
            <div className="flex items-start gap-sm p-md rounded-md bg-secondary-container border border-accent">
              <Icon name="info" className="text-title-md text-secondary shrink-0" />
              <p className="text-body-sm text-on-secondary-container text-pretty"><span className="font-semibold">{t('common.note')}:</span> {task.note}</p>
            </div>
          )}
          {lastReason && (
            <p className="text-body-sm text-on-surface-variant">
              <span className="font-semibold">{lastReason.status === 'cancelled' ? t('status.cancelled') : t('task.released')}:</span> {lastReason.reason}
              {lastReason.byName && ` — ${lastReason.byName}`}
            </p>
          )}
        </article>

        <article className="card p-lg flex flex-col gap-md">
          <h2 className="font-title text-title-sm">{t('task.liveStatus')}</h2>
          {task.status === 'cancelled' ? (
            <p className="text-body-sm text-error">{t('task.cancelledNote')}</p>
          ) : (
            <StepBar steps={[t('task.step.received'), t('task.step.claimed'), t('task.step.inProgress'), t('task.step.completed')]} current={STEP_OF[task.status] ?? 0} height="h-2" />
          )}
          <ol className="flex flex-col gap-xs text-body-sm text-on-surface-variant">
            {task.history.map((h, i) => (
              <li key={i} className="flex justify-between gap-sm">
                <span>
                  {t(`status.${h.status}`)}
                  {h.byName && ` · ${h.byName}`}
                </span>
                <span className="font-mono text-mono-sm tabular-nums">{timeOf(h.at)}</span>
              </li>
            ))}
          </ol>
        </article>

        <section aria-label={t('task.actions')} className="flex flex-col items-center gap-sm pt-xs">
          {actionError && (
            <p role="alert" className="w-full flex items-start gap-xs text-body-sm text-error">
              <Icon name="error" className="text-title-sm shrink-0 mt-[1px]" />
              {actionError}
            </p>
          )}

          {canClaim && (
            <button type="button" onClick={claim} disabled={!!busy} className="btn-primary w-full px-xl py-lg">
              <Icon name="lock" className="text-title-md" />
              {busy === 'claim' ? t('queue.claiming') : t('queue.claim')}
            </button>
          )}

          {canAct && (
            <>
              <button type="button" onClick={complete} disabled={!!busy} className="btn-primary w-full px-xl py-lg">
                <Icon name="check_circle" className="text-title-md" />
                {busy === 'complete' ? t('task.saving') : t('task.complete')}
              </button>
              <button
                type="button"
                onClick={release}
                disabled={!!busy}
                className="px-lg py-sm font-label text-label-md text-on-surface-variant hover:text-error transition-colors duration-state-change rounded-md"
              >
                {t('task.report')}
              </button>
            </>
          )}

          {task.status === 'in_progress' && !canAct && (
            <p className="text-body-sm text-on-surface-variant">{t('task.handledBy', { name: task.assignee?.name })}</p>
          )}

          {task.status === 'completed' && (
            <div className="w-full py-md px-lg rounded-md bg-success-container text-on-success-container font-label text-label-lg flex items-center justify-center gap-xs">
              <Icon name="done_all" className="text-title-md" />
              {t('task.doneBanner')}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
