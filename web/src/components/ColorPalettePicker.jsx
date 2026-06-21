import { CheckIcon } from "@heroicons/react/20/solid";
import { usePalette, PRESETS } from "../hooks/usePalette.js";

export default function ColorPalettePicker() {
  const { palette, selectPreset } = usePalette();

  return (
    <div className="grid grid-cols-3 gap-2">
      {PRESETS.map((p) => {
        const active =
          palette.primary.toLowerCase() === p.primary.toLowerCase() &&
          palette.secondary.toLowerCase() === p.secondary.toLowerCase();
        return (
          <button
            key={p.name}
            onClick={() => selectPreset(p)}
            aria-pressed={active}
            className={`relative flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-colors ${
              active
                ? "border-primary-500 bg-primary-500/10"
                : "border-transparent hover:bg-gray-100 dark:hover:bg-base-800"
            }`}
          >
            <span className="w-full h-8 rounded-md overflow-hidden flex">
              <span className="w-1/2 h-full" style={{ backgroundColor: p.primary }} />
              <span className="w-1/2 h-full" style={{ backgroundColor: p.secondary }} />
            </span>
            <span className="text-xs text-center leading-tight">{p.name}</span>
            {active && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary-500 text-white flex items-center justify-center">
                <CheckIcon className="w-3 h-3" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
