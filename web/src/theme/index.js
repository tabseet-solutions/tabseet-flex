import { createTheme } from "@mui/material/styles";

// Centralized design system: default component sizing/shape lives here so
// there is one place to change "how big is a button" or "how rounded is a
// panel" across the whole app. 48px follows Material's minimum touch-target
// guidance (today's hand-rolled icon buttons were ~32px).
export function createAppTheme(mode, { primary, secondary }) {
  return createTheme({
    palette: {
      mode,
      primary: { main: primary },
      secondary: { main: secondary },
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    },
    // The video Player is a full-screen overlay that must sit above the
    // AppBar (1100) and Dialogs (1300) but below the flip-status toasts
    // (snackbar, 1400) - centralized here, alongside MUI's own tiers,
    // instead of as magic numbers in Player.jsx.
    zIndex: {
      player: 1350,
      playerOverlay: 1360,
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif' },
        },
      },
      MuiButton: {
        defaultProps: { size: "large" },
        styleOverrides: {
          root: { minHeight: 48, paddingInline: 20, textTransform: "none" },
        },
      },
      MuiIconButton: {
        defaultProps: { size: "large" },
        styleOverrides: {
          root: { padding: 12, "& svg": { fontSize: 24 } },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: { minHeight: 48, padding: "8px 16px", textTransform: "none" },
        },
      },
      MuiTextField: {
        defaultProps: { size: "small" },
      },
      MuiSelect: {
        defaultProps: { size: "small" },
      },
    },
  });
}
