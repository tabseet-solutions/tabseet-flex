import { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/20/solid";
import { getDuplicates, resolveDuplicate, thumbUrl } from "../api.js";
import { formatBytes } from "../format.js";

export default function DuplicatesModal({ onClose }) {
  const [groups, setGroups] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [busyKey, setBusyKey] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setGroups(await getDuplicates());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const requestKeep = (group, keep) => {
    setConfirming({
      key: group.key,
      keep,
      deleteList: group.copies.filter((c) => c.id !== keep.id),
    });
  };

  const confirmKeep = async () => {
    if (!confirming) return;
    setBusyKey(confirming.key);
    try {
      await resolveDuplicate(confirming.keep.id, confirming.deleteList.map((c) => c.id));
      setGroups((prev) => prev.filter((g) => g.key !== confirming.key));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey(null);
      setConfirming(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-40" onClick={onClose}>
      <div
        className="bg-gray-50 dark:bg-base-900 rounded-lg w-full max-w-3xl max-h-[85vh] flex flex-col p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Duplicate videos</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white p-1.5 rounded hover:bg-gray-100 dark:hover:bg-base-800"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {error && <p className="text-red-600 dark:text-red-400 text-sm mb-2">{error}</p>}

        <div className="flex-1 overflow-y-auto space-y-4 -mx-1 px-1">
          {loading && <p className="text-gray-500 text-sm">Scanning library folders...</p>}
          {!loading && groups?.length === 0 && (
            <p className="text-gray-500 text-sm">No duplicates found across your library folders.</p>
          )}
          {!loading &&
            groups?.map((group) => (
              <div key={group.key} className="bg-gray-100 dark:bg-base-800 rounded-lg p-3">
                <p className="text-sm font-medium mb-2 truncate" title={group.copies[0].name}>
                  {group.copies[0].name}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {group.copies.map((c) => (
                    <div key={c.id} className="bg-gray-200 dark:bg-base-700 rounded overflow-hidden">
                      <img
                        src={thumbUrl(c.id)}
                        alt=""
                        loading="lazy"
                        className="w-full aspect-video object-cover bg-gray-200 dark:bg-base-700"
                      />
                      <div className="p-2 text-xs space-y-1">
                        <p className="truncate font-medium" title={c.rootDisplay}>
                          {c.rootDisplay}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400">{formatBytes(c.size)}</p>
                        <button
                          onClick={() => requestKeep(group, c)}
                          disabled={busyKey === group.key}
                          className="w-full mt-1 px-2 py-1 rounded bg-primary-500 hover:bg-primary-400 text-white disabled:opacity-50"
                        >
                          Keep this, delete others
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>

      {confirming && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]"
          onClick={(e) => {
            e.stopPropagation();
            setConfirming(null);
          }}
        >
          <div className="bg-gray-50 dark:bg-base-900 rounded-lg w-full max-w-md p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-2">Delete duplicate copies?</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Keeping <strong className="text-gray-800 dark:text-gray-200">{confirming.keep.rootDisplay}</strong>. This will
              permanently delete:
            </p>
            <ul className="text-sm mb-4 space-y-1">
              {confirming.deleteList.map((c) => (
                <li key={c.id} className="flex justify-between gap-2">
                  <span className="truncate">{c.rootDisplay}</span>
                  <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">{formatBytes(c.size)}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-red-600 dark:text-red-400 mb-4">This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirming(null)} className="px-3 py-1.5 rounded text-sm hover:bg-gray-200 dark:hover:bg-base-700">
                Cancel
              </button>
              <button onClick={confirmKeep} className="px-3 py-1.5 rounded text-sm bg-red-600 hover:bg-red-500 text-white">
                Delete {confirming.deleteList.length} file{confirming.deleteList.length > 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
