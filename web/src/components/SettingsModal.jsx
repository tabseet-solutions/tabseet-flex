import { useState } from "react";
import { addDirectory, removeDirectory } from "../api.js";
import FolderPicker from "./FolderPicker.jsx";

export default function SettingsModal({ roots, onClose, onChange }) {
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
      <div className="bg-base-900 rounded-lg w-full max-w-md p-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-3">Library Folders</h3>
        {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
        <ul className="space-y-1 mb-4 max-h-60 overflow-y-auto">
          {roots.length === 0 && <li className="text-gray-500 text-sm">No folders added yet.</li>}
          {roots.map((r) => (
            <li key={r.path} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-base-800">
              <span className="text-sm truncate" title={r.path}>
                {r.display}
              </span>
              <button
                onClick={() => handleRemove(r.path)}
                disabled={busy}
                className="text-gray-400 hover:text-red-400 text-sm px-1 flex-shrink-0"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        <div className="flex justify-between items-center">
          <button
            onClick={() => setPicking(true)}
            className="px-3 py-1.5 rounded text-sm bg-accent-500 hover:bg-accent-400"
          >
            + Add folder
          </button>
          <button onClick={onClose} className="px-3 py-1.5 rounded text-sm hover:bg-base-700">
            Done
          </button>
        </div>
      </div>
      {picking && <FolderPicker onSelect={handleAdd} onClose={() => setPicking(false)} />}
    </div>
  );
}
