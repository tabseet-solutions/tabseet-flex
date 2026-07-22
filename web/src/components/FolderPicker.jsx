import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import { browse } from "../api.js";

export default function FolderPicker({ onSelect, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async (path) => {
    setLoading(true);
    setError(null);
    try {
      setData(await browse(path));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(undefined);
  }, []);

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Choose a folder</DialogTitle>
      <DialogContent dividers sx={{ minHeight: 280 }}>
        <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 1 }}>
          /{data?.display}
        </Typography>
        {error && (
          <Typography variant="body2" color="error" sx={{ mb: 1 }}>
            {error}
          </Typography>
        )}
        {loading ? (
          <Typography variant="body2" color="text.secondary">
            Loading...
          </Typography>
        ) : (
          <List dense disablePadding>
            {data?.parent != null && (
              <ListItemButton onClick={() => load(data.parent)}>
                <ListItemText primary=".. (up)" slotProps={{ primary: { color: "text.secondary" } }} />
              </ListItemButton>
            )}
            {data?.folders?.map((f) => (
              <ListItemButton key={f.path} onClick={() => load(f.path)}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <FolderIcon color="secondary" fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={f.name} slotProps={{ primary: { noWrap: true } }} />
              </ListItemButton>
            ))}
            {data?.folders?.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
                No subfolders
              </Typography>
            )}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button onClick={() => data && onSelect(data.path)} disabled={!data} variant="contained">
          Use this folder
        </Button>
      </DialogActions>
    </Dialog>
  );
}
