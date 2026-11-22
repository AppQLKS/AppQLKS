import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Icon, money } from './ui.jsx';
import { useI18n } from '../i18n.jsx';

/** Tình trạng trả phòng nhanh của phòng hiện tại; tự làm mới khi có thay đổi realtime. */
export function useCheckoutStatus() {
  const { requests, stayVersion } = useAuth();
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/me/checkout')
      .then(setStatus)
      .catch((e) => setError(e.message));
  }, [requests, stayVersion]);

  return { status, setStatus, error };
}

/** Thẻ "Express Checkout Summary" theo mockup. */
export default function CheckoutCard({ showDetailsLink = false }) {
  const { status, setStatus, error: loadError } = useCheckoutStatus();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const act = async (method) => {
    setBusy(true);
    setError('');
    try {
      setStatus(await api('/me/checkout', { method }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const folio = status?.folio;

  return (
    <article className="card !shadow-md !border-outline-variant p-xl flex flex-col gap-md">
      <header className="flex items-start justify-between gap-md">
        <div className="flex flex-col gap-xs">
          <span className="font-label text-label-sm text-secondary uppercase tracking-wider">{t('checkout.card.eyebrow')}</span>
          <h2 className="font-title text-title-md">{t('checkout.card.folio', { n: status?.roomNumber ?? '' })}</h2>
        </div>
        <span className="font-headline text-headline-md tabular-nums">{folio ? money(folio.total) : '—'}</span>
      </header>

      <div className="flex items-center justify-between text-body-sm text-on-surface-variant border-t border-outline-variant/60 pt-md">
        <span>{t('checkout.card.total')}</span>
        <span className="font-mono text-mono-sm text-on-surface tabular-nums">{folio ? t('checkout.card.items', { n: folio.lines.length }) : ''}</span>
      </div>

      {status?.openRequests > 0 && !status.requested && (
        <p className="flex items-start gap-xs text-body-sm text-secondary">
          <Icon name="info" className="text-title-sm shrink-0 mt-[1px]" />
          {t('checkout.card.open', { n: status.openRequests })}
        </p>
      )}

      {(error || loadError) && (
        <p role="alert" className="flex items-start gap-xs text-body-sm text-error">
          <Icon name="error" className="text-title-sm shrink-0 mt-[1px]" />
          {error || loadError}
        </p>
      )}

      {status?.requested ? (
        <div className="flex flex-col gap-sm">
          <div role="status" className="w-full py-md px-lg rounded-md bg-secondary-container text-on-secondary-container font-label text-label-lg flex items-center justify-center gap-xs">
            <Icon name="hourglass_top" className="text-title-md" />
            {t('checkout.card.waiting')}
          </div>
          <button type="button" onClick={() => act('DELETE')} disabled={busy} className="text-center font-label text-label-md text-on-surface-variant hover:text-error py-xs">
            {t('checkout.card.cancel')}
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => act('POST')} disabled={busy || !status} className="btn-primary w-full px-xl py-md">
          <Icon name="logout" className="text-title-md" />
          {busy ? t('common.sending') : t('checkout.card.request')}
        </button>
      )}

      {showDetailsLink && (
        <Link to="/checkout" className="text-center font-label text-label-md text-primary hover:underline">
          {t('checkout.card.details')}
        </Link>
      )}
    </article>
  );
}
