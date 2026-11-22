import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useI18n } from '../i18n.jsx';
import { Icon, formatCode, money } from './ui.jsx';

function RoomTile({ room, selected, clickable, onSelect }) {
  const { t } = useI18n();
  const occupied = room.status === 'occupied';
  const base = 'rounded p-gutter-md border text-left transition-colors duration-state-change flex flex-col justify-between gap-2 min-h-[76px]';
  const cursor = clickable ? 'cursor-pointer' : 'cursor-default';
  const look = occupied
    ? selected
      ? 'bg-emerald-tint border-status-emerald ring-2 ring-status-emerald/30'
      : 'bg-surface-low border-outline-variant hover:border-status-emerald'
    : room.status === 'cleaning'
      ? `bg-amber-tint/60 border-status-amber/50 ${selected ? 'ring-2 ring-status-amber/40 border-status-amber' : clickable ? 'hover:border-status-amber' : ''}`
      : `bg-surface-container border-outline-variant ${selected ? 'ring-2 ring-primary/30 border-primary' : clickable ? 'hover:border-primary' : ''}`;
  const dot = occupied ? 'bg-status-emerald' : room.status === 'cleaning' ? 'bg-status-amber' : 'bg-outline';
  const text = occupied ? (room.checkoutRequested ? t('room.checkoutPending') : room.guestName) : room.status === 'cleaning' ? t('room.cleaning') : t('room.vacant');

  return (
    <button type="button" aria-disabled={!clickable} aria-pressed={selected} onClick={() => clickable && onSelect(room.number)} className={`${base} ${cursor} ${look}`}>
      <div className="flex items-center justify-between w-full">
        <span className="text-title-md tabular-nums">{room.number}</span>
        <span className={`w-2 h-2 rounded-full ${dot}`} aria-hidden="true" />
      </div>
      <span className="text-label-sm text-on-surface-variant truncate w-full">{text}</span>
    </button>
  );
}

function RoomDrawer({ number, refreshKey, canCheckout, justCheckedIn, onClose, onCheckedOut }) {
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

      {justCheckedIn && code && (
        <p role="status" className="flex items-start gap-2 p-gutter-md rounded bg-emerald-tint text-on-emerald-tint text-body-sm">
          <Icon name="check_circle" className="text-[18px] shrink-0" />
          {t('checkin.success')}
        </p>
      )}

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

/** Khung chung cho các ngăn bên phải: tiêu đề phòng + nhãn trạng thái + nút đóng. */
function DrawerShell({ room, badge, badgeTone, onClose, children }) {
  const { t, srv } = useI18n();
  return (
    <aside aria-label={t('room.title', { number: room.number })} className="xl:col-span-4 panel !shadow-md p-gutter-xl flex flex-col gap-gutter-lg">
      <div className="flex items-start justify-between gap-gutter-md pb-gutter-md border-b border-outline-variant">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="text-headline-md tabular-nums">{t('room.title', { number: room.number })}</h3>
            <span className={`text-label-sm px-2.5 py-0.5 rounded-full ${badgeTone}`}>{badge}</span>
          </div>
          <p className="text-body-sm text-on-surface-variant">{t('room.floor', { type: srv(room.type), floor: room.floor })}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={t('room.close')} className="inline-flex items-center justify-center w-8 h-8 rounded bg-surface-low text-on-surface-variant border border-outline-variant hover:bg-surface-container hover:text-on-surface transition-colors duration-state-change">
          <Icon name="close" className="text-[18px]" />
        </button>
      </div>
      {children}
    </aside>
  );
}

const localDate = (d) => d.toLocaleDateString('en-CA'); // YYYY-MM-DD theo giờ máy
const dayFromToday = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return localDate(d);
};
const nightsUntil = (date) => Math.round((new Date(`${date}T00:00:00`) - new Date(`${dayFromToday(0)}T00:00:00`)) / 86_400_000);
const inputClass = 'w-full rounded border-outline bg-surface text-body-md focus:border-primary focus:ring-primary';

