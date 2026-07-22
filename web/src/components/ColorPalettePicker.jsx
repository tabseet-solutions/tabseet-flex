import { Box, ButtonBase, Typography } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import { usePalette, PRESETS } from "../hooks/usePalette.jsx";

export default function ColorPalettePicker() {
  const { palette, selectPreset } = usePalette();

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
      {PRESETS.map((p) => {
        const active =
          palette.primary.toLowerCase() === p.primary.toLowerCase() &&
          palette.secondary.toLowerCase() === p.secondary.toLowerCase();
        return (
          <ButtonBase
            key={p.name}
            onClick={() => selectPreset(p)}
            aria-pressed={active}
            sx={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0.75,
              p: 1,
              borderRadius: 2,
              border: 1,
              borderColor: active ? "primary.main" : "transparent",
              bgcolor: active ? "action.selected" : "transparent",
              "&:hover": { bgcolor: "action.hover" },
            }}
          >
            <Box sx={{ width: "100%", height: 32, borderRadius: 1, overflow: "hidden", display: "flex" }}>
              <Box sx={{ width: "50%", height: "100%", bgcolor: p.primary }} />
              <Box sx={{ width: "50%", height: "100%", bgcolor: p.secondary }} />
            </Box>
            <Typography variant="caption" sx={{ textAlign: "center", lineHeight: 1.2 }}>
              {p.name}
            </Typography>
            {active && (
              <Box
                sx={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  width: 16,
                  height: 16,
                  borderRadius: "50%",
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CheckIcon sx={{ fontSize: 12 }} />
              </Box>
            )}
          </ButtonBase>
        );
      })}
    </Box>
  );
}
