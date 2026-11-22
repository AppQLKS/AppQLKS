import { Link } from 'react-router-dom';
import { useAuth } from '../../auth.jsx';
import { useRoomRequests } from '../../useRoomRequests.js';
import { Badge, Icon, Logo, StepBar } from '../../components/ui.jsx';
import { LanguageSwitch, useI18n } from '../../i18n.jsx';

const services = [
  { to: '/dining', key: 'dining', icon: 'room_service', tone: 'secondary' },
  { to: '/housekeeping', key: 'housekeeping', icon: 'cleaning_services', tone: 'primary' },
  { to: '/concierge', key: 'concierge', icon: 'auto_awesome', tone: 'secondary' },
  { to: '/checkout', key: 'checkout', icon: 'receipt_long', tone: 'primary' },
];

const STEP_OF = { pending: 0, in_progress: 2, completed: 4 }; // 4 = mọi bước đã xong

const greetingKey = () => {
  const h = new Date().getHours();
  return h < 12 ? 'home.morning' : h < 18 ? 'home.afternoon' : 'home.evening';
};

export default function Home() {
  const { session, logout } = useAuth();
  const { t, srv } = useI18n();
  const requests = useRoomRequests() ?? [];
  // Ưu tiên yêu cầu đang mở; nếu không có thì hiện yêu cầu vừa xong (trong 10 phút) để khách thấy kết quả
  const recentlyDone = (r) => r.status === 'completed' && Date.now() - new Date(r.completedAt).getTime() < 10 * 60_000;
  const active =
    requests.find((r) => r.status === 'pending' || r.status === 'in_progress') ?? requests.find(recentlyDone) ?? null;

  const { room, guest } = session;
  const firstName = guest.name.split(' ')[0];

  return (
    <div className="min-h-screen max-w-[390px] mx-auto flex flex-col pb-24">
      <header className="px-page-margin pt-2xl pb-lg flex flex-col gap-md">
        <div className="flex items-center justify-between gap-md">
          <div className="flex items-center gap-sm">
            <Logo size={36} mark={20} showBar={false} />
            <span className="font-title text-title-sm">AppHotel</span>
          </div>
          <div className="flex items-center gap-sm">
            <LanguageSwitch />
            <button
              type="button"
              onClick={logout}
              aria-label={t('common.signOutDevice')}
              title={t('common.signOut')}
              className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-surface-container-lowest border border-outline-variant text-on-surface-variant hover:text-on-surface transition-colors duration-state-change"
            >
              <Icon name="logout" className="text-title-md" />
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-xs pt-xs">
          <div className="flex items-center justify-between gap-sm">
            <p className="font-label text-label-md text-secondary">{t(greetingKey())}, {firstName}</p>
            <Badge dot>{t('home.activeStay')}</Badge>
          </div>
          <h1 className="font-headline text-display-lg-mobile">
            {t('home.roomTitle', { n: room.number, type: srv(room.type) })}
          </h1>
        </div>
      </header>

      <main className="px-page-margin flex flex-col gap-section flex-1">
        <section aria-labelledby="services-heading" className="flex flex-col gap-md">
          <h2 id="services-heading" className="font-title text-title-md">{t('home.services')}</h2>
          <div className="grid grid-cols-2 gap-md items-stretch">
            {services.map((s) => (
              <Link key={s.key} to={s.to} className="card h-full p-lg hover:border-accent transition-colors duration-state-change flex flex-col justify-between gap-lg">
                <div className={`w-11 h-11 rounded-md flex items-center justify-center ${s.tone === 'secondary' ? 'bg-secondary-container' : 'bg-primary-container/60'}`}>
                  <Icon name={s.icon} className={`text-headline-md ${s.tone === 'secondary' ? 'text-secondary' : 'text-primary'}`} />
                </div>
                <div className="flex flex-col gap-xs">
                  <h3 className="font-title text-title-sm text-balance">{t(`home.svc.${s.key}`)}</h3>
                  <p className="text-body-sm text-on-surface-variant">{t(`home.svc.${s.key}Sub`)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="tracker-heading" className="flex flex-col gap-md">
          <h2 id="tracker-heading" className="font-title text-title-md">{t('home.tracker')}</h2>
          {active ? (
            <article className="card p-lg flex flex-col gap-lg">
              <header className="flex items-start justify-between gap-md">
                <div className="flex items-center gap-md">
                  <div className="w-10 h-10 rounded-full bg-primary-container/60 flex items-center justify-center shrink-0">
                    <Icon name={active.type === 'food' ? 'room_service' : 'dry_cleaning'} className="text-title-lg text-primary" />
                  </div>
                  <div className="flex flex-col gap-xs">
                    <h3 className="font-title text-title-sm">{srv(active.title)}</h3>
                    <p className="text-body-sm text-on-surface-variant">
                      {active.assignee ? t('home.assignedTo', { name: active.assignee.name }) : t('home.waitingStaff')} • {t('common.room', { n: active.roomNumber })}
                    </p>
                  </div>
                </div>
                <Badge tone={active.status === 'completed' ? 'success' : 'accent'}>{t(`home.badge.${active.status}`)}</Badge>
              </header>
              <StepBar steps={[t('home.step.sent'), t('home.step.assigned'), t('home.step.onWay'), t('home.step.done')]} current={STEP_OF[active.status] ?? 0} />
            </article>
          ) : (
            <div className="card p-lg text-body-sm text-on-surface-variant">{t('home.noActive')}</div>
          )}
        </section>
      </main>
    </div>
  );
}
