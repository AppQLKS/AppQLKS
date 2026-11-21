export default function Placeholder({ title, branch }) {
  return (
    <div className="screen">
      <h1>{title}</h1>
      {branch && (
        <p className="muted small">
          Sẽ làm ở nhánh <code>{branch}</code>.
        </p>
      )}
    </div>
  );
}
