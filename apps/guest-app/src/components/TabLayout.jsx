import { NavLink, Outlet } from 'react-router-dom';

const tabs = [
  { to: '/home', label: 'Home', icon: '⌂' },
  { to: '/dining', label: 'Dining', icon: '🛎' },
  { to: '/housekeeping', label: 'Suite Care', icon: '🧹' },
  { to: '/concierge', label: 'Concierge', icon: '✦' },
];

export default function TabLayout() {
  return (
    <>
      <div className="screen">
        <Outlet />
      </div>
      <nav className="tabbar">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>
            <span aria-hidden>{t.icon}</span>
            {t.label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
