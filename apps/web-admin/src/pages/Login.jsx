import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../components/ui.jsx';
import { useStaff } from '../staff.jsx';

export default function Login() {
  const { session, login, expired } = useStaff();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  if (session?.token && !busy) return <Navigate to="/rooms" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(id, password);
      navigate(location.state?.from ?? '/rooms', { replace: true });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sidebar-surface px-4">
      <div className="w-full max-w-sm flex flex-col gap-section">
        <div className="flex items-center gap-gutter-md text-on-brand-slate">
          <div className="w-10 h-10 rounded bg-primary flex items-center justify-center shrink-0">
            <Icon name="apartment" className="text-[22px] text-on-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-title-md">AppHotel</span>
            <span className="text-label-sm text-sidebar-muted">Admin &amp; Staff Portal</span>
          </div>
        </div>

        <form onSubmit={submit} className="panel p-gutter-xl flex flex-col gap-gutter-lg">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-headline-lg">Sign in to your shift</h1>
            <p className="text-body-sm text-on-surface-variant">Reception, kitchen, housekeeping and managers.</p>
          </div>

          {(error || expired) && (
            <p role="alert" className="flex items-start gap-2 p-gutter-md rounded bg-error-tint text-on-error-tint text-body-sm">
              <Icon name="error" className="text-[18px] shrink-0" />
              {error || 'Your session ended. Please sign in again.'}
            </p>
          )}

          <label className="flex flex-col gap-1">
            <span className="text-label-md">Staff ID or Email</span>
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              required
              autoFocus
              autoComplete="username"
              placeholder="e.g., RC-01 or maya@apphotel.vn"
              className="w-full rounded border-outline bg-surface text-body-md focus:border-primary focus:ring-primary"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-label-md">Password</span>
            <div className="relative flex items-center">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded border-outline bg-surface text-body-md pr-10 focus:border-primary focus:ring-primary"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                aria-label={showPwd ? 'Hide password' : 'Show password'}
                className="absolute right-1 w-8 h-8 inline-flex items-center justify-center rounded text-on-surface-variant hover:text-on-surface"
              >
                <Icon name={showPwd ? 'visibility_off' : 'visibility'} className="text-[18px]" />
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded bg-primary text-on-primary hover:bg-on-blue-tint disabled:opacity-60 transition-colors duration-state-change"
          >
            <Icon name="login" className="text-[18px]" />
            <span className="text-label-lg">{busy ? 'Signing in…' : 'Sign In'}</span>
          </button>
        </form>
        <p className="text-center text-label-md text-sidebar-muted">Forgot your password? Contact your manager.</p>
      </div>
    </div>
  );
}
