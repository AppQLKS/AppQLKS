import { useAuth } from '../../auth.jsx';
import CheckoutCard, { useCheckoutStatus } from '../../components/CheckoutCard.jsx';
import { BackButton, money } from '../../components/ui.jsx';

export default function Checkout() {
  const { room, stay } = useAuth().session;
  const { status } = useCheckoutStatus();
  const folio = status?.folio;
  const checkOut = new Date(`${stay.checkOut}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="min-h-screen max-w-[390px] mx-auto flex flex-col pb-2xl">
      <header className="px-page-margin pt-2xl pb-md flex items-center gap-md">
        <BackButton to="/home" />
        <div className="flex flex-col">
          <h1 className="font-headline text-title-lg">Express Checkout</h1>
          <span className="text-body-sm text-on-surface-variant">Room {room.number} • Check-out {checkOut}, 12:00 PM</span>
        </div>
      </header>

      <main className="px-page-margin flex flex-col gap-lg">
        <section aria-labelledby="bill-heading" className="card p-lg flex flex-col gap-md">
          <div className="flex items-center justify-between">
            <h2 id="bill-heading" className="font-title text-title-md">Itemized Room Service Bill</h2>
            <span className="font-mono text-mono-sm text-secondary">#F-{room.number}</span>
          </div>
          {!folio ? (
            <p className="text-body-sm text-on-surface-variant">Loading…</p>
          ) : folio.lines.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">No room service charges during your stay.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-outline-variant/60">
              {folio.lines.map((l, i) => (
                <li key={`${l.requestId}-${i}`} className="py-sm flex items-center justify-between gap-md text-body-md">
                  <span>
                    {l.qty > 1 ? `${l.qty}× ` : ''}
                    {l.name}
                    <span className="block font-mono text-mono-sm text-on-surface-variant">#{l.requestId}</span>
                  </span>
                  <span className="tabular-nums">{money(l.amount)}</span>
                </li>
              ))}
              <li className="py-sm flex items-center justify-between text-body-md text-on-surface-variant">
                <span>Service &amp; Tax (10%)</span>
                <span className="tabular-nums">{money(folio.service)}</span>
              </li>
            </ul>
          )}
        </section>

        <CheckoutCard />

        <p className="text-center text-body-sm text-on-surface-variant text-pretty">
          Reception will confirm your check-out and charge the balance to the card on file. Your door code is deactivated once approved.
        </p>
      </main>
    </div>
  );
}
