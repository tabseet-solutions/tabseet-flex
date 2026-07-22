/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  // MUI's CssBaseline (mounted in src/theme/AppThemeProvider.jsx) owns the
  // global CSS reset now that every raw <button>/<input> has been migrated
  // to an MUI component - disabled here to avoid two resets fighting.
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        base: {
          950: "#0a0a0d",
          900: "#121215",
          800: "#1b1b20",
          700: "#27272e",
          600: "#3a3a44",
        },
        primary: {
          500: "rgb(var(--color-primary-500) / <alpha-value>)",
          400: "rgb(var(--color-primary-400) / <alpha-value>)",
        },
        secondary: {
          500: "rgb(var(--color-secondary-500) / <alpha-value>)",
          400: "rgb(var(--color-secondary-400) / <alpha-value>)",
        },
      },
    },
  },
  plugins: [],
};
