import { FolderIcon } from "@heroicons/react/24/solid";

export default function FolderCard({ folder, onOpen }) {
  return (
    <button
      onClick={() => onOpen(folder.path)}
      data-grid-item="true"
      className="group flex flex-col items-center gap-2 rounded-lg p-3 bg-gray-100 hover:bg-gray-200 dark:bg-base-800 dark:hover:bg-base-700 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-primary-500"
    >
      <FolderIcon className="w-12 h-12 text-secondary-400" />
      <span className="text-sm text-center truncate w-full" title={folder.name}>
        {folder.name}
      </span>
    </button>
  );
}
