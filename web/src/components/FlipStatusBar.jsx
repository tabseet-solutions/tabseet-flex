import { XMarkIcon } from "@heroicons/react/20/solid";

export default function FlipStatusBar({ flips, onPreview, onKeep, onDiscard, onDismiss }) {
  const entries = Object.entries(flips || {});
  if (entries.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[70] flex flex-col gap-2 w-80">
      {entries.map(([id, job]) => (
        <div key={id} className="bg-gray-50 dark:bg-base-900 border border-gray-300 dark:border-base-700 rounded-lg p-3 shadow-lg text-sm">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="truncate font-medium" title={job.name}>
              {(job.name || id).replace(/\.[^.]+$/, "")}
            </span>
            {job.status !== "running" && (
              <button
                onClick={() => onDismiss(id)}
                className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white p-1 rounded hover:bg-gray-200 dark:hover:bg-base-700 flex-shrink-0"
                aria-label="Dismiss"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>

          {job.status === "running" && (
            <>
              <div className="h-1.5 bg-gray-200 dark:bg-base-700 rounded overflow-hidden mb-1">
                <div className="h-full bg-primary-500 transition-all" style={{ width: `${job.progress ?? 0}%` }} />
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-xs">
                Building flipped copy{job.progress != null ? ` - ${job.progress}%` : "…"}
              </p>
            </>
          )}

          {job.status === "ready" && (
            <>
              <p className="text-gray-500 dark:text-gray-400 text-xs mb-2">Flipped copy ready to review.</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPreview(id)}
                  className="px-2 py-1 rounded text-xs hover:bg-gray-200 dark:hover:bg-base-700 border border-gray-300 dark:border-base-700"
                >
                  Preview
                </button>
                <button
                  onClick={() => onDiscard(id)}
                  className="px-2 py-1 rounded text-xs hover:bg-gray-200 dark:hover:bg-base-700 border border-gray-300 dark:border-base-700"
                >
                  Discard
                </button>
                <button
                  onClick={() => onKeep(id)}
                  className="px-2 py-1 rounded text-xs bg-primary-500 hover:bg-primary-400 text-white"
                >
                  Keep
                </button>
              </div>
            </>
          )}

          {job.status === "done" && <p className="text-green-600 dark:text-green-400 text-xs">Flip complete</p>}
          {job.status === "error" && (
            <p className="text-red-600 dark:text-red-400 text-xs truncate" title={job.error}>
              Flip failed: {job.error}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
