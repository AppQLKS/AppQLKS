import { useState } from 'react';
import { useStaff } from '../staff.jsx';
import { Icon, StatusBadge, elapsedLabel, initials } from './ui.jsx';

const TABS = [
  { id: 'all', label: 'All Departments' },
  { id: 'kitchen', label: 'Kitchen / F&B' },
  { id: 'housekeeping', label: 'Housekeeping' },
];

const itemsText = (items) => items.map((i) => (i.qty > 1 ? `${i.qty}x ${i.name}` : i.name)).join(' & ');

export default function TaskQueueTable({ requests, setRequests, initialDept = 'all' }) {
  const { staff } = useStaff();
  const [dept, setDept] = useState(initialDept);
  const rows = requests.filter((r) => dept === 'all' || r.department === dept);

  // TODO(feature/staff-web-portal): POST /api/requests/:id/claim (khoá ở server để tránh 2 người nhận cùng lúc)
  const claim = (id) =>
    setRequests((list) =>
      list.map((r) => (r.id === id && r.status === 'pending' ? { ...r, status: 'in_progress', assignedTo: staff.id, assignee: { id: staff.id, name: staff.name } } : r)),
    );

  return (
    <section aria-label="Live Multi-Department Task Queue" className="panel flex flex-col">
      <div className="p-gutter-xl border-b border-outline-variant flex flex-wrap items-center justify-between gap-gutter-md">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-headline-md">Live Multi-Department Task Queue</h2>
          <p className="text-body-sm text-on-surface-variant">Claim pending requests to lock ownership and prevent duplicate staff dispatch.</p>
        </div>
        <div role="tablist" aria-label="Department filters" className="inline-flex items-center p-1 rounded bg-surface-container border border-outline-variant gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={dept === t.id}
              onClick={() => setDept(t.id)}
              className={`px-3 py-1.5 rounded-sm text-label-lg transition-colors duration-state-change ${
                dept === t.id ? 'bg-surface-low text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-outline-variant bg-surface text-label-md text-on-surface-variant">
              {['Request ID', 'Room', 'Service Type & Items', 'Elapsed', 'Assigned Staff', 'Status'].map((h) => (
                <th key={h} scope="col" className="py-3 px-4 whitespace-nowrap font-medium">{h}</th>
              ))}
              <th scope="col" className="py-3 px-4 text-right whitespace-nowrap font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {rows.map((t) => (
              <tr key={t.id} className="hover:bg-surface transition-colors duration-state-change">
                <td className="py-3.5 px-4 font-mono text-mono-sm text-on-surface-variant tabular-nums whitespace-nowrap">#{t.id}</td>
                <td className="py-3.5 px-4 text-title-md tabular-nums whitespace-nowrap">{t.roomNumber}</td>
                <td className="py-3.5 px-4">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-body-md">{t.title} · {itemsText(t.items)}</span>
                    {t.note && <span className="text-body-sm text-on-surface-variant">Note: {t.note}</span>}
                  </div>
                </td>
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-sm bg-surface-container text-on-surface-variant text-label-sm tabular-nums">{elapsedLabel(t.createdAt)}</span>
                </td>
                <td className="py-3.5 px-4">
                  {t.assignee ? (
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-brand-slate text-on-brand-slate flex items-center justify-center text-label-sm shrink-0">{initials(t.assignee.name)}</span>
                      <span className="text-body-sm whitespace-nowrap">{t.assignee.name}</span>
                    </div>
                  ) : (
                    <span className="text-body-sm text-on-surface-variant">Unassigned</span>
                  )}
                </td>
                <td className="py-3.5 px-4 whitespace-nowrap"><StatusBadge status={t.status} /></td>
                <td className="py-3.5 px-4 text-right">
                  {t.status === 'pending' ? (
                    <button type="button" onClick={() => claim(t.id)} className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded bg-primary text-on-primary hover:bg-on-blue-tint transition-colors duration-state-change whitespace-nowrap">
                      <Icon name="lock" className="text-[15px]" />
                      <span className="text-label-lg">Claim Task</span>
                    </button>
                  ) : (
                    <button type="button" disabled className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded bg-surface-container text-on-surface-variant border border-outline-variant cursor-not-allowed whitespace-nowrap">
                      <Icon name="verified_user" className="text-[15px]" />
                      <span className="text-label-lg">{t.status === 'completed' ? 'Done' : 'Locked'}</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-6 px-4 text-center text-body-sm text-on-surface-variant">No requests.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
