import { Alert, AlertTitle, Box, Button, IconButton, LinearProgress, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

const SEVERITY = {
  running: "info",
  ready: "success",
  done: "success",
  error: "error",
};

export default function FlipStatusBar({ flips, onPreview, onKeep, onDiscard, onDismiss }) {
  const entries = Object.entries(flips || {});
  if (entries.length === 0) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 16,
        right: 16,
        // Must outrank MUI Dialogs (zIndex.modal) so flip status stays
        // visible while Settings/Duplicates/etc. are open, same as the
        // z-[70] it used before dialogs existed.
        zIndex: (t) => t.zIndex.snackbar,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        width: 320,
      }}
    >
      {entries.map(([id, job]) => (
        <Alert
          key={id}
          severity={SEVERITY[job.status] || "info"}
          variant="filled"
          action={
            job.status !== "running" ? (
              <IconButton size="small" color="inherit" onClick={() => onDismiss(id)} aria-label="Dismiss">
                <CloseIcon fontSize="small" />
              </IconButton>
            ) : undefined
          }
          sx={{ boxShadow: 3 }}
        >
          <AlertTitle sx={{ mb: job.status === "running" || job.status === "ready" ? 0.5 : 0 }}>
            <Box component="span" sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={job.name}>
              {(job.name || id).replace(/\.[^.]+$/, "")}
            </Box>
          </AlertTitle>

          {job.status === "running" && (
            <>
              <LinearProgress
                variant={job.progress != null ? "determinate" : "indeterminate"}
                value={job.progress ?? 0}
                color="inherit"
                sx={{ mb: 0.5, borderRadius: 1 }}
              />
              <Typography variant="caption">
                Building flipped copy{job.progress != null ? ` - ${job.progress}%` : "…"}
              </Typography>
            </>
          )}

          {job.status === "ready" && (
            <>
              <Typography variant="caption" sx={{ display: "block", mb: 1 }}>
                Flipped copy ready to review.
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button size="small" color="inherit" variant="outlined" onClick={() => onPreview(id)}>
                  Preview
                </Button>
                <Button size="small" color="inherit" variant="outlined" onClick={() => onDiscard(id)}>
                  Discard
                </Button>
                <Button size="small" color="inherit" variant="contained" onClick={() => onKeep(id)}>
                  Keep
                </Button>
              </Box>
            </>
          )}

          {job.status === "done" && <Typography variant="caption">Flip complete</Typography>}
          {job.status === "error" && (
            <Typography variant="caption" noWrap title={job.error}>
              Flip failed: {job.error}
            </Typography>
          )}
        </Alert>
      ))}
    </Box>
  );
}
