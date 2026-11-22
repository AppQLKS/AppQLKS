import { useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { useRoomRequests } from '../../useRoomRequests.js';
import { BackButton, Badge, Icon } from '../../components/ui.jsx';
import { useI18n } from '../../i18n.jsx';

const SLOTS = ['10:00', '13:00', '16:00', '19:00'];
const AMENITIES = [
  { id: 'towels', label: 'hk.amenity.towels', icon: 'dry_cleaning' },
  { id: 'water', label: 'hk.amenity.water', icon: 'water_drop' },
  { id: 'toiletries', label: 'hk.amenity.toiletries', icon: 'spa' },
];
const MAX_NOTE = 200;
const HK_TYPES = ['housekeeping', 'amenity'];

/** 'common.today' | 'common.tomorrow' cho lịch hẹn. */
const dayKey = (iso) => (new Date(iso).toDateString() === new Date().toDateString() ? 'common.today' : 'common.tomorrow');

/** Các bước theo dõi dựng từ trạng thái + lịch sử của yêu cầu. */
function stepsFor(req, { t, fmtTime: timeOf, srv }) {
  const done = req.status === 'completed';
  const working = req.status === 'in_progress';
  const state = (reached, current) => (reached ? 'done' : current ? 'current' : 'todo');
  const claimedAt = working || done ? req.claimedAt : null;
  return [
    {
      title: t('hk.step.sent'),
      sub: req.items.map((i) => (i.qty > 1 ? `${i.qty}× ${srv(i.name)}` : srv(i.name))).join(' + '),
      time: timeOf(req.createdAt),
      state: 'done',
    },
    {
      title: req.scheduledFor && !req.assignee ? t('hk.step.scheduled') : t('hk.step.assigned'),
      sub: req.assignee
        ? t('hk.step.attendant', { name: req.assignee.name, floor: req.roomNumber[0] })
        : req.scheduledFor
          ? t('hk.step.at', { day: t(dayKey(req.scheduledFor)), time: timeOf(req.scheduledFor) })
          : t('hk.step.waiting'),
      time: claimedAt ? timeOf(claimedAt) : '',
      state: state(!!req.assignee || done, !req.assignee && !done),
    },
    {
      title: t('hk.step.inProgress'),
      sub: working || done ? t('hk.step.servicing', { n: req.roomNumber }) : t('hk.step.startsSoon'),
      time: working ? t('common.now') : '',
      state: state(done, working),
    },
    {
      title: t('hk.step.completed'),
      sub: done ? t('hk.step.allDone') : t('hk.step.notify'),
      time: done && req.completedAt ? timeOf(req.completedAt) : '',
      state: done ? 'done' : 'todo',
    },
  ];
}

function Timeline({ steps }) {
  return (
    <ol className="flex flex-col">
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        const next = steps[i + 1];
        return (
          <li key={i} className="flex items-stretch gap-md">
            <div className="flex flex-col items-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                  step.state === 'done'
                    ? 'bg-primary text-on-primary'
                    : step.state === 'current'
                      ? 'bg-accent text-on-accent ring-4 ring-secondary-container'
                      : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                <Icon name={step.state === 'done' ? 'check' : step.state === 'current' ? 'autorenew' : 'done_all'} className="text-label-lg" />
              </div>
              {!last && (
                <div className={`w-0.5 flex-1 my-xs min-h-[24px] ${next.state === 'done' ? 'bg-primary' : next.state === 'current' ? 'bg-accent' : 'bg-outline-variant'}`} />
              )}
            </div>
            <div className={`flex-1 flex items-start justify-between gap-sm ${last ? '' : 'pb-lg'}`}>
              <div className="flex flex-col gap-xs">
                <span className={`font-title text-title-sm ${step.state === 'todo' ? 'text-on-surface-variant' : ''}`}>{step.title}</span>
                <span className={`text-body-sm ${step.state === 'current' ? 'text-secondary' : 'text-on-surface-variant'}`}>{step.sub}</span>
              </div>
              <span className={`font-mono text-mono-sm tabular-nums whitespace-nowrap ${step.state === 'current' ? 'text-secondary' : 'text-on-surface-variant'}`}>{step.time}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default function Housekeeping() {
  const { room } = useAuth().session;
  const i18n = useI18n();
  const { t, srv, fmtTime } = i18n;
  const [service, setService] = useState(null); // 'clean_now' | 'scheduled' | null
  const [slot, setSlot] = useState(null);
  const [amenities, setAmenities] = useState([]);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(null);
  // Yêu cầu buồng phòng mới nhất, tự cập nhật realtime (bỏ qua yêu cầu đã huỷ)
  const requests = useRoomRequests() ?? [];
  const latest = requests.find((r) => HK_TYPES.includes(r.type) && r.status !== 'cancelled') ?? null;

  const cleaningOpen = latest?.type === 'housekeeping' && ['pending', 'in_progress'].includes(latest.status);
  const hasSelection = service || amenities.length > 0;

  const toggleCleanNow = () => {
    setError('');
    setSent(null);
    setService((s) => (s === 'clean_now' ? null : 'clean_now'));
    setSlot(null);
  };
  const pickSlot = (s) => {
    setError('');
    setSent(null);
    const same = service === 'scheduled' && slot === s;
    setService(same ? null : 'scheduled');
    setSlot(same ? null : s);
  };
  const toggleAmenity = (id) => {
    setError('');
    setSent(null);
    setAmenities((list) => (list.includes(id) ? list.filter((a) => a !== id) : [...list, id]));
  };

  const send = async () => {
    setSending(true);
    setError('');
    try {
      const req = await api('/me/requests', {
        method: 'POST',
        body: JSON.stringify({ type: 'housekeeping', service, slot, amenities, note }),
      });
      setSent(req); // danh sách tự cập nhật qua luồng realtime
      setService(null);
      setSlot(null);
      setAmenities([]);
      setNote('');
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const summary = [
    service === 'clean_now' && t('hk.summary.cleanNow'),
    service === 'scheduled' && t('hk.summary.cleanAt', { slot }),
    ...amenities.map((a) => t(AMENITIES.find((x) => x.id === a).label)),
  ].filter(Boolean);

  return (
    <div className={`min-h-screen max-w-[390px] mx-auto flex flex-col ${hasSelection ? 'pb-48' : 'pb-2xl'}`}>
      <header className="px-page-margin pt-2xl pb-md flex items-center justify-between gap-md">
        <div className="flex items-center gap-md">
          <BackButton to="/home" />
          <div className="flex flex-col">
            <h1 className="font-headline text-headline-md">{t('hk.title')}</h1>
            <span className="text-body-sm text-on-surface-variant">{t('common.room', { n: room.number })} • {srv(room.type)}</span>
          </div>
        </div>
        <Badge dot>{t('hk.onDuty')}</Badge>
      </header>

      <main className="px-page-margin flex flex-col gap-xl">
        {sent && (
          <div role="status" className="flex items-start gap-sm p-md rounded-md bg-success-container text-on-success-container">
            <Icon name="check_circle" filled className="text-title-md shrink-0" />
            <p className="text-body-sm">
              {t('hk.sent', { id: `#${sent.id}` })}{' '}
              {sent.etaMinutes
                ? t('hk.sentEta', { n: sent.etaMinutes })
                : sent.scheduledFor
                  ? t('hk.sentScheduled', { day: t(dayKey(sent.scheduledFor)).toLowerCase(), time: fmtTime(sent.scheduledFor) })
                  : ''}
            </p>
          </div>
        )}

        <section className="flex flex-col gap-md">
          <h2 className="sr-only">{t('hk.requests')}</h2>

          <button
            type="button"
            aria-pressed={service === 'clean_now'}
            disabled={cleaningOpen}
            onClick={toggleCleanNow}
            className={`card p-lg flex items-center justify-between gap-md text-left transition-colors duration-state-change disabled:opacity-70 ${service === 'clean_now' || cleaningOpen ? '!border-primary' : ''}`}
          >
            <div className="flex items-center gap-md">
              <div className="w-11 h-11 rounded-md bg-primary-container/70 flex items-center justify-center shrink-0">
                <Icon name="cleaning_services" className="text-headline-md text-primary" />
              </div>
              <div className="flex flex-col gap-xs">
                <h3 className="font-title text-title-sm">{t('hk.cleanNow')}</h3>
                <p className="text-body-sm text-on-surface-variant">{cleaningOpen ? t('hk.onItsWay', { id: `#${latest.id}` }) : t('hk.cleanNowSub')}</p>
              </div>
            </div>
            <span className={`px-md py-xs rounded-full font-label text-label-sm shrink-0 ${service === 'clean_now' || cleaningOpen ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant'}`}>
              {cleaningOpen ? t('hk.requested') : service === 'clean_now' ? t('hk.selected') : t('hk.select')}
            </span>
          </button>

          <article className={`card p-lg flex flex-col gap-md ${cleaningOpen ? 'opacity-70' : ''}`}>
            <div className="flex items-center gap-md">
              <div className="w-11 h-11 rounded-md bg-secondary-container flex items-center justify-center shrink-0">
                <Icon name="schedule" className="text-headline-md text-secondary" />
              </div>
              <div className="flex flex-col gap-xs">
                <h3 className="font-title text-title-sm">{t('hk.schedule')}</h3>
                <p className="text-body-sm text-on-surface-variant">{t('hk.scheduleSub')}</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-xs" role="radiogroup" aria-label={t('hk.slots')}>
              {SLOTS.map((s) => {
                const on = service === 'scheduled' && slot === s;
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={cleaningOpen}
                    onClick={() => pickSlot(s)}
                    className={`py-sm px-xs rounded-md font-mono text-mono-sm border transition-colors duration-state-change ${
                      on ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-low text-on-surface-variant border-transparent hover:border-accent'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </article>

          <article className="card p-lg flex flex-col gap-md">
            <div className="flex items-center justify-between">
              <h3 className="font-title text-title-sm">{t('hk.amenities')}</h3>
              <span className="text-body-sm text-on-surface-variant">{t('hk.tapToAdd')}</span>
            </div>
            <div className="grid grid-cols-3 gap-sm">
              {AMENITIES.map((a) => {
                const on = amenities.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleAmenity(a.id)}
                    className={`flex flex-col items-center gap-xs p-md rounded-md border transition-colors duration-state-change ${
                      on ? 'bg-primary-container/50 border-primary text-on-primary-container' : 'bg-surface-container-low border-outline-variant text-on-surface-variant'
                    }`}
                  >
                    <Icon name={a.icon} className="text-title-lg" />
                    <span className="font-label text-label-sm">{t(a.label)}</span>
                  </button>
                );
              })}
            </div>
          </article>
        </section>

        <section aria-labelledby="live-status-heading" className="flex flex-col gap-md">
          <div className="flex items-center justify-between">
            <h2 id="live-status-heading" className="font-title text-title-md">{t('hk.tracker')}</h2>
            {latest && <span className="font-mono text-mono-sm text-secondary tabular-nums">ID #{latest.id}</span>}
          </div>
          {latest ? (
            <article className="card p-xl">
              <Timeline steps={stepsFor(latest, i18n)} />
            </article>
          ) : (
            <div className="card p-lg text-body-sm text-on-surface-variant">{t('hk.none')}</div>
          )}
        </section>
      </main>

      {hasSelection && (
        <aside aria-label={t('hk.panel')} className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-surface-container-lowest border-t border-outline-variant shadow-lg px-page-margin pt-md pb-xl z-20 flex flex-col gap-md">
          <div className="flex items-center gap-sm">
            <Icon name="edit_note" className="text-title-md text-secondary shrink-0" />
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={MAX_NOTE}
              aria-label={t('hk.noteAria')}
              placeholder={t('hk.notePlaceholder')}
              className="w-full px-md py-sm rounded-md bg-surface-container-low border border-outline-variant text-body-sm placeholder:text-on-surface-variant focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          {error && (
            <p role="alert" className="flex items-start gap-xs text-body-sm text-error">
              <Icon name="error" className="text-title-sm shrink-0 mt-[1px]" />
              {error}
            </p>
          )}
          <div className="flex items-center justify-between gap-md">
            <p className="text-body-sm text-on-surface-variant min-w-0 truncate">{summary.join(' • ')}</p>
            <button type="button" onClick={send} disabled={sending} className="btn-primary px-xl py-md shrink-0">
              {sending ? t('common.sending') : t('hk.sendRequest')}
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}
