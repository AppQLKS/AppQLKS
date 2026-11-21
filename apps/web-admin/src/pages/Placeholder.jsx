export default function Placeholder({ title, branch }) {
  return (
    <section className="card">
      <h1>{title}</h1>
      {branch && <p className="muted">Sẽ làm ở nhánh <code>{branch}</code>.</p>}
    </section>
  );
}
