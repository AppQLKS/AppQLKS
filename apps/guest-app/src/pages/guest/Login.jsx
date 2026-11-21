import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth.jsx';
import { Icon, Logo } from '../../components/ui.jsx';

const LENGTH = 6;
const clean = (s) => String(s ?? '').replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, LENGTH);

export default function Login() {
  const [params] = useSearchParams();
  const qrCode = clean(params.get('code')); // QR in trên thẻ phòng mở link /?code=A8K92P
  const [chars, setChars] = useState(() => Array.from({ length: LENGTH }, (_, i) => qrCode[i] ?? ''));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showQrHint, setShowQrHint] = useState(false);
  const inputs = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const { session, login, expired } = useAuth();
  const code = chars.join('');

  const signIn = async (value) => {
    setBusy(true);
    setError('');
    try {
      await login(value);
      navigate(location.state?.from ?? '/home', { replace: true });
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  useEffect(() => {
    if (qrCode.length === LENGTH && !session) signIn(qrCode);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setChar = (i, raw) => {
    let typed = raw.replace(/[^a-z0-9]/gi, '').toUpperCase();
    // Ô đang có 1 ký tự và người dùng gõ thêm -> giữ ký tự mới
    if (typed.length === 2 && typed[0] === chars[i]) typed = typed[1];
    setError('');
    if (typed.length <= 1) {
      setChars((prev) => prev.map((c, idx) => (idx === i ? typed : c)));
      if (typed && i < LENGTH - 1) inputs.current[i + 1]?.focus();
      return;
    }
    // Nhiều ký tự vào 1 ô cùng lúc (bàn phím tự điền mã, gõ nhanh) -> rải sang các ô sau
    const spread = typed.slice(0, LENGTH - i);
    setChars((prev) => prev.map((c, idx) => (idx >= i && idx < i + spread.length ? spread[idx - i] : c)));
    inputs.current[Math.min(i + spread.length, LENGTH - 1)]?.focus();
  };

  const onPaste = (e) => {
    const pasted = clean(e.clipboardData.getData('text'));
    if (!pasted) return;
    e.preventDefault();
    setChars(Array.from({ length: LENGTH }, (_, i) => pasted[i] ?? ''));
    setError('');
    inputs.current[Math.min(pasted.length, LENGTH - 1)]?.focus();
  };

  const submit = (e) => {
    e.preventDefault();
    if (code.length === LENGTH && !busy) signIn(code);
  };

  if (session?.token && !busy) return <Navigate to="/home" replace />;

  const box = (i) => (
    <input
      key={i}
      id={`code-${i}`}
      ref={(el) => (inputs.current[i] = el)}
      value={chars[i]}
      onChange={(e) => setChar(i, e.target.value)}
      onKeyDown={(e) => e.key === 'Backspace' && !chars[i] && i > 0 && inputs.current[i - 1]?.focus()}
      onPaste={onPaste}
      maxLength={LENGTH}
      autoCapitalize="characters"
      autoComplete="one-time-code"
      aria-label={`Code character ${i + 1}`}
      aria-invalid={!!error}
      disabled={busy}
      className={`w-11 h-14 text-center font-mono text-mono-lg uppercase rounded-md bg-surface-container-low border text-on-surface focus:bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary ${
        error ? 'border-error' : 'border-outline-variant'
      }`}
    />
  );

  return (
    <div className="min-h-screen max-w-[390px] mx-auto px-page-margin py-3xl flex flex-col justify-between">
      <header className="flex flex-col items-center text-center pt-lg gap-lg">
        <Logo />
        <div className="flex flex-col gap-xs">
          <span className="font-label text-label-md text-secondary uppercase tracking-widest">AppHotel • Boutique Stay</span>
          <h1 className="font-headline text-display-lg-mobile text-balance">Welcome to Your Stay</h1>
          <p className="text-body-md text-on-surface-variant text-pretty max-w-xs mx-auto">
            Enter the 6-character code from your suite keycard to unlock in-room dining, housekeeping, and concierge.
          </p>
        </div>
      </header>

      <main className="my-2xl">
        <form onSubmit={submit} className="card !border-outline-variant/70 p-2xl flex flex-col gap-xl">
          <div className="flex flex-col gap-sm">
            <div className="flex items-center justify-between">
              <label htmlFor="code-0" className="font-label text-label-md">Dynamic Room Code</label>
              <span className="font-mono text-mono-sm text-secondary">Example: A8K-92P</span>
            </div>
            <div className="flex items-center justify-between gap-xs pt-xs" role="group" aria-label="6-character room access code">
              {[0, 1, 2].map(box)}
              <span className="font-mono text-mono-lg text-secondary px-xs select-none" aria-hidden="true">-</span>
              {[3, 4, 5].map(box)}
            </div>
            {(error || expired) && (
              <p role="alert" className="flex items-start gap-xs text-body-sm text-error pt-xs">
                <Icon name="error" className="text-title-sm shrink-0 mt-[1px]" />
                {error || 'Your session ended (the room code was changed). Please enter the new code.'}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-md">
            <button type="submit" disabled={code.length < LENGTH || busy} className="btn-primary w-full px-xl py-lg">
              {busy ? 'Checking code…' : 'Access Room Services'}
            </button>
            <div className="flex items-center gap-md py-xs">
              <div className="h-px flex-1 bg-outline-variant" />
              <span className="text-body-sm text-on-surface-variant">or</span>
              <div className="h-px flex-1 bg-outline-variant" />
            </div>
            <button type="button" onClick={() => setShowQrHint((v) => !v)} aria-expanded={showQrHint} className="btn-outline w-full px-xl py-md">
              <Icon name="qr_code_scanner" className="text-title-md text-accent" />
              Scan Room QR Code
            </button>
            {showQrHint && (
              <p className="text-body-sm text-on-surface-variant text-center text-pretty">
                Open your phone camera and point it at the QR code on your keycard sleeve — you will be signed in automatically.
              </p>
            )}
          </div>
        </form>
      </main>

      <footer className="flex flex-col items-center gap-lg pb-sm">
        <div className="w-full h-px bg-outline-variant" />
        <div className="w-full flex flex-col items-center gap-sm">
          <span className="font-label text-label-sm text-on-surface-variant uppercase tracking-widest">For Hotel Staff &amp; Operations</span>
          <Link
            to="/staff/login"
            className="w-full bg-surface-container-lowest rounded-full px-lg py-md shadow-sm border border-outline-variant hover:border-primary transition-colors duration-state-change flex items-center justify-between gap-md"
          >
            <div className="flex items-center gap-md min-w-0">
              <div className="w-10 h-10 rounded-full bg-surface-container-low border border-outline-variant/70 flex items-center justify-center shrink-0">
                <Icon name="badge" className="text-title-md text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="font-title text-title-sm">Staff Portal Login</span>
                <span className="text-body-sm text-on-surface-variant">Housekeeping • Kitchen • Reception</span>
              </div>
            </div>
            <Icon name="arrow_forward" className="text-title-md text-on-surface-variant shrink-0" />
          </Link>
        </div>
        <div className="text-center flex flex-col items-center gap-xs text-body-sm text-on-surface-variant">
          <p>Need assistance? Dial 0 from your suite phone.</p>
        </div>
      </footer>
    </div>
  );
}
