/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
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
        accent: {
          500: "#6366f1",
          400: "#818cf8",
        },
      },
    },
  },
  plugins: [],
};
