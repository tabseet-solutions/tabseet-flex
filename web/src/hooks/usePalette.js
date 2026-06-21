import { useCallback, useEffect, useState } from "react";
import { buildPaletteVars } from "../lib/color.js";

const STORAGE_KEY = "palette";

export const PRESETS = [
  { name: "Indigo & Teal", primary: "#6366f1", secondary: "#14b8a6" },
  { name: "Rose & Amber", primary: "#e11d48", secondary: "#f59e0b" },
  { name: "Emerald & Sky", primary: "#059669", secondary: "#0ea5e9" },
  { name: "Violet & Fuchsia", primary: "#7c3aed", secondary: "#d946ef" },
  { name: "Orange & Cyan", primary: "#ea580c", secondary: "#06b6d4" },
  { name: "Ocean & Coral", primary: "#0284c7", secondary: "#fb7185" },
  { name: "Forest & Gold", primary: "#15803d", secondary: "#eab308" },
  { name: "Plum & Peach", primary: "#a21caf", secondary: "#fb923c" },
  { name: "Crimson & Slate", primary: "#dc2626", secondary: "#64748b" },
  { name: "Midnight & Lime", primary: "#4338ca", secondary: "#84cc16" },
  { name: "Berry & Mint", primary: "#be185d", secondary: "#2dd4bf" },
  { name: "Sapphire & Coral", primary: "#2563eb", secondary: "#f43f5e" },
];

const DEFAULT_PALETTE = PRESETS[0];

function getInitialPalette() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored?.primary && stored?.secondary) {
      return { primary: stored.primary, secondary: stored.secondary };
    }
  } catch {
    /* ignore malformed storage */
  }
  return DEFAULT_PALETTE;
}

function applyPalette(palette) {
  const vars = buildPaletteVars(palette);
  const root = document.documentElement.style;
  Object.entries(vars).forEach(([key, value]) => root.setProperty(`--color-${key}`, value));
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...palette, vars }));
}

// Mirrors the inline script in index.html that applies the stored palette's
// CSS variables before paint - this just keeps it in sync with React state
// afterward (see useTheme.js for the same pattern applied to dark/light mode).
export function usePalette() {
  const [palette, setPalette] = useState(getInitialPalette);

  useEffect(() => {
    applyPalette(palette);
  }, [palette]);

  const selectPreset = useCallback(({ primary, secondary }) => setPalette({ primary, secondary }), []);

  return { palette, selectPreset };
}
