import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Icon, Logo } from '../../components/ui.jsx';
import { useStaffAuth } from '../../staffAuth.jsx';

const homeFor = (department) => (department === 'reception' ? '/staff/rooms' : '/staff/tasks');

const ROLES = [
  { id: 'housekeeping', label: 'Housekeeping' },
  { id: 'kitchen', label: 'Kitchen / F&B' },
  { id: 'reception', label: 'Reception' },
];

export default function StaffLogin() {
  const [role, setRole] = useState('housekeeping');
  const [showPwd, setShowPwd] = useState(false);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { session, login: signIn, expired } = useStaffAuth();

  if (session?.token && !busy) return <Navigate to={homeFor(session.staff.department)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const staff = await signIn({ login, password, department: role });
      navigate(location.state?.from ?? homeFor(staff.department), { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen max-w-[390px] mx-auto px-page-margin py-2xl flex flex-col justify-between gap-xl">
      <nav aria-label="Portal navigation" className="flex items-center justify-between gap-md">
        <Link to="/" className="inline-flex items-center gap-xs px-md py-sm rounded-full bg-surface-container-lowest border border-outline-variant hover:bg-surface-container-low transition-colors duration-state-change">
          <Icon name="arrow_back" className="text-title-md text-primary" />
          <span className="font-label text-label-md">Guest Access</span>
        </Link>
        <span role="status" className="inline-flex items-center gap-xs px-md py-xs rounded-full bg-secondary-container text-on-secondary-container border border-accent">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary" aria-hidden="true" />
          <span className="font-label text-label-sm tracking-wider">STAFF ONLY</span>
        </span>
      </nav>

      <header className="flex flex-col items-center text-center gap-md">
        <Logo size={56} mark={30} />
        <div className="flex flex-col gap-xs">
          <h1 className="font-headline text-display-lg-mobile text-balance">Staff Duty Login</h1>
          <p className="text-body-md text-on-surface-variant text-pretty max-w-xs mx-auto">Sign in to manage room service &amp; housekeeping tasks</p>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center">
        <section className="card !border-outline-variant/70 p-xl flex flex-col gap-xl">
          <div className="flex flex-col gap-sm">
            <span className="font-label text-label-md">Department Role</span>
            <div className="flex items-center gap-xs flex-wrap" role="radiogroup" aria-label="Staff department role">
              {ROLES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={role === r.id}
                  onClick={() => setRole(r.id)}
                  className={`px-md py-sm rounded-full font-label text-label-md transition-colors duration-state-change ${
                    role === r.id ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant border border-outline-variant hover:border-accent'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-lg">
            <label className="flex flex-col gap-xs">
              <span className="font-label text-label-md">Staff ID or Email</span>
              <input type="text" required value={login} onChange={(e) => setLogin(e.target.value)} placeholder="e.g., HK-04 or staff@apphotel.vn" autoComplete="username" className="input" />
            </label>
            <label className="flex flex-col gap-xs">
              <span className="font-label text-label-md">Password</span>
              <div className="relative flex items-center">
                <input type={showPwd ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your shift password" autoComplete="current-password" className="input !pr-3xl" />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                  className="absolute right-sm w-9 h-9 rounded-full inline-flex items-center justify-center text-on-surface-variant hover:text-on-surface"
                >
                  <Icon name={showPwd ? 'visibility_off' : 'visibility'} className="text-title-md" />
                </button>
              </div>
            </label>
            {(error || expired) && (
              <p role="alert" className="flex items-start gap-xs text-body-sm text-error">
                <Icon name="error" className="text-title-sm shrink-0 mt-[1px]" />
                {error || 'Your shift session ended. Please sign in again.'}
              </p>
            )}
            <button type="submit" disabled={busy} className="btn-primary w-full px-xl py-lg">
              {busy ? 'Signing in…' : 'Sign In to Shift'}
            </button>
          </form>
        </section>
      </main>

      <footer className="text-center pb-sm">
        <span className="font-label text-label-md text-primary">Forgot Password? Contact Manager</span>
      </footer>
    </div>
  );
}
