import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";
import App from "./App.jsx";
import { ThemeProvider } from "./hooks/useTheme.jsx";
import { PaletteProvider } from "./hooks/usePalette.jsx";
import AppThemeProvider from "./theme/AppThemeProvider.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <PaletteProvider>
        <AppThemeProvider>
          <App />
        </AppThemeProvider>
      </PaletteProvider>
    </ThemeProvider>
  </React.StrictMode>
);
