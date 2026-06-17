export default function TopBar({
  search,
  onSearchChange,
  sort,
  order,
  onSortChange,
  onOrderChange,
  onHome,
  onSettings,
  onDuplicates,
}) {
  return (
    <header className="flex items-center gap-3 px-4 py-3 bg-base-900 border-b border-base-800 sticky top-0 z-30">
      <button onClick={onHome} className="text-lg font-semibold flex items-center gap-2 flex-shrink-0">
        <img src="/favicon.svg" alt="" className="w-7 h-7" />
        Tabseet Flex
      </button>
      <input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search this folder..."
        className="flex-1 max-w-md bg-base-800 rounded px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent-500"
      />
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value)}
        className="bg-base-800 rounded px-2 py-1.5 text-sm outline-none"
      >
        <option value="name">Name</option>
        <option value="date">Date</option>
        <option value="duration">Duration</option>
        <option value="size">Size</option>
      </select>
      <button
        onClick={() => onOrderChange(order === "asc" ? "desc" : "asc")}
        className="bg-base-800 rounded px-2 py-1.5 text-sm"
        title="Toggle sort order"
      >
        {order === "asc" ? "↑" : "↓"}
      </button>
      <button
        onClick={onDuplicates}
        className="bg-base-800 rounded px-2 py-1.5 text-sm"
        title="Find duplicate videos across library folders"
      >
        ⧉
      </button>
      <button onClick={onSettings} className="bg-base-800 rounded px-2 py-1.5 text-sm" title="Settings">
        ⚙
      </button>
    </header>
  );
}
