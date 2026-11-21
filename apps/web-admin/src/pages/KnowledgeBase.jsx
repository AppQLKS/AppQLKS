import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Icon } from '../components/ui.jsx';

const TOOLS = [
  ['get_hotel_info', 'Reads this page to answer questions', 'menu_book'],
  ['get_menu', 'Room service dishes and prices', 'restaurant_menu'],
  ['place_food_order', 'Prepares an order; the guest confirms it', 'room_service'],
  ['request_housekeeping', 'Prepares cleaning or amenities; the guest confirms it', 'cleaning_services'],
  ['get_my_requests', 'Live status of the guest’s requests', 'track_changes'],
  ['get_folio', 'The guest’s room service bill', 'receipt_long'],
  ['request_checkout', 'Prepares an express check-out; the guest confirms it', 'logout'],
];

function Section({ title, icon, children }) {
  return (
    <section className="panel p-gutter-xl flex flex-col gap-gutter-md">
      <h2 className="text-headline-md flex items-center gap-2">
        <Icon name={icon} className="text-[20px] text-primary" />
        {title}
      </h2>
      {children}
    </section>
  );
}

const Rows = ({ data }) => (
  <dl className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-x-gutter-lg gap-y-gutter-sm text-body-md">
    {Object.entries(data).map(([k, v]) => (
      <div key={k} className="contents">
        <dt className="text-label-md text-on-surface-variant capitalize">{k.replace(/([A-Z])/g, ' $1')}</dt>
        <dd>{v}</dd>
      </div>
    ))}
  </dl>
);

const List = ({ items, label = 'name', detail = 'detail' }) => (
  <ul className="divide-y divide-outline-variant">
    {items.map((it) => (
      <li key={it[label]} className="py-gutter-sm flex flex-col gap-0.5">
        <span className="text-title-md">{it[label]}</span>
        <span className="text-body-sm text-on-surface-variant">{it[detail] ?? `${it.distance} · ${it.tip}`}</span>
      </li>
    ))}
  </ul>
);

/** Kiến thức mà chatbot AI dùng để trả lời khách (chỉ xem). */
export default function KnowledgeBase() {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/hotel-info').then(setInfo).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="panel p-gutter-lg text-on-error-tint">{error}</p>;
  if (!info) return <p className="text-body-sm text-on-surface-variant">Loading…</p>;

  return (
    <>
      <section className="panel p-gutter-xl flex flex-col gap-gutter-sm">
        <h2 className="text-headline-md">AI Knowledge Base</h2>
        <p className="text-body-sm text-on-surface-variant max-w-3xl">
          The AI concierge answers guests only from the information below and acts through the tools listed here. Actions that change anything (orders,
          housekeeping, check-out) are always confirmed by the guest in the app first. Edit the content in <code className="font-mono">apps/api/src/data/hotelInfo.js</code>.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter-sm pt-gutter-sm">
          {TOOLS.map(([name, desc, icon]) => (
            <div key={name} className="flex items-start gap-gutter-sm p-gutter-md rounded bg-surface-container">
              <Icon name={icon} className="text-[18px] text-on-surface-variant shrink-0" />
              <div className="flex flex-col">
                <code className="font-mono text-mono-sm">{name}</code>
                <span className="text-body-sm text-on-surface-variant">{desc}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-section">
        <Section title="Hotel" icon="apartment"><Rows data={info.hotel} /></Section>
        <Section title="Breakfast" icon="free_breakfast"><Rows data={info.breakfast} /></Section>
        <Section title="Dining" icon="restaurant"><Rows data={info.dining} /></Section>
        <Section title="Policies" icon="gavel"><Rows data={info.policies} /></Section>
        <Section title="Amenities" icon="spa"><List items={info.amenities} /></Section>
        <Section title="Nearby Attractions" icon="map"><List items={info.attractions} /></Section>
        <Section title="Wi-Fi" icon="wifi"><Rows data={info.wifi} /></Section>
        <Section title="Transport" icon="local_taxi"><Rows data={info.transport} /></Section>
      </div>
    </>
  );
}
