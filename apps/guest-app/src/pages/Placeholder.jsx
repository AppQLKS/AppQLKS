import { BottomNav } from '../components/ui.jsx';
import { useI18n } from '../i18n.jsx';

export default function Placeholder({ title, titleKey, branch, nav }) {
  const { t } = useI18n();
  return (
    <div className="min-h-screen max-w-[390px] mx-auto px-page-margin pt-2xl pb-24 flex flex-col gap-sm">
      <h1 className="font-headline text-headline-lg">{titleKey ? t(titleKey) : title}</h1>
      {branch && (
        <p className="text-body-sm text-on-surface-variant">{t('common.comingIn', { branch })}</p>
      )}
      {nav && <BottomNav items={nav} />}
    </div>
  );
}
