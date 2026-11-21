import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { BackButton, Badge, Icon } from '../../components/ui.jsx';

const SLOTS = ['10:00', '13:00', '16:00', '19:00'];
const AMENITIES = [
  { id: 'towels', label: 'Towels', icon: 'dry_cleaning' },
  { id: 'water', label: 'Bottled Water', icon: 'water_drop' },
  { id: 'toiletries', label: 'Toiletries', icon: 'spa' },
];
const MAX_NOTE = 200;
const HK_TYPES = ['housekeeping', 'amenity'];

const timeOf = (iso) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const dayOf = (iso) => {
  const d = new Date(iso);
  const today = new Date();
  return d.toDateString() === today.toDateString() ? 'Today' : 'Tomorrow';
};

/** Các bước theo dõi dựng từ trạng thái yêu cầu. */
function stepsFor(req) {
  const done = req.status === 'completed';
  const working = req.status === 'in_progress' || done;
  const state = (reached, current) => (reached ? 'done' : current ? 'current' : 'todo');
  return [
    {
      title: 'Request Sent',
      sub: req.items.map((i) => (i.qty > 1 ? `${i.qty}× ${i.name}` : i.name)).join(' + '),
      time: timeOf(req.createdAt),
      state: 'done',
    },
    {
      title: req.scheduledFor ? 'Scheduled' : 'Staff Assigned',
      sub: req.assignee ? `${req.assignee.name} • Floor ${req.roomNumber[0]} Attendant` : req.scheduledFor ? `${dayOf(req.scheduledFor)} at ${timeOf(req.scheduledFor)}` : 'Waiting for an attendant',
      time: '',
      state: state(!!req.assignee, !req.assignee),
    },
    {
      title: 'In Progress',
      sub: working ? `Attendant is servicing Room ${req.roomNumber}` : 'Starts when the attendant arrives',
      time: req.status === 'in_progress' ? 'Now' : '',
      state: state(done, req.status === 'in_progress'),
    },
    { title: 'Completed', sub: done ? 'All done — enjoy your suite' : 'We will notify you', time: '', state: done ? 'done' : 'todo' },
  ];
}

function Timeline({ steps }) {
  return (
    <ol className="flex flex-col">
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        const next = steps[i + 1];
        return (
          <li key={step.title} className="flex items-stretch gap-md">
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
  const [service, setService] = useState(null); // 'clean_now' | 'scheduled' | null
  const [slot, setSlot] = useState(null);
  const [amenities, setAmenities] = useState([]);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(null);
  const [latest, setLatest] = useState(null);

  const loadLatest = useCallback(() => {
    // TODO(feature/request-tracking): cập nhật realtime thay vì tải khi mở trang
    api('/me/requests')
      .then((list) => setLatest(list.find((r) => HK_TYPES.includes(r.type)) ?? null))
      .catch(() => {});
  }, []);

  useEffect(loadLatest, [loadLatest]);

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
      setSent(req);
      setLatest(req);
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
    service === 'clean_now' && 'Clean now',
    service === 'scheduled' && `Cleaning at ${slot}`,
    ...amenities.map((a) => AMENITIES.find((x) => x.id === a).label),
  ].filter(Boolean);

  return (
    <div className={`min-h-screen max-w-[390px] mx-auto flex flex-col ${hasSelection ? 'pb-48' : 'pb-2xl'}`}>
      <header className="px-page-margin pt-2xl pb-md flex items-center justify-between gap-md">
        <div className="flex items-center gap-md">
          <BackButton to="/home" />
          <div className="flex flex-col">
            <h1 className="font-headline text-headline-md">Housekeeping</h1>
            <span className="text-body-sm text-on-surface-variant">Room {room.number} • {room.type}</span>
          </div>
        </div>
        <Badge dot>On Duty</Badge>
      </header>

      <main className="px-page-margin flex flex-col gap-xl">
        {sent && (
          <div role="status" className="flex items-start gap-sm p-md rounded-md bg-success-container text-on-success-container">
            <Icon name="check_circle" filled className="text-title-md shrink-0" />
            <p className="text-body-sm">
              Request <span className="font-mono">#{sent.id}</span> sent.{' '}
              {sent.etaMinutes ? `An attendant will be with you in about ${sent.etaMinutes} min.` : sent.scheduledFor ? `See you ${dayOf(sent.scheduledFor).toLowerCase()} at ${timeOf(sent.scheduledFor)}.` : ''}
            </p>
          </div>
        )}

        <section className="flex flex-col gap-md">
          <h2 className="sr-only">Housekeeping Requests</h2>

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
                <h3 className="font-title text-title-sm">Clean Room Now</h3>
                <p className="text-body-sm text-on-surface-variant">{cleaningOpen ? `On its way (#${latest.id})` : 'Immediate full suite refresh'}</p>
              </div>
            </div>
            <span className={`px-md py-xs rounded-full font-label text-label-sm shrink-0 ${service === 'clean_now' || cleaningOpen ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant'}`}>
              {cleaningOpen ? 'Requested' : service === 'clean_now' ? 'Selected' : 'Select'}
            </span>
          </button>

          <article className={`card p-lg flex flex-col gap-md ${cleaningOpen ? 'opacity-70' : ''}`}>
            <div className="flex items-center gap-md">
              <div className="w-11 h-11 rounded-md bg-secondary-container flex items-center justify-center shrink-0">
                <Icon name="schedule" className="text-headline-md text-secondary" />
              </div>
              <div className="flex flex-col gap-xs">
                <h3 className="font-title text-title-sm">Schedule Cleaning</h3>
                <p className="text-body-sm text-on-surface-variant">Pick a preferred arrival window</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-xs" role="radiogroup" aria-label="Cleaning time slots">
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
              <h3 className="font-title text-title-sm">Extra Amenities</h3>
              <span className="text-body-sm text-on-surface-variant">Tap to add</span>
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
                    <span className="font-label text-label-sm">{a.label}</span>
                  </button>
                );
              })}
            </div>
          </article>
        </section>

        <section aria-labelledby="live-status-heading" className="flex flex-col gap-md">
          <div className="flex items-center justify-between">
            <h2 id="live-status-heading" className="font-title text-title-md">Live Status Tracker</h2>
            {latest && <span className="font-mono text-mono-sm text-secondary tabular-nums">ID #{latest.id}</span>}
          </div>
          {latest ? (
            <article className="card p-xl">
              <Timeline steps={stepsFor(latest)} />
            </article>
          ) : (
            <div className="card p-lg text-body-sm text-on-surface-variant">No housekeeping requests yet.</div>
          )}
        </section>
      </main>

      {hasSelection && (
        <aside aria-label="Housekeeping request" className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-surface-container-lowest border-t border-outline-variant shadow-lg px-page-margin pt-md pb-xl z-20 flex flex-col gap-md">
          <div className="flex items-center gap-sm">
            <Icon name="edit_note" className="text-title-md text-secondary shrink-0" />
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={MAX_NOTE}
              aria-label="Note for the attendant"
              placeholder="Note (e.g. eco-friendly, baby sleeping)"
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
              {sending ? 'Sending…' : 'Send Request'}
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}
