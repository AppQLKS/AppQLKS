export default function Placeholder({ title, branch }) {
  return (
    <section className="panel p-gutter-xl flex flex-col gap-1">
      <h2 className="text-headline-md">{title}</h2>
      {branch && (
        <p className="text-body-sm text-on-surface-variant">
          Coming in <code className="font-mono">{branch}</code>.
        </p>
      )}
    </section>
  );
}
