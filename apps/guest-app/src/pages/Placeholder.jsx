import { BottomNav } from '../components/ui.jsx';

export default function Placeholder({ title, branch, nav }) {
  return (
    <div className="min-h-screen max-w-[390px] mx-auto px-page-margin pt-2xl pb-24 flex flex-col gap-sm">
      <h1 className="font-headline text-headline-lg">{title}</h1>
      {branch && (
        <p className="text-body-sm text-on-surface-variant">
          Coming in <code className="font-mono">{branch}</code>.
        </p>
      )}
      {nav && <BottomNav items={nav} />}
    </div>
  );
}