/** Lễ tân nhận phòng cho khách mới: tên, số khách, ngày trả phòng -> server sinh mã cửa. */
function CheckInDrawer({ room, onClose, onDone }) {
  const { t, apiError, fmtDate } = useI18n();
  const [name, setName] = useState('');
  const [guests, setGuests] = useState(1);
  const [checkOut, setCheckOut] = useState(dayFromToday(1));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const nights = nightsUntil(checkOut);

  useEffect(() => {
    setName('');
    setGuests(1);
    setCheckOut(dayFromToday(1));
    setError('');
  }, [room.number]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(`/rooms/${room.number}/checkin`, { method: 'POST', body: JSON.stringify({ guestName: name, guests, checkOut }) });
      onDone(room.number);
    } catch (err) {
      setError(apiError(err));
      setBusy(false);
    }
  };

  return (
    <DrawerShell room={room} badge={t('room.vacant')} badgeTone="bg-surface-container text-on-surface-variant" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-gutter-lg">
        <div className="flex flex-col gap-0.5">
          <h4 className="text-title-md">{t('checkin.title')}</h4>
          <p className="text-body-sm text-on-surface-variant">{t('checkin.hint')}</p>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-label-md">{t('checkin.name')}</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoComplete="off" placeholder={t('checkin.namePlaceholder')} className={inputClass} />
        </label>

        <div className="grid grid-cols-2 gap-gutter-md">
          <label className="flex flex-col gap-1">
            <span className="text-label-md">{t('checkin.guests')}</span>
            <select value={guests} onChange={(e) => setGuests(Number(e.target.value))} className={inputClass}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{t(n > 1 ? 'room.guests' : 'room.guest', { n })}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-label-md">{t('checkin.checkOut')}</span>
            <input type="date" value={checkOut} min={dayFromToday(1)} max={dayFromToday(60)} onChange={(e) => setCheckOut(e.target.value)} required className={inputClass} />
          </label>
        </div>

        <div className="flex items-center justify-between px-3 py-2 rounded bg-surface-container text-body-sm">
          <span className="text-on-surface-variant">{t('checkin.from', { date: fmtDate(new Date(), { weekday: 'short', month: 'short', day: 'numeric' }) })}</span>
          <span className="text-label-md tabular-nums">{nights > 0 ? t(nights > 1 ? 'checkin.nights' : 'checkin.night', { n: nights }) : '—'}</span>
        </div>

        {error && <p role="alert" className="text-body-sm text-on-error-tint">{error}</p>}
        <button
          type="submit"
          disabled={busy || !name.trim() || nights < 1}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded text-on-primary bg-primary hover:bg-on-blue-tint disabled:opacity-60 transition-colors duration-state-change"
        >
          <Icon name="key" className="text-[18px]" />
          <span className="text-label-lg">{busy ? t('checkin.busy') : t('checkin.submit')}</span>
        </button>
      </form>
    </DrawerShell>
  );
}

/** Phòng cần dọn: tự về Trống khi buồng phòng xong việc dọn sau trả phòng, hoặc bấm tay. */
function CleaningDrawer({ room, onClose, onDone }) {
  const { t, apiError } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setError(''), [room.number]);

  const ready = async () => {
    if (!window.confirm(t('cleaning.confirm', { number: room.number }))) return;
    setBusy(true);
    setError('');
    try {
      await api(`/rooms/${room.number}/ready`, { method: 'POST' });
      onDone();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <DrawerShell room={room} badge={t('room.cleaning')} badgeTone="bg-amber-tint text-on-amber-tint" onClose={onClose}>
      <p className="flex items-start gap-2 text-body-sm text-on-surface-variant">
        <Icon name="cleaning_services" className="text-[18px] shrink-0" />
        {t('cleaning.hint')}
      </p>
      {error && <p role="alert" className="text-body-sm text-on-error-tint">{error}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={ready}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded text-on-primary bg-primary hover:bg-on-blue-tint disabled:opacity-60 transition-colors duration-state-change"
      >
        <Icon name="task_alt" className="text-[18px]" />
        <span className="text-label-lg">{busy ? t('cleaning.busy') : t('cleaning.ready')}</span>
      </button>
    </DrawerShell>
  );
}

export default function RoomPanel({ rooms, selected, onSelect: setSelected, canCheckout, canMarkReady, onChanged }) {
  const count = (s) => rooms.filter((r) => r.status === s).length;
  const { t } = useI18n();
  const [fresh, setFresh] = useState(null); // phòng vừa nhận -> nhắc đưa mã cửa cho khách

  // Phòng Trống: lễ tân / quản lý nhận phòng. Phòng Cần dọn: lễ tân / quản lý / buồng phòng đánh dấu đã dọn.
  const canOpen = (room) =>
    room.status === 'occupied' || (room.status === 'vacant' && canCheckout) || (room.status === 'cleaning' && canMarkReady);
  const current = rooms.find((r) => r.number === selected);
  const open = current && canOpen(current) ? current : null;
  const select = (number) => {
    setFresh(null);
    setSelected(number);
  };

  return (
    <section aria-label={t('room.panel')} className="grid grid-cols-1 xl:grid-cols-12 gap-section items-start">
      <div className={`${open ? 'xl:col-span-8' : 'xl:col-span-12'} panel p-gutter-xl flex flex-col gap-gutter-lg`}>
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
            <RoomTile key={r.number} room={r} selected={r.number === open?.number} clickable={canOpen(r)} onSelect={select} />
          ))}
        </div>
      </div>
      {open?.status === 'occupied' && (
        <RoomDrawer
          number={open.number}
          refreshKey={rooms}
          canCheckout={canCheckout}
          justCheckedIn={fresh === open.number}
          onClose={() => select(null)}
          onCheckedOut={onChanged}
        />
      )}
      {open?.status === 'vacant' && (
        <CheckInDrawer
          room={open}
          onClose={() => select(null)}
          onDone={(number) => {
            setFresh(number);
            onChanged();
          }}
        />
      )}
      {open?.status === 'cleaning' && <CleaningDrawer room={open} onClose={() => select(null)} onDone={onChanged} />}
    </section>
  );
}
