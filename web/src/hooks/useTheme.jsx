import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "theme";

function getInitialTheme() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

const ThemeContext = createContext(null);

// Mirrors the inline script in index.html that sets the initial class
// before paint - this just keeps it in sync with React state afterward.
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);
  // Stable reference so a theme-unrelated re-render of ThemeProvider (e.g.
  // its own parent re-rendering) doesn't also force every ThemeContext
  // consumer - including PaletteProvider, mounted below it - to re-render.
  const value = useMemo(() => [theme, toggleTheme], [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Single shared instance (see ThemeProvider above) so every consumer -
// including the MUI theme in src/theme - stays in sync with the same toggle.
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
