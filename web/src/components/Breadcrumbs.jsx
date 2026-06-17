export default function Breadcrumbs({ crumbs, onNavigate }) {
  if (!crumbs || crumbs.length === 0) return null;
  return (
    <nav className="flex items-center gap-1 text-sm text-gray-400 overflow-x-auto whitespace-nowrap py-1">
      {crumbs.map((c, i) => (
        <span key={c.path} className="flex items-center gap-1">
          {i > 0 && <span className="text-gray-600">/</span>}
          <button
            onClick={() => onNavigate(c.path)}
            className={
              i === crumbs.length - 1
                ? "text-gray-100 font-medium px-1"
                : "hover:text-accent-400 px-1 transition-colors"
            }
          >
            {c.name}
          </button>
        </span>
      ))}
    </nav>
  );
}
