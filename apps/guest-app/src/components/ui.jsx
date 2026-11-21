import { Link, NavLink, useNavigate } from 'react-router-dom';

export function Icon({ name, className = '', filled = false }) {
  return (
    <span className={`material-symbols-outlined ${filled ? 'icon-filled' : ''} ${className}`} aria-hidden="true">
      {name}
    </span>
  );
}

/** Emblem AppHotel (lục giác + chữ A). */
export function Logo({ size = 64, mark = 34, showBar = true }) {
  return (
    <div
      className="rounded-xl bg-primary flex items-center justify-center shadow-sm border border-accent/40 shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={mark} height={mark} viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <path d="M18 4L29 10.5V25.5L18 32L7 25.5V10.5L18 4Z" stroke="#D4A373" strokeWidth="1.75" />
        <path d="M13 23L18 11L23 23" stroke="#FAF8F5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {showBar && <path d="M14.8 19H21.2" stroke="#D4A373" strokeWidth="1.75" strokeLinecap="round" />}
      </svg>
    </div>
  );
}

/** Khung màn hình mobile 390px. */
export function Screen({ children, className = '' }) {
  return <div className={`min-h-screen max-w-[390px] mx-auto flex flex-col ${className}`}>{children}</div>;
}

export function BackButton({ to, label = 'Back to Home' }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => (to ? navigate(to) : navigate(-1))}
      className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-surface-container-lowest text-on-surface border border-outline-variant hover:bg-surface-container-low transition-colors duration-state-change shrink-0"
    >
      <Icon name="arrow_back" className="text-title-lg" />
    </button>
  );
}

export function BackPill({ to, label }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-xs px-md py-sm rounded-full bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors duration-state-change"
    >
      <Icon name="arrow_back" className="text-title-md text-primary" />
      <span className="font-label text-label-md">{label}</span>
    </Link>
  );
}

export function Badge({ tone = 'success', dot = false, children, className = '' }) {
  const tones = {
    success: 'bg-success-container text-on-success-container',
    accent: 'bg-secondary-container text-on-secondary-container',
    accentBorder: 'bg-secondary-container text-on-secondary-container border border-accent',
    primary: 'bg-primary-container text-on-primary-container',
  };
  const dots = { success: 'bg-success', accent: 'bg-secondary', accentBorder: 'bg-secondary', primary: 'bg-primary' };
  return (
    <span role="status" className={`inline-flex items-center gap-xs px-md py-xs rounded-full shrink-0 ${tones[tone]} ${className}`}>
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dots[tone]}`} aria-hidden="true" />}
      <span className="font-label text-label-sm">{children}</span>
    </span>
  );
}

/** Thanh tiến trình 4 bước (Sent → Assigned → On Way → Done). current = 0..3 */
export function StepBar({ steps, current, height = 'h-1.5' }) {
  return (
    <div className="flex flex-col gap-sm">
      <div className="grid grid-cols-4 gap-xs" aria-label={`Progress: step ${current + 1} of ${steps.length}`}>
        {steps.map((s, i) => (
          <div
            key={s}
            className={`${height} rounded-full ${i < current ? 'bg-primary' : i === current ? 'bg-accent' : 'bg-surface-container'}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-4 gap-xs text-center">
        {steps.map((s, i) => (
          <span
            key={s}
            className={`font-label text-label-sm ${i < current ? 'text-primary' : i === current ? 'text-on-surface' : 'text-on-surface-variant'}`}
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Thanh điều hướng đáy. items: [{ to, label, icon }] */
export function BottomNav({ items }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-surface-container-lowest border-t border-outline-variant px-xl py-md z-20"
    >
      <div className="grid gap-xs" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-xs transition-colors duration-state-change ${
                isActive ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon name={it.icon} filled={isActive} className="text-headline-md" />
                <span className="font-label text-label-sm">{it.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export const money = (n) => `$${Number(n).toFixed(2)}`;
export const formatCode = (code = '') => (code.length === 6 ? `${code.slice(0, 3)}-${code.slice(3)}` : code);
