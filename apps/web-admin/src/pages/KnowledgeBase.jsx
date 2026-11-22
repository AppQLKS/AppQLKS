import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Icon } from '../components/ui.jsx';
import { useI18n } from '../i18n.jsx';

const TOOLS = [
  ['get_hotel_info', 'menu_book'],
  ['get_menu', 'restaurant_menu'],
  ['place_food_order', 'room_service'],
  ['request_housekeeping', 'cleaning_services'],
  ['get_my_requests', 'track_changes'],
  ['get_folio', 'receipt_long'],
  ['request_checkout', 'logout'],
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
  const { t, apiError } = useI18n();

  useEffect(() => {
    api('/hotel-info').then(setInfo).catch((e) => setError(apiError(e)));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <p className="panel p-gutter-lg text-on-error-tint">{error}</p>;
  if (!info) return <p className="text-body-sm text-on-surface-variant">{t('kb.loading')}</p>;

  return (
    <>
      <section className="panel p-gutter-xl flex flex-col gap-gutter-sm">
        <h2 className="text-headline-md">{t('kb.title')}</h2>
        <p className="text-body-sm text-on-surface-variant max-w-3xl">
          {t('kb.intro')} <code className="font-mono">apps/api/src/data/hotelInfo.js</code>. {t('kb.contentNote')}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter-sm pt-gutter-sm">
          {TOOLS.map(([name, icon]) => (
            <div key={name} className="flex items-start gap-gutter-sm p-gutter-md rounded bg-surface-container">
              <Icon name={icon} className="text-[18px] text-on-surface-variant shrink-0" />
              <div className="flex flex-col">
                <code className="font-mono text-mono-sm">{name}</code>
                <span className="text-body-sm text-on-surface-variant">{t(`kb.tool.${name}`)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-section">
        <Section title={t('kb.hotel')} icon="apartment"><Rows data={info.hotel} /></Section>
        <Section title={t('kb.breakfast')} icon="free_breakfast"><Rows data={info.breakfast} /></Section>
        <Section title={t('kb.dining')} icon="restaurant"><Rows data={info.dining} /></Section>
        <Section title={t('kb.policies')} icon="gavel"><Rows data={info.policies} /></Section>
        <Section title={t('kb.amenities')} icon="spa"><List items={info.amenities} /></Section>
        <Section title={t('kb.attractions')} icon="map"><List items={info.attractions} /></Section>
        <Section title={t('kb.wifi')} icon="wifi"><Rows data={info.wifi} /></Section>
        <Section title={t('kb.transport')} icon="local_taxi"><Rows data={info.transport} /></Section>
      </div>
    </>
  );
}
