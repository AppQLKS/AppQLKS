import { Link } from 'react-router-dom';

const services = [
  { to: '/dining', title: 'Room Service & Dining', sub: 'All-day in-suite menu', icon: '🛎', tone: 'peach' },
  { to: '/housekeeping', title: 'Housekeeping', sub: 'Cleaning & amenities', icon: '🧹', tone: 'mint' },
  { to: '/concierge', title: 'AI Concierge', sub: 'Local tips & quick orders', icon: '✦', tone: 'peach' },
  { to: '/checkout', title: 'Express Checkout', sub: 'View charges & depart', icon: '🧾', tone: 'mint' },
];

export default function Home() {
  // TODO(feature/guest-auth-room-code): lấy tên khách & phòng từ phiên đăng nhập
  return (
    <>
      <div className="row-between">
        <strong>AppHotel</strong>
        <span className="pill pill-mint">● Active Stay</span>
      </div>
      <p className="muted small" style={{ marginTop: 16 }}>Good Evening, Elena</p>
      <h1>Room 305 • Deluxe King</h1>

      <h2>Suite Services</h2>
      <div className="service-grid">
        {services.map((s) => (
          <Link key={s.to} to={s.to} className="card service">
            <span className={`icon-tile ${s.tone}`}>{s.icon}</span>
            <strong>{s.title}</strong>
            <span className="muted small">{s.sub}</span>
          </Link>
        ))}
      </div>

      <h2>Active Request Tracker</h2>
      <div className="card muted small">
        {/* TODO(feature/request-tracking) */}
        Chưa có yêu cầu nào.
      </div>
    </>
  );
}
