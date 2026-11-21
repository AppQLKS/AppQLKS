import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { BackButton, Icon, money } from '../../components/ui.jsx';

const MAX_QTY = 10;
const MAX_NOTE = 200;

/** Ảnh món; nếu không có hoặc link hỏng thì hiện biểu tượng. */
function DishImage({ item }) {
  const [broken, setBroken] = useState(false);
  if (!item.image || broken) {
    return (
      <div className="w-24 h-24 rounded-md bg-surface-container-low flex items-center justify-center shrink-0" aria-hidden="true">
        <Icon name={item.category === 'drinks' ? 'local_cafe' : 'restaurant'} className="text-headline-md text-outline" />
      </div>
    );
  }
  return (
    <img
      src={item.image}
      alt={item.name}
      loading="lazy"
      onError={() => setBroken(true)}
      className="w-24 h-24 rounded-md object-cover shrink-0 bg-surface-container-low"
    />
  );
}

function OrderPlaced({ order, onNew }) {
  const total = order.items.reduce((s, i) => s + i.price * i.qty, 0);
  return (
    <div className="min-h-screen max-w-[390px] mx-auto px-page-margin py-3xl flex flex-col justify-center gap-xl">
      <div className="flex flex-col items-center text-center gap-md">
        <div className="w-16 h-16 rounded-full bg-success-container flex items-center justify-center">
          <Icon name="check_circle" filled className="text-[36px] text-primary" />
        </div>
        <h1 className="font-headline text-headline-lg">Order Sent to Kitchen</h1>
        <p className="text-body-md text-on-surface-variant">
          Estimated delivery in about <span className="font-semibold text-on-surface">{order.etaMinutes} min</span> to Room {order.roomNumber}.
        </p>
      </div>
      <article className="card p-lg flex flex-col gap-md">
        <div className="flex items-center justify-between">
          <span className="font-label text-label-md text-secondary uppercase tracking-wider">Request</span>
          <span className="font-mono text-mono-sm tabular-nums">#{order.id}</span>
        </div>
        <ul className="flex flex-col gap-xs border-t border-outline-variant/60 pt-md">
          {order.items.map((i) => (
            <li key={i.menuId} className="flex items-center justify-between text-body-md">
              <span>{i.qty}× {i.name}</span>
              <span className="tabular-nums">{money(i.price * i.qty)}</span>
            </li>
          ))}
        </ul>
        {order.note && <p className="text-body-sm text-on-surface-variant">Note: {order.note}</p>}
        <div className="flex items-center justify-between border-t border-outline-variant/60 pt-md font-title text-title-sm">
          <span>Added to your folio</span>
          <span className="tabular-nums">{money(total)}</span>
        </div>
      </article>
      <div className="flex flex-col gap-sm">
        <Link to="/home" className="btn-primary w-full px-xl py-lg">Track My Order</Link>
        <button type="button" onClick={onNew} className="btn-outline w-full px-xl py-md">Order Something Else</button>
      </div>
    </div>
  );
}

const categories = [
  { id: 'all', label: 'All' },
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'local', label: 'Local Cuisine' },
  { id: 'drinks', label: 'Drinks' },
];

