import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon, Logo } from '../../components/ui.jsx';

const LENGTH = 6;

export default function Login() {
  const [chars, setChars] = useState(Array(LENGTH).fill(''));
  const inputs = useRef([]);
  const navigate = useNavigate();
  const code = chars.join('');

  const setChar = (i, raw) => {
    const v = raw.replace(/[^a-z0-9]/gi, '').slice(-1).toUpperCase();
    setChars((prev) => prev.map((c, idx) => (idx === i ? v : c)));
    if (v && i < LENGTH - 1) inputs.current[i + 1]?.focus();
  };

  const onPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, LENGTH);
    if (!pasted) return;
    e.preventDefault();
    setChars(Array.from({ length: LENGTH }, (_, i) => pasted[i] ?? ''));
    inputs.current[Math.min(pasted.length, LENGTH - 1)]?.focus();
  };

  const submit = (e) => {
    e.preventDefault();
    // TODO(feature/guest-auth-room-code): POST /api/auth/guest { code } -> lưu token phiên khách
    navigate('/home');
  };

  const box = (i) => (
    <input
      key={i}
      id={`code-${i}`}
      ref={(el) => (inputs.current[i] = el)}
      value={chars[i]}
      onChange={(e) => setChar(i, e.target.value)}
      onKeyDown={(e) => e.key === 'Backspace' && !chars[i] && i > 0 && inputs.current[i - 1]?.focus()}
      onPaste={onPaste}
      maxLength={2}
      autoCapitalize="characters"
      autoComplete="one-time-code"
      aria-label={`Code character ${i + 1}`}
      className="w-11 h-14 text-center font-mono text-mono-lg uppercase rounded-md bg-surface-container-low border border-outline-variant text-on-surface focus:bg-surface-container-lowest focus:border-primary focus:ring-1 focus:ring-primary"
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
          </div>

          <div className="flex flex-col gap-md">
            <button type="submit" disabled={code.length < LENGTH} className="btn-primary w-full px-xl py-lg">
              Access Room Services
            </button>
            <div className="flex items-center gap-md py-xs">
              <div className="h-px flex-1 bg-outline-variant" />
              <span className="text-body-sm text-on-surface-variant">or</span>
              <div className="h-px flex-1 bg-outline-variant" />
            </div>
            {/* TODO(feature/guest-auth-room-code): quét QR chứa mã phòng */}
            <button type="button" className="btn-outline w-full px-xl py-md">
              <Icon name="qr_code_scanner" className="text-title-md text-accent" />
              Scan Room QR Code
            </button>
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
