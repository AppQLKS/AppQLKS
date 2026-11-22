import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useI18n } from '../i18n.jsx';
import { Icon, formatCode, money } from './ui.jsx';

function RoomTile({ room, selected, onSelect }) {
  const { t } = useI18n();
  const occupied = room.status === 'occupied';
  const base = 'rounded p-gutter-md border text-left transition-colors duration-state-change flex flex-col justify-between gap-2 min-h-[76px]';
  const look = occupied
    ? selected
      ? 'bg-emerald-tint border-status-emerald ring-2 ring-status-emerald/30 cursor-pointer'
      : 'bg-surface-low border-outline-variant hover:border-status-emerald cursor-pointer'
    : room.status === 'cleaning'
      ? 'bg-amber-tint/60 border-status-amber/50 cursor-default'
      : 'bg-surface-container border-outline-variant cursor-default';
  const dot = occupied ? 'bg-status-emerald' : room.status === 'cleaning' ? 'bg-status-amber' : 'bg-outline';
  const text = occupied ? (room.checkoutRequested ? t('room.checkoutPending') : room.guestName) : room.status === 'cleaning' ? t('room.cleaning') : t('room.vacant');

  return (
    <button type="button" aria-disabled={!occupied} aria-pressed={selected} onClick={() => occupied && onSelect(room.number)} className={`${base} ${look}`}>
      <div className="flex items-center justify-between w-full">
        <span className="text-title-md tabular-nums">{room.number}</span>
        <span className={`w-2 h-2 rounded-full ${dot}`} aria-hidden="true" />
      </div>
      <span className="text-label-sm text-on-surface-variant truncate w-full">{text}</span>
    </button>
  );
}

