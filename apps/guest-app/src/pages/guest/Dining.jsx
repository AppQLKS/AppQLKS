import { useEffect, useMemo, useState } from 'react';
import { api, DEMO_ROOM } from '../../api.js';
import { BackButton, Icon, money } from '../../components/ui.jsx';

const categories = [
  { id: 'all', label: 'All' },
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'local', label: 'Local Cuisine' },
  { id: 'drinks', label: 'Drinks' },
];

export default function Dining() {
  const [menu, setMenu] = useState([]);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState({}); // { itemId: qty }
  const [note, setNote] = useState('');

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
  const add = (id) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));

  return (
    <div className="min-h-screen max-w-[390px] mx-auto flex flex-col pb-48">
      <header className="px-page-margin pt-2xl pb-md flex items-center justify-between gap-md">
        <div className="flex items-center gap-md">
          <BackButton to="/home" />
          <div className="flex flex-col">
            <h1 className="font-headline text-title-lg">Room Service &amp; Dining</h1>
            <span className="text-body-sm text-on-surface-variant">Delivering to Room {DEMO_ROOM}</span>
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
              {item.image ? (
                <img src={item.image} alt={item.name} className="w-24 h-24 rounded-md object-cover shrink-0 bg-surface-container-low" />
              ) : (
                <div className="w-24 h-24 rounded-md bg-surface-container-low flex items-center justify-center shrink-0">
                  <Icon name="restaurant" className="text-headline-md text-outline" />
                </div>
              )}
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
                  <button
                    type="button"
                    onClick={() => add(item.id)}
                    aria-label={`Add ${item.name} to order`}
                    className="relative inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary text-on-primary hover:opacity-90 active:scale-95 transition duration-state-change"
                  >
                    <Icon name="add" className="text-title-md" />
                    {cart[item.id] > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-[3px] rounded-full bg-accent text-on-accent font-label text-label-sm flex items-center justify-center tabular-nums">
                        {cart[item.id]}
                      </span>
                    )}
                  </button>
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
            aria-label="Special request note"
            placeholder="Special request (e.g. Less spicy, no onions)"
            className="w-full px-md py-sm rounded-md bg-surface-container-low border border-outline-variant text-body-sm placeholder:text-on-surface-variant focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>
        <div className="flex items-center justify-between gap-md">
          <div className="flex items-center gap-sm">
            <span role="status" className="inline-flex items-center justify-center min-w-[24px] h-6 px-xs rounded-full bg-accent text-on-accent font-label text-label-sm tabular-nums">
              {count}
            </span>
            <div className="flex flex-col">
              <span className="font-title text-title-md tabular-nums">{money(total)}</span>
              <span className="text-body-sm text-on-surface-variant">Room {DEMO_ROOM} folio</span>
            </div>
          </div>
          {/* TODO(feature/room-service-dining): POST /api/requests { type: 'food', items, note } */}
          <button type="button" disabled={count === 0} className="btn-primary px-xl py-md">
            Place Order
          </button>
        </div>
      </aside>
    </div>
  );
}
