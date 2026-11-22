import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Icon, Logo } from '../../components/ui.jsx';
import { useStaffAuth } from '../../staffAuth.jsx';
import { LanguageSwitch, useI18n } from '../../i18n.jsx';

// Lỗi từ server (tiếng Anh) -> key bản dịch theo mã HTTP
const ERROR_KEYS = { 400: 'staffLogin.error.required', 401: 'staffLogin.error.invalid', 403: 'staffLogin.error.department', 429: 'staffLogin.error.locked' };

const homeFor = (department) => (department === 'reception' ? '/staff/rooms' : '/staff/tasks');

const ROLES = [
  { id: 'housekeeping', label: 'dept.housekeeping' },
  { id: 'kitchen', label: 'dept.kitchen' },
  { id: 'reception', label: 'dept.reception' },
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
  const { t } = useI18n();

  if (session?.token && !busy) return <Navigate to={homeFor(session.staff.department)} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const staff = await signIn({ login, password, department: role });
      navigate(location.state?.from ?? homeFor(staff.department), { replace: true });
    } catch (err) {
      setError(ERROR_KEYS[err.status] ?? (err.status ? err.message : 'login.error.network'));
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen max-w-[390px] mx-auto px-page-margin py-2xl flex flex-col justify-between gap-xl">
      <nav aria-label="Portal navigation" className="flex items-center justify-between gap-md">
        <Link to="/" className="inline-flex items-center gap-xs px-md py-sm rounded-full bg-surface-container-lowest border border-outline-variant hover:bg-surface-container-low transition-colors duration-state-change">
          <Icon name="arrow_back" className="text-title-md text-primary" />
          <span className="font-label text-label-md">{t('staffLogin.guestAccess')}</span>
        </Link>
        <LanguageSwitch />
      </nav>

      <header className="flex flex-col items-center text-center gap-md">
        <Logo size={56} mark={30} />
        <span className="inline-flex items-center gap-xs px-md py-xs rounded-full bg-secondary-container text-on-secondary-container border border-accent">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary" aria-hidden="true" />
          <span className="font-label text-label-sm tracking-wider">{t('staffLogin.staffOnly')}</span>
        </span>
        <div className="flex flex-col gap-xs">
          <h1 className="font-headline text-display-lg-mobile text-balance">{t('staffLogin.title')}</h1>
          <p className="text-body-md text-on-surface-variant text-pretty max-w-xs mx-auto">{t('staffLogin.subtitle')}</p>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center">
        <section className="card !border-outline-variant/70 p-xl flex flex-col gap-xl">
          <div className="flex flex-col gap-sm">
            <span className="font-label text-label-md">{t('staffLogin.role')}</span>
            <div className="flex items-center gap-xs flex-wrap" role="radiogroup" aria-label={t('staffLogin.role')}>
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
                  {t(r.label)}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-lg">
            <label className="flex flex-col gap-xs">
              <span className="font-label text-label-md">{t('staffLogin.id')}</span>
              <input type="text" required value={login} onChange={(e) => setLogin(e.target.value)} placeholder={t('staffLogin.idPlaceholder')} autoComplete="username" className="input" />
            </label>
            <label className="flex flex-col gap-xs">
              <span className="font-label text-label-md">{t('staffLogin.password')}</span>
              <div className="relative flex items-center">
                <input type={showPwd ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('staffLogin.passwordPlaceholder')} autoComplete="current-password" className="input !pr-3xl" />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? t('staffLogin.hide') : t('staffLogin.show')}
                  className="absolute right-sm w-9 h-9 rounded-full inline-flex items-center justify-center text-on-surface-variant hover:text-on-surface"
                >
                  <Icon name={showPwd ? 'visibility_off' : 'visibility'} className="text-title-md" />
                </button>
              </div>
            </label>
            {(error || expired) && (
              <p role="alert" className="flex items-start gap-xs text-body-sm text-error">
                <Icon name="error" className="text-title-sm shrink-0 mt-[1px]" />
                {error ? t(error) : t('staffLogin.expired')}
              </p>
            )}
            <button type="submit" disabled={busy} className="btn-primary w-full px-xl py-lg">
              {busy ? t('staffLogin.signingIn') : t('staffLogin.submit')}
            </button>
          </form>
        </section>
      </main>

      <footer className="text-center pb-sm">
        <span className="font-label text-label-md text-primary">{t('staffLogin.forgot')}</span>
      </footer>
    </div>
  );
}