export default function Dining() {
  const { room } = useAuth().session;
  const [menu, setMenu] = useState([]);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState({}); // { itemId: qty }
  const [note, setNote] = useState('');
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [placed, setPlaced] = useState(null);

  useEffect(() => {
    api('/menu').then(setMenu).catch((e) => setError(e.message));
  }, []);

  const visible = useMemo(
    () =>
      menu.filter(
        (m) =>
          (category === 'all' || m.category === category) &&
          m.name.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [menu, category, search],
  );

  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const total = menu.reduce((sum, m) => sum + (cart[m.id] ?? 0) * m.price, 0);
  const change = (id, delta) =>
    setCart((c) => {
      const qty = Math.min(MAX_QTY, Math.max(0, (c[id] ?? 0) + delta));
      const { [id]: _, ...rest } = c;
      return qty ? { ...rest, [id]: qty } : rest;
    });

  const placeOrder = async () => {
    setPlacing(true);
    setOrderError('');
    try {
      const order = await api('/me/requests', {
        method: 'POST',
        body: JSON.stringify({
          type: 'food',
          items: Object.entries(cart).map(([menuId, qty]) => ({ menuId, qty })),
          note,
        }),
      });
      setPlaced(order);
      setCart({});
      setNote('');
    } catch (e) {
      setOrderError(e.message);
    } finally {
      setPlacing(false);
    }
  };

  if (placed) return <OrderPlaced order={placed} onNew={() => setPlaced(null)} />;

  return (
    <div className="min-h-screen max-w-[390px] mx-auto flex flex-col pb-48">
      <header className="px-page-margin pt-2xl pb-md flex items-center justify-between gap-md">
        <div className="flex items-center gap-md">
          <BackButton to="/home" />
          <div className="flex flex-col">
            <h1 className="font-headline text-title-lg">Room Service &amp; Dining</h1>
            <span className="text-body-sm text-on-surface-variant">Delivering to Room {room.number}</span>
          </div>
        </div>
        <span className="inline-flex items-center px-md py-xs rounded-full bg-secondary-container text-on-secondary-container font-label text-label-sm shrink-0">
          24h Kitchen
        </span>
      </header>

      <main className="px-page-margin flex flex-col gap-lg">
        <label className="relative flex items-center">
          <span className="sr-only">Search menu</span>
          <Icon name="search" className="text-title-md text-outline absolute left-md" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dishes, coffee, desserts..."
            className="w-full pl-3xl pr-lg py-md rounded-md bg-surface-container-lowest border border-outline-variant text-body-md placeholder:text-on-surface-variant focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </label>

        <div className="flex items-center gap-sm overflow-x-auto pb-xs" role="tablist" aria-label="Menu categories">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={category === c.id}
              onClick={() => setCategory(c.id)}
              className={`pill ${category === c.id ? 'pill-active' : 'pill-idle'}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {error && <p className="text-body-sm text-error">Could not load the menu: {error}</p>}

        <section aria-label="Menu items" className="flex flex-col gap-md">
          {visible.map((item) => (
            <article key={item.id} className="card p-md flex items-center gap-md">
              <DishImage item={item} />
              <div className="flex-1 flex flex-col justify-between gap-sm min-w-0">
                <div className="flex flex-col gap-xs">
                  <h2 className="font-title text-title-sm">{item.name}</h2>
                  <p className="text-body-sm text-on-surface-variant">{item.description}</p>
                </div>
                <div className="flex items-center justify-between gap-sm">
                  <div className="flex items-center gap-sm">
                    <span className="font-title text-title-sm tabular-nums">{money(item.price)}</span>
                    <span className="inline-flex items-center gap-xs text-body-sm text-on-surface-variant tabular-nums">
                      <Icon name="schedule" className="text-label-md" />
                      {item.prepMinutes} min
                    </span>
                  </div>
                  <div className="flex items-center gap-xs shrink-0">
                    {cart[item.id] > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => change(item.id, -1)}
                          aria-label={`Remove one ${item.name}`}
                          className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-surface-container-low border border-outline-variant text-on-surface hover:bg-surface-container active:scale-95 transition duration-state-change"
                        >
                          <Icon name="remove" className="text-title-md" />
                        </button>
                        <span className="min-w-[20px] text-center font-title text-title-sm tabular-nums" aria-live="polite">
                          {cart[item.id]}
                        </span>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => change(item.id, 1)}
                      disabled={cart[item.id] >= MAX_QTY}
                      aria-label={`Add ${item.name} to order`}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary text-on-primary hover:opacity-90 active:scale-95 disabled:opacity-40 transition duration-state-change"
                    >
                      <Icon name="add" className="text-title-md" />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>

      <aside aria-label="Order Cart" className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-surface-container-lowest border-t border-outline-variant shadow-lg px-page-margin pt-md pb-xl z-20 flex flex-col gap-md">
        <div className="flex items-center gap-sm">
          <Icon name="edit_note" className="text-title-md text-secondary shrink-0" />
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={MAX_NOTE}
            aria-label="Special request note"
            placeholder="Special request (e.g. Less spicy, no onions)"
            className="w-full px-md py-sm rounded-md bg-surface-container-low border border-outline-variant text-body-sm placeholder:text-on-surface-variant focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        {orderError && (
          <p role="alert" className="flex items-start gap-xs text-body-sm text-error">
            <Icon name="error" className="text-title-sm shrink-0 mt-[1px]" />
            {orderError}
          </p>
        )}
        <div className="flex items-center justify-between gap-md">
          <div className="flex items-center gap-sm">
            <span role="status" className="inline-flex items-center justify-center min-w-[24px] h-6 px-xs rounded-full bg-accent text-on-accent font-label text-label-sm tabular-nums">
              {count}
            </span>
            <div className="flex flex-col">
              <span className="font-title text-title-md tabular-nums">{money(total)}</span>
              <span className="text-body-sm text-on-surface-variant">Room {room.number} folio</span>
            </div>
          </div>
          <button type="button" onClick={placeOrder} disabled={count === 0 || placing} className="btn-primary px-xl py-md">
            {placing ? 'Sending…' : 'Place Order'}
          </button>
        </div>
      </aside>
    </div>
  );
}
