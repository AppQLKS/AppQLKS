import { useI18n } from '../i18n.jsx';

export default function Placeholder({ titleKey, branchKey }) {
  const { t } = useI18n();
  return (
    <section className="panel p-gutter-xl flex flex-col gap-1">
      <h2 className="text-headline-md">{t(titleKey)}</h2>
      {branchKey && (
        <p className="text-body-sm text-on-surface-variant">
          {t('page.comingIn')} <code className="font-mono">{t(branchKey)}</code>.
        </p>
      )}
    </section>
  );
}
