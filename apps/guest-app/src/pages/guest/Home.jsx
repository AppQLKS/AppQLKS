import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, DEMO_ROOM } from '../../api.js';
import { Badge, Icon, Logo, StepBar } from '../../components/ui.jsx';

const services = [
  { to: '/dining', title: 'Room Service & Dining', sub: 'All-day in-suite menu', icon: 'room_service', tone: 'secondary' },
  { to: '/housekeeping', title: 'Housekeeping', sub: 'Cleaning & amenities', icon: 'cleaning_services', tone: 'primary' },
  { to: '/concierge', title: 'AI Concierge', sub: 'Local tips & quick orders', icon: 'auto_awesome', tone: 'secondary' },
  { to: '/concierge#checkout', title: 'Express Checkout', sub: 'View charges & depart', icon: 'receipt_long', tone: 'primary' },
];

const STEP_OF = { pending: 0, in_progress: 2, completed: 3 };

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening';
};

export default function Home() {
  const [room, setRoom] = useState(null);
  const [active, setActive] = useState(null);

  useEffect(() => {
    // TODO(feature/guest-auth-room-code): lấy phòng từ phiên đăng nhập thay vì DEMO_ROOM
    api(`/rooms/${DEMO_ROOM}`).then(setRoom).catch(() => {});
    // TODO(feature/request-tracking): cập nhật realtime
    api(`/requests?room=${DEMO_ROOM}`)
      .then((list) => setActive(list.find((r) => r.status !== 'completed' && r.status !== 'cancelled') ?? null))
      .catch(() => {});
  }, []);

  const firstName = room?.stay?.guestName?.split(' ')[0] ?? 'Guest';

  return (
    <div className="min-h-screen max-w-[390px] mx-auto flex flex-col pb-24">
      <header className="px-page-margin pt-2xl pb-lg flex flex-col gap-md">
        <div className="flex items-center justify-between gap-md">
          <div className="flex items-center gap-sm">
            <Logo size={36} mark={20} showBar={false} />
            <span className="font-title text-title-sm">AppHotel</span>
          </div>
          <Badge dot>Active Stay</Badge>
        </div>
        <div className="flex flex-col gap-xs pt-xs">
          <p className="font-label text-label-md text-secondary">{greeting()}, {firstName}</p>
          <h1 className="font-headline text-display-lg-mobile">
            Room {DEMO_ROOM} • {room?.type ?? '…'}
          </h1>
        </div>
      </header>

      <main className="px-page-margin flex flex-col gap-section flex-1">
        <section aria-labelledby="services-heading" className="flex flex-col gap-md">
          <h2 id="services-heading" className="font-title text-title-md">Suite Services</h2>
          <div className="grid grid-cols-2 gap-md items-stretch">
            {services.map((s) => (
              <Link key={s.title} to={s.to} className="card h-full p-lg hover:border-accent transition-colors duration-state-change flex flex-col justify-between gap-lg">
                <div className={`w-11 h-11 rounded-md flex items-center justify-center ${s.tone === 'secondary' ? 'bg-secondary-container' : 'bg-primary-container/60'}`}>
                  <Icon name={s.icon} className={`text-headline-md ${s.tone === 'secondary' ? 'text-secondary' : 'text-primary'}`} />
                </div>
                <div className="flex flex-col gap-xs">
                  <h3 className="font-title text-title-sm text-balance">{s.title}</h3>
                  <p className="text-body-sm text-on-surface-variant">{s.sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="tracker-heading" className="flex flex-col gap-md">
          <h2 id="tracker-heading" className="font-title text-title-md">Active Request Tracker</h2>
          {active ? (
            <article className="card p-lg flex flex-col gap-lg">
              <header className="flex items-start justify-between gap-md">
                <div className="flex items-center gap-md">
                  <div className="w-10 h-10 rounded-full bg-primary-container/60 flex items-center justify-center shrink-0">
                    <Icon name={active.type === 'food' ? 'room_service' : 'dry_cleaning'} className="text-title-lg text-primary" />
                  </div>
                  <div className="flex flex-col gap-xs">
                    <h3 className="font-title text-title-sm">{active.title}</h3>
                    <p className="text-body-sm text-on-surface-variant">
                      {active.assignee ? `Assigned to ${active.assignee.name}` : 'Waiting for staff'} • Room {active.roomNumber}
                    </p>
                  </div>
                </div>
                <Badge tone="accent">{active.status === 'pending' ? 'Sent' : 'In Progress'}</Badge>
              </header>
              <StepBar steps={['Sent', 'Assigned', 'On Way', 'Done']} current={STEP_OF[active.status] ?? 0} />
            </article>
          ) : (
            <div className="card p-lg text-body-sm text-on-surface-variant">No active requests right now.</div>
          )}
        </section>
      </main>
    </div>
  );
}
