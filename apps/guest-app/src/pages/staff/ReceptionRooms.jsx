import { useCallback, useEffect, useState } from 'react';
import { loadSession, staffApi } from '../../api.js';
import { BottomNav, Icon, formatCode, money } from '../../components/ui.jsx';
import { subscribeRequests } from '../../live.js';
import { useStaffAuth } from '../../staffAuth.jsx';
import { useI18n } from '../../i18n.jsx';
import { STAFF_NAV } from './staffNav.js';

const localDate = (d) => d.toLocaleDateString('en-CA'); // YYYY-MM-DD theo giờ máy
const dayFromToday = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return localDate(d);
};
const nightsUntil = (date) => Math.round((new Date(`${date}T00:00:00`) - new Date(`${dayFromToday(0)}T00:00:00`)) / 86_400_000);
const field = 'w-full px-md py-sm rounded-md bg-surface-container-lowest border border-outline-variant text-body-md focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary';

/** Form nhận phòng (phòng Trống, chỉ lễ tân / quản lý). */
function CheckInForm({ roomNumber, busy, onSubmit }) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [guests, setGuests] = useState(1);
  const [checkOut, setCheckOut] = useState(dayFromToday(1));
  const nights = nightsUntil(checkOut);

  useEffect(() => {
    setName('');
    setGuests(1);
    setCheckOut(dayFromToday(1));
  }, [roomNumber]);

  const submit = (e) => {
    e.preventDefault();
    onSubmit({ guestName: name, guests, checkOut });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-md">
      <p className="text-body-sm text-on-surface-variant -mt-sm">{t('rooms.checkinHint')}</p>
      <label className="flex flex-col gap-xs">
        <span className="font-label text-label-md">{t('rooms.guestName')}</span>
        <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoComplete="off" placeholder={t('rooms.guestNamePlaceholder')} className={field} />
      </label>
      <div className="grid grid-cols-2 gap-sm">
        <label className="flex flex-col gap-xs">
          <span className="font-label text-label-md">{t('rooms.guests')}</span>
          <select value={guests} onChange={(e) => setGuests(Number(e.target.value))} className={field}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>{t('rooms.guestCount', { n })}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-xs">
          <span className="font-label text-label-md">{t('rooms.checkOutDate')}</span>
          <input type="date" value={checkOut} min={dayFromToday(1)} max={dayFromToday(60)} onChange={(e) => setCheckOut(e.target.value)} required className={field} />
        </label>
      </div>
      <p className="text-body-sm text-on-surface-variant tabular-nums">{nights > 0 ? t('rooms.nights', { n: nights }) : '—'}</p>
      <button type="submit" disabled={busy || !name.trim() || nights < 1} className="btn-primary w-full px-lg py-md !text-label-md">
        <Icon name="key" className="text-title-md" />
        {busy ? t('rooms.checkingIn') : t('rooms.checkinSubmit')}
      </button>
    </form>
  );
}

const TILE = {
  vacant: { box: 'bg-surface-container-low border border-outline-variant', num: 'text-on-surface', label: 'text-on-surface-variant', text: 'rooms.tile.vacant' },
  occupied: { box: 'bg-success-container/60 border border-success/30', num: 'text-on-success-container', label: 'text-on-success-container', text: 'rooms.tile.occupied' },
  cleaning: { box: 'bg-secondary-container/80 border border-accent', num: 'text-on-secondary-container', label: 'text-on-secondary-container', text: 'rooms.tile.cleaning' },
};

