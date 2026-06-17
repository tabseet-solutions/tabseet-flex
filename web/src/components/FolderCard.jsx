export default function FolderCard({ folder, onOpen }) {
  return (
    <button
      onClick={() => onOpen(folder.path)}
      data-grid-item="true"
      className="group flex flex-col items-center gap-2 rounded-lg p-3 bg-base-800 hover:bg-base-700 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-accent-500"
    >
      <svg viewBox="0 0 24 24" className="w-12 h-12 text-accent-400" fill="currentColor">
        <path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z" />
      </svg>
      <span className="text-sm text-center truncate w-full" title={folder.name}>
        {folder.name}
      </span>
    </button>
  );
}
