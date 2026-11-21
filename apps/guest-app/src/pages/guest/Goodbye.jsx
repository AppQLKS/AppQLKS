import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth.jsx';
import { Icon, Logo, money } from '../../components/ui.jsx';

/** Trang cảm ơn sau khi lễ tân duyệt trả phòng. */
export default function Goodbye() {
  const { farewell, dismissFarewell } = useAuth();
  const navigate = useNavigate();
  if (!farewell) return <Navigate to="/" replace />;

  const firstName = farewell.guestName?.split(' ')[0] ?? 'Guest';
  const done = () => {
    dismissFarewell();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen max-w-[390px] mx-auto px-page-margin py-3xl flex flex-col justify-center items-center text-center gap-xl">
      <Logo />
      <div className="flex flex-col gap-sm">
        <span className="font-label text-label-md text-secondary uppercase tracking-widest">Checked Out</span>
        <h1 className="font-headline text-display-lg-mobile text-balance">Thank you for staying with us, {firstName}</h1>
        <p className="text-body-md text-on-surface-variant text-pretty">
          Room {farewell.roomNumber} is checked out and your door code has been deactivated. Safe travels!
        </p>
      </div>
      {farewell.total !== undefined && (
        <article className="card w-full p-lg flex items-center justify-between">
          <span className="font-title text-title-sm">Room service total</span>
          <span className="font-headline text-headline-md tabular-nums">{money(farewell.total)}</span>
        </article>
      )}
      <button type="button" onClick={done} className="btn-outline w-full px-xl py-md">
        <Icon name="home" className="text-title-md" />
        Done
      </button>
    </div>
  );
}