export default function ReceptionRooms() {
  // tr thay vì t vì bên dưới dùng biến t cho kiểu ô phòng
  const { t: tr, srv, apiError } = useI18n();
  const { staff, logout } = useStaffAuth();
  const isFrontDesk = ['reception', 'manager'].includes(staff.department);
  const canMarkReady = isFrontDesk || staff.department === 'housekeeping';
  const [rooms, setRooms] = useState([]);
  const [checkouts, setCheckouts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(null); // 'revoke' | 'checkout:<room>'
  const [message, setMessage] = useState(null); // { tone, text }
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    staffApi('/rooms').then(setRooms).catch(() => {});
    if (isFrontDesk) staffApi('/checkout').then(setCheckouts).catch(() => {});
  }, [version, isFrontDesk]);

  // Chọn sẵn phòng đầu tiên đang chờ trả phòng (hoặc phòng có khách đầu tiên)
  useEffect(() => {
    if (selected || rooms.length === 0) return;
    setSelected(checkouts[0]?.roomNumber ?? rooms.find((r) => r.status === 'occupied')?.number ?? rooms[0].number);
  }, [rooms, checkouts, selected]);

  useEffect(() => {
    if (!selected) return;
    staffApi(`/rooms/${selected}`).then(setDetail).catch(() => setDetail(null));
  }, [selected, version]);

  // Realtime: khách xin / huỷ trả phòng, yêu cầu mới (ảnh hưởng hoá đơn)
  useEffect(
    () =>
      subscribeRequests('/requests/events', {
        token: loadSession('staff')?.token,
        onRequest: reload,
        onStay: reload,
        onUnauthorized: logout,
      }),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const occupied = rooms.filter((r) => r.status === 'occupied').length;
  const code = detail?.stay?.accessCode ? formatCode(detail.stay.accessCode) : null;

  const copy = () => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const run = async (key, fn, success) => {
    setBusy(key);
    setMessage(null);
    try {
      await fn();
      setMessage({ tone: 'ok', text: success });
      reload();
    } catch (e) {
      setMessage({ tone: 'error', text: apiError(e) });
    } finally {
      setBusy(null);
    }
  };

  // "Revoke" = sinh mã mới: mã cũ và mọi điện thoại đang đăng nhập bằng mã cũ mất hiệu lực
  const revoke = () => {
    if (!window.confirm(tr('rooms.confirmRevoke', { n: selected }))) return;
    run('revoke', () => staffApi(`/rooms/${selected}/code`, { method: 'POST' }), tr('rooms.revoked', { n: selected }));
  };

  const checkOut = (roomNumber, guestName, total) => {
    if (!window.confirm(tr('rooms.confirmCheckout', { n: roomNumber, name: guestName, x: money(total) }))) return;
    run(
      `checkout:${roomNumber}`,
      () => staffApi(`/checkout/${roomNumber}/approve`, { method: 'POST' }),
      tr('rooms.checkedOut', { n: roomNumber }),
    );
  };

  const checkIn = (body) =>
    run(
      'checkin',
      () => staffApi(`/rooms/${selected}/checkin`, { method: 'POST', body: JSON.stringify(body) }),
      tr('rooms.checkedIn', { n: selected }),
    );

  const markReady = () => {
    if (!window.confirm(tr('rooms.confirmReady', { n: selected }))) return;
    run('ready', () => staffApi(`/rooms/${selected}/ready`, { method: 'POST' }), tr('rooms.ready', { n: selected }));
  };

  // Nút "Nhận phòng" trên đầu: chọn phòng Trống (đang chọn hoặc phòng Trống đầu tiên) để mở form
  const startCheckIn = () => {
    setMessage(null);
    const current = rooms.find((r) => r.number === selected);
    const vacant = current?.status === 'vacant' ? current : rooms.find((r) => r.status === 'vacant');
    if (!vacant) {
      setMessage({ tone: 'error', text: tr('rooms.noVacant') });
      return;
    }
    setSelected(vacant.number);
    setTimeout(() => document.getElementById('selected-room-heading')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  return (
    <div className="min-h-screen max-w-[390px] mx-auto flex flex-col pb-24">
      <header className="px-page-margin pt-2xl pb-md flex items-center justify-between gap-sm">
        <div className="flex flex-col gap-xs">
          <h1 className="font-headline text-headline-lg">{tr('rooms.title')}</h1>
          <p className="text-body-sm text-on-surface-variant tabular-nums">{tr('rooms.subtitle', { a: occupied, b: rooms.length })}</p>
        </div>
        {isFrontDesk && (
          <button type="button" onClick={startCheckIn} className="inline-flex items-center gap-xs px-md py-sm rounded-full bg-primary text-on-primary font-label text-label-md hover:opacity-95 transition duration-state-change shrink-0">
            <Icon name="add" className="text-title-md" />
            {tr('rooms.checkin')}
          </button>
        )}
      </header>

      <main className="px-page-margin flex flex-col gap-lg flex-1">
        {message && (
          <p role="status" className={`flex items-start gap-xs p-md rounded-md text-body-sm ${message.tone === 'ok' ? 'bg-success-container text-on-success-container' : 'bg-error-container text-error'}`}>
            <Icon name={message.tone === 'ok' ? 'check_circle' : 'error'} className="text-title-sm shrink-0 mt-[1px]" />
            {message.text}
          </p>
        )}

        {checkouts.map((c) => (
          <article key={c.roomNumber} className="bg-secondary-container rounded-lg p-lg shadow-sm border border-accent flex flex-col gap-md">
            <div className="flex items-start gap-sm">
              <Icon name="notifications_active" className="text-title-lg text-secondary shrink-0" />
              <div className="flex flex-col gap-xs">
                <span className="font-label text-label-sm text-on-secondary-container uppercase tracking-wider">{tr('rooms.checkoutRequest', { n: c.roomNumber })}</span>
                <p className="font-title text-title-sm text-on-secondary-container tabular-nums">{tr('rooms.bill', { x: money(c.folio.total) })}</p>
              </div>
            </div>
            <div className="flex items-center gap-sm">
              <button type="button" onClick={() => setSelected(c.roomNumber)} className="px-md py-sm rounded-md bg-surface-container-lowest border border-outline-variant font-label text-label-sm hover:bg-surface-container-low transition-colors duration-state-change">
                {tr('rooms.reviewBill')}
              </button>
              <button
                type="button"
                onClick={() => checkOut(c.roomNumber, c.guestName, c.folio.total)}
                disabled={!!busy}
                className="flex-1 px-md py-sm rounded-md bg-primary text-on-primary font-label text-label-sm hover:opacity-95 disabled:opacity-60 transition duration-state-change"
              >
                {busy === `checkout:${c.roomNumber}` ? tr('rooms.checkingOut') : tr('rooms.approve')}
              </button>
            </div>
          </article>
        ))}

        <section aria-labelledby="room-grid-heading" className="flex flex-col gap-sm">
          <div className="flex items-center justify-between">
            <h2 id="room-grid-heading" className="font-title text-title-md">{tr('rooms.floorStatus')}</h2>
            <span className="text-body-sm text-on-surface-variant">{tr('rooms.tapRoom')}</span>
          </div>
          <div className="grid grid-cols-3 gap-sm items-stretch">
            {rooms.map((r) => {
              const isSel = r.number === selected;
              const t = TILE[r.status];
              return (
                <button
                  key={r.number}
                  type="button"
                  aria-pressed={isSel}
                  onClick={() => setSelected(r.number)}
                  className={`h-full p-md rounded-md text-left flex flex-col justify-between gap-sm transition-colors duration-state-change ${
                    isSel ? 'bg-surface-container-lowest border-2 border-primary shadow-sm' : `${t.box} hover:border-primary`
                  }`}
                >
                  <span className={`font-mono text-mono-sm ${isSel ? 'text-primary font-semibold' : t.num}`}>{tr('common.room', { n: r.number })}</span>
                  <span className={`font-label text-label-sm ${isSel || r.checkoutRequested ? 'text-secondary' : t.label}`}>{r.checkoutRequested ? tr('rooms.tile.checkoutPending') : tr(t.text)}</span>
                </button>
              );
            })}
          </div>
        </section>

        {detail && (
          <section aria-labelledby="selected-room-heading">
            <article className="card !shadow-md !border-outline-variant p-lg flex flex-col gap-md">
              <div className="flex flex-col gap-xs">
                <h2 id="selected-room-heading" className="font-title text-title-md scroll-mt-lg">
                  {tr('common.room', { n: detail.number })} •{' '}
                  {detail.stay ? tr('rooms.activeSession') : detail.status === 'vacant' && isFrontDesk ? tr('rooms.checkinTitle') : tr(TILE[detail.status].text)}
                </h2>
                <p className="text-body-sm text-on-surface-variant">{srv(detail.type)}</p>
              </div>
              {detail.stay ? (
                <>
                  <p className="text-body-sm text-on-surface-variant -mt-sm">{detail.stay.guestName}</p>
                  {isFrontDesk && code && (
                    <div className="flex items-center justify-between gap-sm p-md rounded-md bg-surface-container-low border border-outline-variant/80">
                      <div className="flex items-center gap-sm">
                        <span className="font-mono text-mono-lg tracking-wider">{code}</span>
                        <button type="button" onClick={copy} aria-label={tr('rooms.copyCode', { code })} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-on-surface-variant hover:text-primary hover:bg-surface-container-lowest transition-colors duration-state-change">
                          <Icon name={copied ? 'check' : 'content_copy'} className="text-title-md" />
                        </button>
                      </div>
                      <button type="button" disabled={!!busy} onClick={revoke} className="px-md py-xs rounded-md border border-error text-error font-label text-label-sm hover:bg-error-container/40 disabled:opacity-60 transition-colors duration-state-change">
                        {busy === 'revoke' ? tr('rooms.revoking') : tr('rooms.revoke')}
                      </button>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-md pt-xs border-t border-outline-variant/60">
                    <div className="flex flex-col">
                      <span className="text-body-sm text-on-surface-variant">{tr('rooms.roomService')}</span>
                      <span className="font-title text-title-sm tabular-nums">
                        {tr('rooms.itemsTotal', { n: detail.folio.lines.length, x: money(detail.folio.total) })}
                      </span>
                    </div>
                    {isFrontDesk && (
                      <button
                        type="button"
                        disabled={!!busy}
                        onClick={() => checkOut(detail.number, detail.stay.guestName, detail.folio.total)}
                        className="btn-primary px-lg py-md !text-label-md"
                      >
                        {busy === `checkout:${detail.number}` ? tr('rooms.checkingOut') : tr('rooms.completeCheckout')}
                      </button>
                    )}
                  </div>
                </>
              ) : detail.status === 'vacant' && isFrontDesk ? (
                <CheckInForm roomNumber={detail.number} busy={busy === 'checkin'} onSubmit={checkIn} />
              ) : detail.status === 'cleaning' ? (
                <>
                  <p className="flex items-start gap-xs text-body-sm text-on-surface-variant">
                    <Icon name="cleaning_services" className="text-title-sm shrink-0 mt-[1px]" />
                    {tr('rooms.cleaningHint')}
                  </p>
                  {canMarkReady && (
                    <button type="button" disabled={!!busy} onClick={markReady} className="btn-primary w-full px-lg py-md !text-label-md">
                      <Icon name="task_alt" className="text-title-md" />
                      {busy === 'ready' ? tr('rooms.markingReady') : tr('rooms.markReady')}
                    </button>
                  )}
                </>
              ) : (
                <p className="text-body-sm text-on-surface-variant">{tr('rooms.noStay')}</p>
              )}
            </article>
          </section>
        )}
      </main>

      <BottomNav items={STAFF_NAV} />
    </div>
  );
}
