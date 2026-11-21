import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { BottomNav, Icon, formatCode, money } from '../../components/ui.jsx';
import { STAFF_NAV } from './staffNav.js';

const TILE = {
  vacant: { box: 'bg-surface-container-low border border-outline-variant', num: 'text-on-surface', label: 'text-on-surface-variant', text: 'Vacant' },
  occupied: { box: 'bg-success-container/60 border border-success/30', num: 'text-on-success-container', label: 'text-on-success-container', text: 'Occupied' },
  cleaning: { box: 'bg-secondary-container/80 border border-accent', num: 'text-on-secondary-container', label: 'text-on-secondary-container', text: 'Cleaning' },
};

export default function ReceptionRooms() {
  const [rooms, setRooms] = useState([]);
  const [selected, setSelected] = useState('305');
  const [detail, setDetail] = useState(null);
  const [copied, setCopied] = useState(false);
  const [revoked, setRevoked] = useState(false);
  const [bannerFolio, setBannerFolio] = useState(null);

  useEffect(() => {
    api('/rooms').then(setRooms).catch(() => {});
    api('/rooms/305').then((r) => setBannerFolio(r.folio)).catch(() => {});
  }, []);

  useEffect(() => {
    setRevoked(false);
    api(`/rooms/${selected}`).then(setDetail).catch(() => setDetail(null));
  }, [selected]);

  const occupied = rooms.filter((r) => r.status === 'occupied').length;
  const code = detail?.stay ? formatCode(detail.stay.accessCode) : '—';

  const copy = () => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="min-h-screen max-w-[390px] mx-auto flex flex-col pb-24">
      <header className="px-page-margin pt-2xl pb-md flex items-center justify-between gap-sm">
        <div className="flex flex-col gap-xs">
          <h1 className="font-headline text-headline-lg">Reception Desk</h1>
          <p className="text-body-sm text-on-surface-variant tabular-nums">Boutique Hotel • {occupied}/{rooms.length} Occupied</p>
        </div>
        <button type="button" className="inline-flex items-center gap-xs px-md py-sm rounded-full bg-primary text-on-primary font-label text-label-md hover:opacity-95 transition duration-state-change shrink-0">
          <Icon name="add" className="text-title-md" />
          Check-in
        </button>
      </header>

      <main className="px-page-margin flex flex-col gap-lg flex-1">
        {/* TODO(feature/express-checkout): hiển thị yêu cầu trả phòng thật từ API */}
        <article className="bg-secondary-container rounded-lg p-lg shadow-sm border border-accent flex flex-col gap-md">
          <div className="flex items-start gap-sm">
            <Icon name="notifications_active" className="text-title-lg text-secondary shrink-0" />
            <div className="flex flex-col gap-xs">
              <span className="font-label text-label-sm text-on-secondary-container uppercase tracking-wider">Express Checkout Request • Room 305</span>
              <p className="font-title text-title-sm text-on-secondary-container tabular-nums">Total Room Service Bill: {bannerFolio ? money(bannerFolio.total) : '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-sm">
            <button type="button" onClick={() => setSelected('305')} className="px-md py-sm rounded-md bg-surface-container-lowest border border-outline-variant font-label text-label-sm hover:bg-surface-container-low transition-colors duration-state-change">
              Review Bill
            </button>
            <button type="button" className="flex-1 px-md py-sm rounded-md bg-primary text-on-primary font-label text-label-sm hover:opacity-95 transition duration-state-change">
              Approve &amp; Revoke Code
            </button>
          </div>
        </article>

        <section aria-labelledby="room-grid-heading" className="flex flex-col gap-sm">
          <div className="flex items-center justify-between">
            <h2 id="room-grid-heading" className="font-title text-title-md">Floor Status</h2>
            <span className="text-body-sm text-on-surface-variant">Tap a room</span>
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
                  <span className={`font-mono text-mono-sm ${isSel ? 'text-primary font-semibold' : t.num}`}>Room {r.number}</span>
                  <span className={`font-label text-label-sm ${isSel ? 'text-secondary' : t.label}`}>{r.checkoutRequested ? 'Checkout Pending' : t.text}</span>
                </button>
              );
            })}
          </div>
        </section>

        {detail && (
          <section aria-labelledby="selected-room-heading">
            <article className="card !shadow-md !border-outline-variant p-lg flex flex-col gap-md">
              <h2 id="selected-room-heading" className="font-title text-title-md">
                Room {detail.number} • {detail.stay ? 'Active Stay Session' : TILE[detail.status].text}
              </h2>
              {detail.stay ? (
                <>
                  <div className="flex items-center justify-between gap-sm p-md rounded-md bg-surface-container-low border border-outline-variant/80">
                    <div className="flex items-center gap-sm">
                      <span className={`font-mono text-mono-lg tracking-wider ${revoked ? 'line-through text-on-surface-variant' : ''}`}>{code}</span>
                      <button type="button" onClick={copy} aria-label={`Copy room code ${code}`} className="inline-flex items-center justify-center w-8 h-8 rounded-md text-on-surface-variant hover:text-primary hover:bg-surface-container-lowest transition-colors duration-state-change">
                        <Icon name={copied ? 'check' : 'content_copy'} className="text-title-md" />
                      </button>
                    </div>
                    {/* TODO(feature/express-checkout): thu hồi mã qua API */}
                    <button type="button" disabled={revoked} onClick={() => setRevoked(true)} className="px-md py-xs rounded-md border border-error text-error font-label text-label-sm hover:bg-error-container/40 disabled:opacity-60 transition-colors duration-state-change">
                      {revoked ? 'Revoked' : 'Revoke Code'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-md pt-xs border-t border-outline-variant/60">
                    <div className="flex flex-col">
                      <span className="text-body-sm text-on-surface-variant">Room Service</span>
                      <span className="font-title text-title-sm tabular-nums">
                        {detail.folio.lines.length} Items • {money(detail.folio.total)}
                      </span>
                    </div>
                    <button type="button" className="btn-primary px-lg py-md !text-label-md">Complete Check-out</button>
                  </div>
                </>
              ) : (
                <p className="text-body-sm text-on-surface-variant">No active stay in this room.</p>
              )}
            </article>
          </section>
        )}
      </main>

      <BottomNav items={STAFF_NAV} />
    </div>
  );
}
