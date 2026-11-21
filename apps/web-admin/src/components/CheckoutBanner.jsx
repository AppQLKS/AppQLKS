import { useState } from 'react';
import { api } from '../api.js';
import { Icon, elapsedLabel, money } from './ui.jsx';

/** Hàng chờ "Express Checkout Request" cho lễ tân (theo mockup Reception Desk). */
export default function CheckoutBanner({ checkouts, onReview, onDone }) {
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  if (checkouts.length === 0) return null;

  const approve = async (c) => {
    if (!window.confirm(`Check out Room ${c.roomNumber} (${c.guestName}) and deactivate the door code?\nBalance: ${money(c.folio.total)}`)) return;
    setBusy(c.roomNumber);
    setError('');
    try {
      await api(`/checkout/${c.roomNumber}/approve`, { method: 'POST' });
      onDone();
    } catch (e) {
      setError(`Room ${c.roomNumber}: ${e.message}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section aria-label="Express checkout requests" className="flex flex-col gap-gutter-sm">
      {error && <p role="alert" className="p-gutter-md rounded bg-error-tint text-on-error-tint text-body-sm">{error}</p>}
      {checkouts.map((c) => (
        <article key={c.roomNumber} className="rounded-md border border-status-amber/60 bg-amber-tint p-gutter-lg flex flex-wrap items-center justify-between gap-gutter-md">
          <div className="flex items-start gap-gutter-md">
            <Icon name="notifications_active" className="text-[22px] text-on-amber-tint shrink-0" />
            <div className="flex flex-col gap-0.5">
              <span className="text-label-sm text-on-amber-tint uppercase tracking-wider">
                Express Checkout Request • Room {c.roomNumber} • {elapsedLabel(c.requestedAt)}
              </span>
              <p className="text-title-md text-on-amber-tint">
                {c.guestName} — Total Room Service Bill: <span className="tabular-nums">{money(c.folio.total)}</span>
              </p>
              {c.openRequests > 0 && (
                <p className="text-body-sm text-on-amber-tint">{c.openRequests} open request(s) will be cancelled.</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-gutter-sm">
            <button type="button" onClick={() => onReview(c.roomNumber)} className="btn-sm">
              <Icon name="receipt_long" className="text-[15px]" />
              <span className="text-label-sm">Review Bill</span>
            </button>
            <button
              type="button"
              onClick={() => approve(c)}
              disabled={busy === c.roomNumber}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-primary text-on-primary hover:bg-on-blue-tint disabled:opacity-60 transition-colors duration-state-change"
            >
              <Icon name="check_circle" className="text-[15px]" />
              <span className="text-label-sm">{busy === c.roomNumber ? 'Checking out…' : 'Approve & Revoke Code'}</span>
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}
