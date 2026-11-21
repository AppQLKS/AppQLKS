import { NavLink, Outlet } from 'react-router-dom';

const nav = [
  { to: '/rooms', label: 'Room Grid & Check-in', icon: '▦' },
  { to: '/kitchen', label: 'F&B Kitchen Orders', icon: '🍴' },
  { to: '/housekeeping', label: 'Housekeeping Queue', icon: '🧹' },
  { to: '/knowledge', label: 'AI Knowledge Base', icon: '✦' },
  { to: '/analytics', label: 'Analytics & Reports', icon: '▮' },
];

export default function Layout() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">▣</div>
          <div>
            <div className="brand-name">AppHotel</div>
            <div className="brand-sub">Admin & Staff Portal</div>
          </div>
        </div>
        <div className="role-pill">
          <span className="dot dot-green" /> Role: Reception
        </div>
        <nav className="nav">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
              <span className="nav-icon" aria-hidden>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="avatar">ML</div>
          <div>
            <div className="user-name">Maya Lin</div>
            <div className="user-sub">Reception · Evening Shift</div>
          </div>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
