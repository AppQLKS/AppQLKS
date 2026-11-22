import { useNavigate } from 'react-router-dom';
import { BottomNav, Icon } from '../../components/ui.jsx';
import { initialsOf, useStaffAuth } from '../../staffAuth.jsx';
import { LanguageSwitch, useI18n } from '../../i18n.jsx';
import { STAFF_NAV } from './staffNav.js';

export default function ShiftProfile() {
  const { staff, logout } = useStaffAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const signOut = async () => {
    await logout();
    navigate('/staff/login', { replace: true });
  };

  return (
    <div className="min-h-screen max-w-[390px] mx-auto px-page-margin pt-2xl pb-28 flex flex-col gap-xl">
      <h1 className="font-headline text-headline-lg">{t('profile.title')}</h1>
      <article className="card p-xl flex items-center gap-lg">
        <div className="w-14 h-14 rounded-full bg-primary text-on-primary flex items-center justify-center border border-accent/60 font-title text-title-md shrink-0">
          {initialsOf(staff.name)}
        </div>
        <div className="flex flex-col gap-xs min-w-0">
          <span className="font-title text-title-md truncate">{staff.name}</span>
          <span className="text-body-sm text-on-surface-variant">{t(`dept.${staff.department}`)}</span>
          <span className="font-mono text-mono-sm text-secondary">{staff.id}</span>
        </div>
      </article>
      {staff.email && (
        <article className="card p-lg flex items-center gap-md text-body-md">
          <Icon name="mail" className="text-title-md text-on-surface-variant" />
          {staff.email}
        </article>
      )}
      <article className="card p-lg flex items-center justify-between gap-md">
        <span className="flex items-center gap-md text-body-md">
          <Icon name="translate" className="text-title-md text-on-surface-variant" />
          {t('language.label')}
        </span>
        <LanguageSwitch />
      </article>
      <button type="button" onClick={signOut} className="btn-outline w-full px-xl py-md !text-error">
        <Icon name="logout" className="text-title-md" />
        {t('profile.signOut')}
      </button>
      <BottomNav items={STAFF_NAV} />
    </div>
  );
}
