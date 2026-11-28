import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api.js';
import { Icon, initials } from '../components/ui.jsx';
import { useI18n } from '../i18n.jsx';
import { useStaff } from '../staff.jsx';

const DEPARTMENTS = ['reception', 'kitchen', 'housekeeping', 'manager'];
const MIN_PASSWORD = 8;
const inputClass = 'w-full rounded border-outline bg-surface text-body-md focus:border-primary focus:ring-primary';
const primaryBtn =
  'w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded text-on-primary bg-primary hover:bg-on-blue-tint disabled:opacity-60 transition-colors duration-state-change';

/** Mật khẩu ngẫu nhiên 12 ký tự, bỏ các ký tự dễ nhầm (0/O, 1/l/I). */
function randomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

function PasswordField({ value, onChange }) {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  return (
    <label className="flex flex-col gap-1">
      <span className="text-label-md">{t('staffAdmin.password')}</span>
      <div className="flex items-center gap-2">
        <div className="relative flex-1 flex items-center">
          <input
            type={show ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required
            minLength={MIN_PASSWORD}
            autoComplete="new-password"
            className={`${inputClass} pr-10 font-mono`}
          />
          <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? t('login.hidePassword') : t('login.showPassword')} className="absolute right-1 w-8 h-8 inline-flex items-center justify-center rounded text-on-surface-variant hover:text-on-surface">
            <Icon name={show ? 'visibility_off' : 'visibility'} className="text-[18px]" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(randomPassword());
            setShow(true);
          }}
          className="btn-sm shrink-0"
        >
          <Icon name="casino" className="text-[15px]" />
          <span className="text-label-sm whitespace-nowrap">{t('staffAdmin.generate')}</span>
        </button>
      </div>
      <span className="text-label-sm text-on-surface-variant">{t('staffAdmin.passwordHint', { n: MIN_PASSWORD })}</span>
    </label>
  );
}

/** Ngăn bên phải: thêm nhân viên / sửa thông tin / đặt lại mật khẩu. */
function StaffPanel({ mode, member, isSelf, onClose, onSaved }) {
  const { t, apiError } = useI18n();
  const [name, setName] = useState(member?.name ?? '');
  const [email, setEmail] = useState(member?.email ?? '');
  const [department, setDepartment] = useState(member?.department ?? 'housekeeping');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (mode === 'create') {
        const created = await api('/staff', { method: 'POST', body: JSON.stringify({ name, email, department, password }) });
        onSaved(t('staffAdmin.created', { id: created.id, name: created.name }), created.id);
      } else if (mode === 'edit') {
        await api(`/staff/${member.id}`, { method: 'PATCH', body: JSON.stringify({ name, email, department }) });
        onSaved(t('staffAdmin.updated', { name }), member.id);
      } else {
        await api(`/staff/${member.id}/password`, { method: 'POST', body: JSON.stringify({ password }) });
        onSaved(t('staffAdmin.passwordReset', { name: member.name }), member.id);
      }
    } catch (err) {
      setError(apiError(err));
      setBusy(false);
    }
  };

  const title = mode === 'create' ? t('staffAdmin.addTitle') : mode === 'edit' ? t('staffAdmin.editTitle') : t('staffAdmin.resetTitle');

  return (
    <aside aria-label={title} className="xl:col-span-4 panel !shadow-md p-gutter-xl flex flex-col gap-gutter-lg">
      <div className="flex items-start justify-between gap-gutter-md pb-gutter-md border-b border-outline-variant">
        <div className="flex flex-col gap-1">
          <h3 className="text-headline-md">{title}</h3>
          {member && <p className="text-body-sm text-on-surface-variant">{member.name} · <span className="font-mono">{member.id}</span></p>}
        </div>
        <button type="button" onClick={onClose} aria-label={t('staffAdmin.close')} className="inline-flex items-center justify-center w-8 h-8 rounded bg-surface-low text-on-surface-variant border border-outline-variant hover:bg-surface-container hover:text-on-surface transition-colors duration-state-change">
          <Icon name="close" className="text-[18px]" />
        </button>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-gutter-lg">
        {mode !== 'password' && (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-label-md">{t('staffAdmin.name')}</span>
              <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoComplete="off" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-label-md">{t('staffAdmin.email')}</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={120} autoComplete="off" placeholder="ten@apphotel.vn" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-label-md">{t('staffAdmin.department')}</span>
              <select value={department} onChange={(e) => setDepartment(e.target.value)} disabled={isSelf} className={inputClass}>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{t(`dept.${d}`)}</option>
                ))}
              </select>
              {isSelf && <span className="text-label-sm text-on-surface-variant">{t('staffAdmin.ownDepartment')}</span>}
              {mode === 'create' && <span className="text-label-sm text-on-surface-variant">{t('staffAdmin.idHint')}</span>}
            </label>
          </>
        )}

        {mode !== 'edit' && <PasswordField value={password} onChange={setPassword} />}
        {mode === 'password' && <p className="text-body-sm text-on-surface-variant">{t('staffAdmin.resetHint')}</p>}

        {error && <p role="alert" className="text-body-sm text-on-error-tint">{error}</p>}
        <button type="submit" disabled={busy} className={primaryBtn}>
          <Icon name={mode === 'create' ? 'person_add' : mode === 'edit' ? 'save' : 'key'} className="text-[18px]" />
          <span className="text-label-lg">{busy ? t('staffAdmin.saving') : mode === 'create' ? t('staffAdmin.create') : mode === 'edit' ? t('staffAdmin.save') : t('staffAdmin.resetSubmit')}</span>
        </button>
      </form>
    </aside>
  );
}

