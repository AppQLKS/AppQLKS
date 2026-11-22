import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth.jsx';
import { Icon, Logo } from '../../components/ui.jsx';
import { LanguageSwitch, useI18n } from '../../i18n.jsx';

const LENGTH = 6;
const clean = (s) => String(s ?? '').replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, LENGTH);

// Lỗi từ server (tiếng Anh) -> key bản dịch theo mã HTTP
const ERROR_KEYS = { 400: 'login.error.format', 401: 'login.error.invalid', 429: 'login.error.locked' };

export default function Login() {
  const [params] = useSearchParams();
  const qrCode = clean(params.get('code')); // QR in trên thẻ phòng mở link /?code=A8K92P
  // Một ô nhập duy nhất giữ cả mã; 6 ô vuông chỉ để hiển thị.
  // (Nhiều ô nhập + chuyển focus làm rơi ký tự khi gõ nhanh / bàn phím Android.)
  const [code, setCode] = useState(qrCode);
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showQrHint, setShowQrHint] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { session, login, expired } = useAuth();
  const { t } = useI18n();

  const signIn = async (value) => {
    setBusy(true);
    setError('');
    try {
      await login(value);
      navigate(location.state?.from ?? '/home', { replace: true });
    } catch (e) {
      // Lưu key để đổi ngôn ngữ thì thông báo lỗi đổi theo
      setError(ERROR_KEYS[e.status] ?? (e.status ? e.message : 'login.error.network'));
      setBusy(false);
    }
  };

  useEffect(() => {
    if (qrCode.length === LENGTH && !session) signIn(qrCode);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onChange = (e) => {
    setCode(clean(e.target.value)); // gõ, dán, tự điền đều đi qua đây; bỏ dấu "-" và ký tự lạ
    setError('');
  };

  const submit = (e) => {
    e.preventDefault();
    if (code.length === LENGTH && !busy) signIn(code);
  };

  if (session?.token && !busy) return <Navigate to="/home" replace />;

  // Ô đang chờ nhập (để tô viền như con trỏ)
  const activeIndex = Math.min(code.length, LENGTH - 1);
  const box = (i) => {
    const active = focused && i === activeIndex;
    return (
      <span
        key={i}
        aria-hidden="true"
        className={`w-11 h-14 flex items-center justify-center font-mono text-mono-lg rounded-md border transition-colors duration-state-change ${
          error
            ? 'border-error bg-surface-container-low'
            : active
              ? 'border-primary ring-1 ring-primary bg-surface-container-lowest'
              : 'border-outline-variant bg-surface-container-low'
        }`}
      >
        {code[i] ?? (active ? <span className="w-px h-6 bg-on-surface animate-pulse" /> : '')}
      </span>
    );
  };

  return (
    <div className="relative min-h-screen max-w-[390px] mx-auto px-page-margin py-3xl flex flex-col justify-between">
      <LanguageSwitch className="absolute top-lg right-page-margin" />
      <header className="flex flex-col items-center text-center pt-lg gap-lg">
        <Logo />
        <div className="flex flex-col gap-xs">
          <span className="font-label text-label-md text-secondary uppercase tracking-widest">{t('login.eyebrow')}</span>
          <h1 className="font-headline text-display-lg-mobile text-balance">{t('login.title')}</h1>
          <p className="text-body-md text-on-surface-variant text-pretty max-w-xs mx-auto">{t('login.subtitle')}</p>
        </div>
      </header>

      <main className="my-2xl">
        <form onSubmit={submit} className="card !border-outline-variant/70 p-2xl flex flex-col gap-xl">
          <div className="flex flex-col gap-sm">
            <div className="flex items-center justify-between">
              <label htmlFor="room-code" className="font-label text-label-md">{t('login.codeLabel')}</label>
              <span className="font-mono text-mono-sm text-secondary">{t('login.example')}</span>
            </div>
            {/* Ô nhập thật phủ trong suốt lên 6 ô hiển thị: chạm vào đâu cũng mở bàn phím */}
            <div className="relative pt-xs">
              <div className="flex items-center justify-between gap-xs">
                {[0, 1, 2].map(box)}
                <span className="font-mono text-mono-lg text-secondary px-xs select-none" aria-hidden="true">-</span>
                {[3, 4, 5].map(box)}
              </div>
              <input
                id="room-code"
                ref={inputRef}
                value={code}
                onChange={onChange}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                maxLength={LENGTH + 1}
                autoCapitalize="characters"
                autoComplete="one-time-code"
                autoCorrect="off"
                spellCheck={false}
                inputMode="text"
                aria-label={t('login.codeAria')}
                aria-invalid={!!error}
                disabled={busy}
                className="absolute inset-0 w-full h-full opacity-0 cursor-text caret-transparent"
              />
            </div>
            {(error || expired) && (
              <p role="alert" className="flex items-start gap-xs text-body-sm text-error pt-xs">
                <Icon name="error" className="text-title-sm shrink-0 mt-[1px]" />
                {error ? t(error) : t('login.expired')}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-md">
            <button type="submit" disabled={code.length < LENGTH || busy} className="btn-primary w-full px-xl py-lg">
              {busy ? t('login.checking') : t('login.submit')}
            </button>
            <div className="flex items-center gap-md py-xs">
              <div className="h-px flex-1 bg-outline-variant" />
              <span className="text-body-sm text-on-surface-variant">{t('login.or')}</span>
              <div className="h-px flex-1 bg-outline-variant" />
            </div>
            <button type="button" onClick={() => setShowQrHint((v) => !v)} aria-expanded={showQrHint} className="btn-outline w-full px-xl py-md">
              <Icon name="qr_code_scanner" className="text-title-md text-accent" />
              {t('login.scanQr')}
            </button>
            {showQrHint && (
              <p className="text-body-sm text-on-surface-variant text-center text-pretty">{t('login.qrHint')}</p>
            )}
          </div>
        </form>
      </main>

      <footer className="flex flex-col items-center gap-lg pb-sm">
        <div className="w-full h-px bg-outline-variant" />
        <div className="w-full flex flex-col items-center gap-sm">
          <span className="font-label text-label-sm text-on-surface-variant uppercase tracking-widest">{t('login.staffSection')}</span>
          <Link
            to="/staff/login"
            className="w-full bg-surface-container-lowest rounded-full px-lg py-md shadow-sm border border-outline-variant hover:border-primary transition-colors duration-state-change flex items-center justify-between gap-md"
          >
            <div className="flex items-center gap-md min-w-0">
              <div className="w-10 h-10 rounded-full bg-surface-container-low border border-outline-variant/70 flex items-center justify-center shrink-0">
                <Icon name="badge" className="text-title-md text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="font-title text-title-sm">{t('login.staffTitle')}</span>
                <span className="text-body-sm text-on-surface-variant">{t('login.staffDepartments')}</span>
              </div>
            </div>
            <Icon name="arrow_forward" className="text-title-md text-on-surface-variant shrink-0" />
          </Link>
        </div>
        <div className="text-center flex flex-col items-center gap-xs text-body-sm text-on-surface-variant">
          <p>{t('login.help')}</p>
        </div>
      </footer>
    </div>
  );
}
