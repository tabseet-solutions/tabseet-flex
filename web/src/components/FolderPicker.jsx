import { useEffect, useState } from "react";
import { FolderIcon } from "@heroicons/react/20/solid";
import { browse } from "../api.js";

export default function FolderPicker({ onSelect, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async (path) => {
    setLoading(true);
    setError(null);
    try {
      setData(await browse(path));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(undefined);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-gray-50 dark:bg-base-900 rounded-lg w-full max-w-lg max-h-[80vh] flex flex-col p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold mb-1">Choose a folder</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 truncate">/{data?.display}</p>
        {error && <p className="text-red-600 dark:text-red-400 text-sm mb-2">{error}</p>}
        <div className="flex-1 overflow-y-auto -mx-1 px-1 min-h-[200px]">
          {loading ? (
            <p className="text-gray-500 text-sm">Loading...</p>
          ) : (
            <div className="space-y-1">
              {data?.parent != null && (
                <button
                  onClick={() => load(data.parent)}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-200 dark:hover:bg-base-700 text-sm text-gray-600 dark:text-gray-300"
                >
                  .. (up)
                </button>
              )}
              {data?.folders?.map((f) => (
                <button
                  key={f.path}
                  onClick={() => load(f.path)}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-200 dark:hover:bg-base-700 text-sm flex items-center gap-2"
                >
                  <FolderIcon className="w-4 h-4 text-secondary-400 flex-shrink-0" />
                  <span className="truncate">{f.name}</span>
                </button>
              ))}
              {data?.folders?.length === 0 && <p className="text-gray-500 text-sm px-2">No subfolders</p>}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-base-700">
          <button onClick={onClose} className="px-3 py-1.5 rounded text-sm hover:bg-gray-200 dark:hover:bg-base-700">
            Cancel
          </button>
          <button
            onClick={() => data && onSelect(data.path)}
            disabled={!data}
            className="px-3 py-1.5 rounded text-sm bg-primary-500 hover:bg-primary-400 text-white disabled:opacity-50"
          >
            Use this folder
          </button>
        </div>
      </div>
    </div>
  );
}
