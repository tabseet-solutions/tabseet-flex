import {
  BarsArrowUpIcon,
  BarsArrowDownIcon,
  Square2StackIcon,
  Cog6ToothIcon,
  SunIcon,
  MoonIcon,
} from "@heroicons/react/20/solid";

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
  view,
  onChangeView,
  theme,
  onToggleTheme,
}) {
  return (
    <header className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-base-900 border-b border-gray-200 dark:border-base-800 sticky top-0 z-30">
      <button onClick={onHome} className="text-lg font-semibold flex items-center gap-2 flex-shrink-0">
        <img src="/favicon.svg" alt="" className="w-7 h-7" />
        Tabseet Flex
      </button>
      <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-base-800 rounded p-0.5 flex-shrink-0">
        {[
          { key: "folders", label: "Folders" },
          { key: "consolidated", label: "Consolidated" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => onChangeView(tab.key)}
            className={`px-2.5 py-1 rounded text-sm transition-colors ${
              view === tab.key
                ? "bg-primary-500 text-white"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={view === "consolidated" ? "Search entire library..." : "Search this folder..."}
        className="flex-1 max-w-md bg-gray-100 dark:bg-base-800 rounded px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary-500"
      />
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value)}
        className="bg-gray-100 dark:bg-base-800 rounded px-2 py-1.5 text-sm outline-none"
      >
        <option value="name">Name</option>
        <option value="date">Date</option>
        <option value="duration">Duration</option>
        <option value="size">Size</option>
      </select>
      <button
        onClick={() => onOrderChange(order === "asc" ? "desc" : "asc")}
        className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 dark:bg-base-800 dark:hover:bg-base-700 transition-colors"
        title="Toggle sort order"
        aria-label="Toggle sort order"
      >
        {order === "asc" ? <BarsArrowUpIcon className="w-5 h-5" /> : <BarsArrowDownIcon className="w-5 h-5" />}
      </button>
      <button
        onClick={onDuplicates}
        className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 dark:bg-base-800 dark:hover:bg-base-700 transition-colors"
        title="Find duplicate videos across library folders"
        aria-label="Find duplicate videos"
      >
        <Square2StackIcon className="w-5 h-5" />
      </button>
      <button
        onClick={onToggleTheme}
        className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 dark:bg-base-800 dark:hover:bg-base-700 transition-colors"
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        aria-label="Toggle color theme"
      >
        {theme === "dark" ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
      </button>
      <button
        onClick={onSettings}
        className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 dark:bg-base-800 dark:hover:bg-base-700 transition-colors"
        title="Settings"
        aria-label="Settings"
      >
        <Cog6ToothIcon className="w-5 h-5" />
      </button>
    </header>
  );
}
