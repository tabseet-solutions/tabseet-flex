import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardMedia,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { getDuplicates, resolveDuplicate, thumbUrl } from "../api.js";
import { formatBytes } from "../format.js";

export default function DuplicatesModal({ onClose }) {
  const [groups, setGroups] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [busyKey, setBusyKey] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setGroups(await getDuplicates());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const requestKeep = (group, keep) => {
    setConfirming({
      key: group.key,
      keep,
      deleteList: group.copies.filter((c) => c.id !== keep.id),
    });
  };

  const confirmKeep = async () => {
    if (!confirming) return;
    setBusyKey(confirming.key);
    try {
      await resolveDuplicate(confirming.keep.id, confirming.deleteList.map((c) => c.id));
      setGroups((prev) => prev.filter((g) => g.key !== confirming.key));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyKey(null);
      setConfirming(null);
    }
  };

  return (
    <>
      <Dialog open onClose={onClose} fullWidth maxWidth="md" slotProps={{ paper: { sx: { maxHeight: "85vh" } } }}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          Duplicate videos
          <IconButton onClick={onClose} aria-label="Close" size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {error && (
            <Typography variant="body2" color="error" sx={{ mb: 1 }}>
              {error}
            </Typography>
          )}
          {loading && (
            <Typography variant="body2" color="text.secondary">
              Scanning library folders...
            </Typography>
          )}
          {!loading && groups?.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No duplicates found across your library folders.
            </Typography>
          )}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {!loading &&
              groups?.map((group) => (
                <Box key={group.key} sx={{ bgcolor: "action.hover", borderRadius: 2, p: 1.5 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }} noWrap title={group.copies[0].name}>
                    {group.copies[0].name}
                  </Typography>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr 1fr" },
                      gap: 1.5,
                    }}
                  >
                    {group.copies.map((c) => (
                      <Card key={c.id} variant="outlined">
                        <CardMedia component="img" image={thumbUrl(c.id)} loading="lazy" sx={{ aspectRatio: "16 / 9" }} />
                        <Box sx={{ p: 1 }}>
                          <Typography variant="caption" sx={{ fontWeight: 500, display: "block" }} noWrap title={c.rootDisplay}>
                            {c.rootDisplay}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                            {formatBytes(c.size)}
                          </Typography>
                          <Button
                            onClick={() => requestKeep(group, c)}
                            disabled={busyKey === group.key}
                            variant="contained"
                            size="small"
                            fullWidth
                          >
                            Keep this, delete others
                          </Button>
                        </Box>
                      </Card>
                    ))}
                  </Box>
                </Box>
              ))}
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirming} onClose={() => setConfirming(null)} fullWidth maxWidth="xs">
        {confirming && (
          <>
            <DialogTitle>Delete duplicate copies?</DialogTitle>
            <DialogContent dividers>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Keeping <Box component="strong" sx={{ color: "text.primary" }}>{confirming.keep.rootDisplay}</Box>. This will
                permanently delete:
              </Typography>
              <Box sx={{ mb: 1.5 }}>
                {confirming.deleteList.map((c) => (
                  <Box key={c.id} sx={{ display: "flex", justifyContent: "space-between", gap: 1, fontSize: 14, mb: 0.5 }}>
                    <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.rootDisplay}
                    </Box>
                    <Box component="span" sx={{ color: "text.secondary", flexShrink: 0 }}>
                      {formatBytes(c.size)}
                    </Box>
                  </Box>
                ))}
              </Box>
              <Typography variant="caption" color="error">
                This cannot be undone.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setConfirming(null)} color="inherit">
                Cancel
              </Button>
              <Button onClick={confirmKeep} variant="contained" color="error">
                Delete {confirming.deleteList.length} file{confirming.deleteList.length > 1 ? "s" : ""}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
}
