import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { api } from '../api.js';
import { ROLES, useStaff } from '../staff.jsx';
import { Icon, initials } from './ui.jsx';

export default function Layout() {
  const { staff, setStaff } = useStaff();
  const [menuOpen, setMenuOpen] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');

  const reload = useCallback(() => {
    Promise.all([api('/rooms'), api('/requests')])
      .then(([r, q]) => {
        setRooms(r);
        setRequests(q);
        setError('');
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(reload, [reload]);

  const open = (dept) => requests.filter((r) => r.department === dept && r.status !== 'completed').length;

  const nav = [
    { to: '/rooms', label: 'Room Grid & Check-in', icon: 'grid_view' },
    { to: '/kitchen', label: 'F&B Kitchen Orders', icon: 'restaurant', badge: open('kitchen'), tone: 'bg-amber-tint text-on-amber-tint' },
    { to: '/housekeeping', label: 'Housekeeping Queue', icon: 'cleaning_services', badge: open('housekeeping'), tone: 'bg-blue-tint text-on-blue-tint' },
    { to: '/knowledge', label: 'AI Knowledge Base', icon: 'auto_awesome' },
    { to: '/analytics', label: 'Analytics & Reports', icon: 'bar_chart' },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-surface">
      <aside className="w-full lg:w-72 shrink-0 bg-sidebar-surface text-on-brand-slate flex flex-col justify-between lg:min-h-screen border-b lg:border-b-0 lg:border-r border-sidebar-active">
        <div className="p-gutter-xl flex flex-col gap-section">
          <div className="flex items-center gap-gutter-md">
            <div className="w-9 h-9 rounded bg-primary flex items-center justify-center shrink-0">
              <Icon name="apartment" className="text-[20px] text-on-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-title-md">AppHotel</span>
              <span className="text-label-sm text-sidebar-muted">Admin &amp; Staff Portal</span>
            </div>
          </div>

          <div className="relative">
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-haspopup="listbox"
              onClick={() => setMenuOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-2 px-gutter-md py-gutter-sm rounded bg-sidebar-active border border-sidebar-muted/25 hover:border-sidebar-muted/50 transition-colors duration-state-change"
            >
              <span className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-status-emerald shrink-0" aria-hidden="true" />
                <span className="text-label-md truncate">Role: {staff.role}</span>
              </span>
              <Icon name="unfold_more" className="text-[18px] text-sidebar-muted shrink-0" />
            </button>
            {menuOpen && (
              <div role="listbox" aria-label="Switch staff role" className="absolute left-0 right-0 mt-1.5 bg-surface-low text-on-surface border border-outline-variant rounded shadow-lg z-30 py-1">
                {ROLES.map((r) => (
                  <button
                    key={r.role}
                    type="button"
                    role="option"
                    aria-selected={r.role === staff.role}
                    onClick={() => {
                      setStaff(r);
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-label-md hover:bg-surface-container flex items-center justify-between"
                  >
                    <span>{r.role}</span>
                    <span className="text-body-sm text-on-surface-variant">{r.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <nav aria-label="Main navigation" className="flex flex-col gap-gutter-xs">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-between gap-2 px-gutter-md py-2.5 rounded transition-colors duration-state-change ${
                    isActive ? 'bg-sidebar-active text-on-brand-slate' : 'text-sidebar-muted hover:bg-sidebar-active hover:text-on-brand-slate'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="flex items-center gap-gutter-md min-w-0">
                      <Icon name={item.icon} className={`text-[20px] shrink-0 ${isActive ? 'text-status-blue' : ''}`} />
                      <span className="text-label-lg whitespace-nowrap">{item.label}</span>
                    </span>
                    {item.badge > 0 && <span className={`text-label-sm px-2 py-0.5 rounded-full tabular-nums shrink-0 ${item.tone}`}>{item.badge}</span>}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="p-gutter-xl border-t border-sidebar-active hidden lg:flex items-center gap-gutter-md">
          <div className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center text-label-md shrink-0">{initials(staff.name)}</div>
          <div className="flex flex-col min-w-0">
            <span className="text-label-lg truncate">{staff.name}</span>
            <span className="text-label-sm text-sidebar-muted truncate">{staff.role} · Evening Shift</span>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-surface-low border-b border-outline-variant px-page-margin py-gutter-lg flex flex-wrap items-center justify-between gap-gutter-md">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-headline-lg">Live Property Operations</h1>
            <p className="text-body-sm text-on-surface-variant">
              The Laurel Boutique Hotel · {rooms.length} Suites &amp; Lofts ·{' '}
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-gutter-md">
            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${error ? 'bg-error-tint text-on-error-tint' : 'bg-emerald-tint text-on-emerald-tint'}`}>
              <span className={`w-2 h-2 rounded-full ${error ? 'bg-status-error' : 'bg-status-emerald'}`} aria-hidden="true" />
              <span className="text-label-md">{error ? 'API Offline' : 'Sync Live'}</span>
            </span>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded bg-surface-container border border-outline-variant">
              <Icon name="person" className="text-[16px] text-on-surface-variant" />
              <span className="text-label-md">{staff.name} ({staff.role})</span>
            </div>
          </div>
        </header>

        <main className="p-page-margin flex flex-col gap-section">
          {error && (
            <p className="panel p-gutter-lg text-body-sm text-on-error-tint">
              Could not reach the API ({error}). Run <code className="font-mono">npm run dev:api</code>.
            </p>
          )}
          <Outlet context={{ rooms, requests, setRequests, reload }} />
        </main>
      </div>
    </div>
  );
}