function RoomDrawer({ number, refreshKey, canCheckout, onClose, onCheckedOut }) {
  const [detail, setDetail] = useState(null);
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [regenError, setRegenError] = useState('');
  const { t, srv, apiError, stayLabel } = useI18n();

  // Tải lại khi đổi phòng hoặc khi danh sách phòng được làm mới (realtime)
  useEffect(() => {
    api(`/rooms/${number}`)
      .then((d) => {
        setDetail(d);
        setCode(d.stay?.accessCode ?? '');
      })
      .catch(() => setDetail(null));
  }, [number, refreshKey]);

  useEffect(() => {
    setRegenError('');
    setCheckoutError('');
  }, [number]);

  if (!detail?.stay) return null;
  const { stay, folio } = detail;

  const checkOut = async () => {
    if (!window.confirm(t('room.checkoutConfirm', { number, guest: stay.guestName, total: money(folio.total) }))) return;
    setBusy(true);
    setCheckoutError('');
    try {
      await api(`/checkout/${number}/approve`, { method: 'POST' });
      onCheckedOut();
    } catch (e) {
      setCheckoutError(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  const copy = () => {
    navigator.clipboard?.writeText(formatCode(code)).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Sinh mã mới ở server; thiết bị khách đang đăng nhập bằng mã cũ sẽ bị đăng xuất
  const regenerate = async () => {
    if (!window.confirm(t('room.regenConfirm', { number }))) return;
    setRegenError('');
    try {
      const { accessCode } = await api(`/rooms/${number}/code`, { method: 'POST' });
      setCode(accessCode);
    } catch (e) {
      setRegenError(apiError(e));
    }
  };

  return (
    <aside aria-label={t('room.drawer')} className="xl:col-span-4 panel !shadow-md p-gutter-xl flex flex-col gap-gutter-lg">
      <div className="flex items-start justify-between gap-gutter-md pb-gutter-md border-b border-outline-variant">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="text-headline-md tabular-nums">{t('room.title', { number: detail.number })}</h3>
            <span className="text-label-sm bg-emerald-tint text-on-emerald-tint px-2.5 py-0.5 rounded-full">{t('room.occupied')}</span>
          </div>
          <p className="text-body-sm text-on-surface-variant">{t('room.floor', { type: srv(detail.type), floor: detail.floor })}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={t('room.close')} className="inline-flex items-center justify-center w-8 h-8 rounded bg-surface-low text-on-surface-variant border border-outline-variant hover:bg-surface-container hover:text-on-surface transition-colors duration-state-change">
          <Icon name="close" className="text-[18px]" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-gutter-md">
        <div className="flex flex-col gap-0.5">
          <span className="text-label-sm text-on-surface-variant">{t('room.primaryGuest')}</span>
          <span className="text-title-md">{stay.guestName}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-label-sm text-on-surface-variant">{t('room.stay')}</span>
          <span className="text-body-sm tabular-nums">{stayLabel(stay)}</span>
        </div>
      </div>

      <div className="bg-surface-container border border-outline-variant rounded p-gutter-lg flex flex-col gap-gutter-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-label-md text-on-surface-variant whitespace-nowrap">{t('room.doorCode')}</span>
          <span className="text-label-sm text-on-blue-tint bg-blue-tint px-2 py-0.5 rounded-full shrink-0">{t('room.active')}</span>
        </div>
        {!code ? (
          <p className="flex items-center gap-2 text-body-sm text-on-surface-variant">
            <Icon name="lock" className="text-[16px]" />
            {t('room.codeHidden')}
          </p>
        ) : (
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-mono-code tabular-nums whitespace-nowrap">{formatCode(code)}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button type="button" onClick={copy} className="btn-sm">
              <Icon name="content_copy" className="text-[15px]" />
              <span className="text-label-sm whitespace-nowrap">{copied ? t('room.copied') : t('room.copy')}</span>
            </button>
            <button type="button" onClick={regenerate} className="btn-sm">
              <Icon name="refresh" className="text-[15px]" />
              <span className="text-label-sm whitespace-nowrap">{t('room.regenerate')}</span>
            </button>
          </div>
        </div>
        )}
        {regenError && <p className="text-body-sm text-on-error-tint">{regenError}</p>}
      </div>

      <div className="flex flex-col gap-gutter-sm">
        <div className="flex items-center justify-between">
          <span className="text-label-md">{t('room.bill')}</span>
          <span className="text-label-sm text-on-surface-variant">{t('room.folio', { number: detail.number })}</span>
        </div>
        <div className="border border-outline-variant rounded divide-y divide-outline-variant bg-surface">
          {folio.lines.length === 0 && <div className="px-3 py-2 text-body-sm text-on-surface-variant">{t('room.noCharges')}</div>}
          {folio.lines.map((l, i) => (
            <div key={`${l.requestId}-${i}`} className="px-3 py-2 flex items-center justify-between gap-2">
              <span className="text-body-sm">{l.qty > 1 ? `${l.name} (x${l.qty})` : l.name}</span>
              <span className="text-label-md tabular-nums">{money(l.amount)}</span>
            </div>
          ))}
          {folio.service > 0 && (
            <div className="px-3 py-2 flex items-center justify-between gap-2">
              <span className="text-body-sm">{t('room.service')}</span>
              <span className="text-label-md tabular-nums">{money(folio.service)}</span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-label-lg">{t('room.total')}</span>
          <span className="text-title-md tabular-nums">{money(folio.total)}</span>
        </div>
      </div>

      {checkoutError && <p role="alert" className="text-body-sm text-on-error-tint">{checkoutError}</p>}
      {canCheckout && (
        <button
          type="button"
          disabled={busy}
          onClick={checkOut}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded text-on-primary bg-primary hover:bg-on-blue-tint disabled:opacity-60 transition-colors duration-state-change"
        >
          <Icon name="check_circle" className="text-[18px]" />
          <span className="text-label-lg">
            {busy ? t('room.checkingOut') : stay.checkoutRequested ? t('room.approveExpress') : t('room.checkOut')}
          </span>
        </button>
      )}
    </aside>
  );
}

export default function RoomPanel({ rooms, selected, onSelect: setSelected, canCheckout, onCheckedOut }) {
  const count = (s) => rooms.filter((r) => r.status === s).length;
  const { t } = useI18n();

  return (
    <section aria-label={t('room.panel')} className="grid grid-cols-1 xl:grid-cols-12 gap-section items-start">
      <div className={`${selected ? 'xl:col-span-8' : 'xl:col-span-12'} panel p-gutter-xl flex flex-col gap-gutter-lg`}>
        <div className="flex flex-wrap items-center justify-between gap-gutter-md">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-headline-md">{t('room.gridTitle')}</h2>
            <p className="text-body-sm text-on-surface-variant">{t('room.gridHint')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-gutter-md text-label-md text-on-surface-variant">
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-status-emerald" />{t('room.occupied')} ({count('occupied')})</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-outline" />{t('room.vacant')} ({count('vacant')})</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-status-amber" />{t('room.cleaning')} ({count('cleaning')})</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-gutter-md">
          {rooms.map((r) => (
            <RoomTile key={r.number} room={r} selected={r.number === selected} onSelect={setSelected} />
          ))}
        </div>
      </div>
      {selected && (
        <RoomDrawer
          number={selected}
          refreshKey={rooms}
          canCheckout={canCheckout}
          onClose={() => setSelected(null)}
          onCheckedOut={() => {
            setSelected(null);
            onCheckedOut();
          }}
        />
      )}
    </section>
  );
}