/** Quản lý tài khoản nhân viên (chỉ quản lý). */
export default function StaffAccounts() {
  const { staff: me } = useStaff();
  const { t, apiError } = useI18n();
  const [list, setList] = useState(null);
  const [panel, setPanel] = useState(null); // { mode, member? }
  const [message, setMessage] = useState(null); // { tone, text }
  const [highlight, setHighlight] = useState(null);
  const [busy, setBusy] = useState(null);

  const isManager = me.department === 'manager';
  const load = useCallback(() => {
    if (!isManager) return;
    api('/staff')
      .then(setList)
      .catch((e) => setMessage({ tone: 'error', text: apiError(e) }));
  }, [isManager]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(load, [load]);

  if (!isManager) return <Navigate to="/rooms" replace />;

  const open = (mode, member) => {
    setMessage(null);
    setPanel({ mode, member });
  };

  const toggleActive = async (member) => {
    const turnOff = member.active;
    const question = turnOff ? t('staffAdmin.confirmDeactivate', { name: member.name, n: member.activeTasks }) : t('staffAdmin.confirmActivate', { name: member.name });
    if (!window.confirm(question)) return;
    setBusy(member.id);
    setMessage(null);
    try {
      await api(`/staff/${member.id}/active`, { method: 'POST', body: JSON.stringify({ active: !turnOff }) });
      setMessage({ tone: 'ok', text: t(turnOff ? 'staffAdmin.deactivated' : 'staffAdmin.activated', { name: member.name }) });
      load();
    } catch (e) {
      setMessage({ tone: 'error', text: apiError(e) });
    } finally {
      setBusy(null);
    }
  };

  const active = list?.filter((s) => s.active).length ?? 0;
  // Khi mở ngăn bên phải, bảng hẹp lại: ẩn cột email để nút thao tác không bị đẩy khỏi màn hình
  const emailCol = panel ? 'hidden 2xl:table-cell' : '';
  const actionLabel = panel ? 'sr-only' : '';

  return (
    <section aria-label={t('staffAdmin.title')} className="grid grid-cols-1 xl:grid-cols-12 gap-section items-start">
      <div className={`${panel ? 'xl:col-span-8' : 'xl:col-span-12'} panel flex flex-col`}>
        <div className="p-gutter-xl border-b border-outline-variant flex flex-wrap items-center justify-between gap-gutter-md">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-headline-md">{t('staffAdmin.title')}</h2>
            <p className="text-body-sm text-on-surface-variant">{list ? t('staffAdmin.summary', { a: active, b: list.length }) : t('kb.loading')}</p>
          </div>
          <button type="button" onClick={() => open('create')} className="inline-flex items-center gap-2 px-4 py-2 rounded bg-primary text-on-primary hover:bg-on-blue-tint transition-colors duration-state-change">
            <Icon name="person_add" className="text-[18px]" />
            <span className="text-label-lg whitespace-nowrap">{t('staffAdmin.add')}</span>
          </button>
        </div>

        {message && (
          <p role={message.tone === 'error' ? 'alert' : 'status'} className={`mx-gutter-xl mt-gutter-md flex items-start gap-2 p-gutter-md rounded text-body-sm ${message.tone === 'ok' ? 'bg-emerald-tint text-on-emerald-tint' : 'bg-error-tint text-on-error-tint'}`}>
            <Icon name={message.tone === 'ok' ? 'check_circle' : 'error'} className="text-[18px] shrink-0" />
            {message.text}
          </p>
        )}

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant bg-surface text-label-md text-on-surface-variant">
                {['member', 'email', 'department', 'status', 'tasks'].map((c) => (
                  <th key={c} scope="col" className={`py-3 px-4 whitespace-nowrap font-medium ${c === 'email' ? emailCol : ''}`}>{t(`staffAdmin.col.${c}`)}</th>
                ))}
                <th scope="col" className="py-3 px-4 text-right whitespace-nowrap font-medium">{t('queue.col.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {list?.map((s) => {
                const self = s.id === me.id;
                return (
                  <tr key={s.id} className={`transition-colors duration-state-change ${s.id === highlight ? 'bg-emerald-tint/50' : 'hover:bg-surface'} ${s.active ? '' : '[&>td:not(:last-child)]:opacity-60'}`}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="w-8 h-8 rounded-full bg-brand-slate text-on-brand-slate flex items-center justify-center text-label-sm shrink-0">{initials(s.name)}</span>
                        <div className="flex flex-col min-w-0">
                          <span className="text-body-md whitespace-nowrap">
                            {s.name}
                            {self && <span className="text-label-sm text-on-surface-variant"> {t('staffAdmin.you')}</span>}
                          </span>
                          <span className="font-mono text-mono-sm text-on-surface-variant">{s.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className={`py-3 px-4 text-body-sm whitespace-nowrap ${emailCol}`}>{s.email}</td>
                    <td className="py-3 px-4 text-body-sm whitespace-nowrap">{t(`dept.${s.department}`)}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-sm ${s.active ? 'bg-emerald-tint text-on-emerald-tint' : 'bg-surface-container text-on-surface-variant'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.active ? 'bg-status-emerald' : 'bg-outline'}`} aria-hidden="true" />
                        {t(s.active ? 'staffAdmin.active' : 'staffAdmin.inactive')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-body-sm tabular-nums">{s.activeTasks}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button type="button" onClick={() => open('edit', s)} className="btn-sm" title={t('staffAdmin.edit')}>
                          <Icon name="edit" className="text-[15px]" />
                          <span className={`text-label-sm whitespace-nowrap ${actionLabel}`}>{t('staffAdmin.edit')}</span>
                        </button>
                        <button type="button" onClick={() => open('password', s)} className="btn-sm" title={t('staffAdmin.reset')}>
                          <Icon name="key" className="text-[15px]" />
                          <span className={`text-label-sm whitespace-nowrap ${actionLabel}`}>{t('staffAdmin.reset')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleActive(s)}
                          disabled={self || busy === s.id}
                          title={self ? t('staffAdmin.cannotSelf') : t(s.active ? 'staffAdmin.deactivate' : 'staffAdmin.activate')}
                          className={`btn-sm disabled:opacity-50 disabled:cursor-not-allowed ${s.active ? '!text-on-error-tint' : ''}`}
                        >
                          <Icon name={s.active ? 'block' : 'check_circle'} className="text-[15px]" />
                          <span className={`text-label-sm whitespace-nowrap ${actionLabel}`}>{t(s.active ? 'staffAdmin.deactivate' : 'staffAdmin.activate')}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {panel && (
        <StaffPanel
          key={`${panel.mode}-${panel.member?.id ?? 'new'}`}
          mode={panel.mode}
          member={panel.member}
          isSelf={panel.member?.id === me.id}
          onClose={() => setPanel(null)}
          onSaved={(text, id) => {
            setPanel(null);
            setMessage({ tone: 'ok', text });
            setHighlight(id);
            setTimeout(() => setHighlight(null), 2500);
            load();
          }}
        />
      )}
    </section>
  );
}
