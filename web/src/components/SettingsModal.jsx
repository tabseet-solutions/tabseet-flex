import { useState } from "react";
import { PlusIcon } from "@heroicons/react/20/solid";
import { addDirectory, removeDirectory } from "../api.js";
import FolderPicker from "./FolderPicker.jsx";
import ColorPalettePicker from "./ColorPalettePicker.jsx";

const TABS = [
  { key: "folders", label: "Folders" },
  { key: "appearance", label: "Appearance" },
];

export default function SettingsModal({ roots, onClose, onChange }) {
  const [tab, setTab] = useState("folders");
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handleRemove = async (path) => {
    setBusy(true);
    setError(null);
    try {
      await removeDirectory(path);
      await onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleAdd = async (path) => {
    setPicking(false);
    setBusy(true);
    setError(null);
    try {
      await addDirectory(path);
      await onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-40" onClick={onClose}>
      <div className="bg-gray-50 dark:bg-base-900 rounded-lg w-full max-w-md p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Settings</h3>
          <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-base-800 rounded p-0.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-2.5 py-1 rounded text-sm transition-colors ${
                  tab === t.key
                    ? "bg-primary-500 text-white"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab === "folders" ? (
          <>
            {error && <p className="text-red-600 dark:text-red-400 text-sm mb-2">{error}</p>}
            <ul className="space-y-1 mb-4 max-h-60 overflow-y-auto">
              {roots.length === 0 && <li className="text-gray-500 text-sm">No folders added yet.</li>}
              {roots.map((r) => (
                <li key={r.path} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-gray-100 dark:bg-base-800">
                  <span className="text-sm truncate" title={r.path}>
                    {r.display}
                  </span>
                  <button
                    onClick={() => handleRemove(r.path)}
                    disabled={busy}
                    className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 text-sm px-1 flex-shrink-0"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="mb-4">
            <ColorPalettePicker />
          </div>
        )}

        <div className="flex justify-between items-center">
          <div>
            {tab === "folders" && (
              <button
                onClick={() => setPicking(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded text-sm bg-primary-500 hover:bg-primary-400 text-white"
              >
                <PlusIcon className="w-4 h-4" />
                Add folder
              </button>
            )}
          </div>
          <button onClick={onClose} className="px-3 py-1.5 rounded text-sm hover:bg-gray-200 dark:hover:bg-base-700">
            Done
          </button>
        </div>
      </div>
      {picking && <FolderPicker onSelect={handleAdd} onClose={() => setPicking(false)} />}
    </div>
  );
}
