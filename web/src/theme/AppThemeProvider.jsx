import { useMemo } from "react";
import { CssBaseline, StyledEngineProvider, ThemeProvider as MuiThemeProvider } from "@mui/material";
import { useTheme } from "../hooks/useTheme.jsx";
import { usePalette } from "../hooks/usePalette.jsx";
import { createAppTheme } from "./index.js";

export default function AppThemeProvider({ children }) {
  const [mode] = useTheme();
  const { palette } = usePalette();

  const muiTheme = useMemo(() => createAppTheme(mode, palette), [mode, palette]);

  return (
    <StyledEngineProvider injectFirst>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </StyledEngineProvider>
  );
}
