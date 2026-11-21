import { useState } from 'react';
import { useAuth } from '../../auth.jsx';
import { BackButton, Badge, Icon } from '../../components/ui.jsx';

const SLOTS = ['10:00', '13:00', '16:00', '19:00'];
const AMENITIES = [
  { id: 'towels', label: 'Towels', icon: 'dry_cleaning' },
  { id: 'water', label: 'Bottled Water', icon: 'water_drop' },
  { id: 'toiletries', label: 'Toiletries', icon: 'spa' },
];

// TODO(feature/request-tracking): lấy timeline thật từ API
const timeline = (roomNumber) => [
  { title: 'Request Sent', sub: 'Clean Room Now + Towels & Water', time: '7:12 PM', state: 'done' },
  { title: 'Staff Assigned', sub: 'Maria L. • Floor 3 Attendant', time: '7:14 PM', state: 'done' },
  { title: 'In Progress', sub: `Attendant is servicing Room ${roomNumber}`, time: 'Now', state: 'current' },
  { title: 'Completed', sub: 'Estimated finish in 6 min', time: '~7:24 PM', state: 'todo' },
];

export default function Housekeeping() {
  const { room } = useAuth().session;
  const TIMELINE = timeline(room.number);
  const [cleanNow, setCleanNow] = useState(false);
  const [slot, setSlot] = useState(null);
  const [amenities, setAmenities] = useState([]);

  const toggleAmenity = (id) =>
    setAmenities((list) => (list.includes(id) ? list.filter((a) => a !== id) : [...list, id]));

  return (
    <div className="min-h-screen max-w-[390px] mx-auto flex flex-col pb-28">
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
        <section className="flex flex-col gap-md">
          <h2 className="sr-only">Housekeeping Requests</h2>

          {/* TODO(feature/housekeeping): POST /api/requests { type: 'housekeeping', ... } */}
          <button
            type="button"
            aria-pressed={cleanNow}
            onClick={() => setCleanNow((v) => !v)}
            className={`card p-lg flex items-center justify-between gap-md text-left transition-colors duration-state-change ${cleanNow ? '!border-primary' : ''}`}
          >
            <div className="flex items-center gap-md">
              <div className="w-11 h-11 rounded-md bg-primary-container/70 flex items-center justify-center shrink-0">
                <Icon name="cleaning_services" className="text-headline-md text-primary" />
              </div>
              <div className="flex flex-col gap-xs">
                <h3 className="font-title text-title-sm">Clean Room Now</h3>
                <p className="text-body-sm text-on-surface-variant">Immediate full suite refresh</p>
              </div>
            </div>
            <span className={`px-md py-xs rounded-full font-label text-label-sm ${cleanNow ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant'}`}>
              {cleanNow ? 'Requested' : 'Request'}
            </span>
          </button>

          <article className="card p-lg flex flex-col gap-md">
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
              {SLOTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={slot === s}
                  onClick={() => setSlot(s)}
                  className={`py-sm px-xs rounded-md font-mono text-mono-sm border transition-colors duration-state-change ${
                    slot === s ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-low text-on-surface-variant border-transparent hover:border-accent'
                  }`}
                >
                  {s}
                </button>
              ))}
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
            <span className="font-mono text-mono-sm text-secondary tabular-nums">ID #HK-{room.number}</span>
          </div>
          <article className="card p-xl">
            <ol className="flex flex-col">
              {TIMELINE.map((step, i) => {
                const last = i === TIMELINE.length - 1;
                const next = TIMELINE[i + 1];
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
                      <span className={`font-mono text-mono-sm tabular-nums ${step.state === 'current' ? 'text-secondary' : 'text-on-surface-variant'}`}>{step.time}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </article>
        </section>
      </main>
    </div>
  );
}
