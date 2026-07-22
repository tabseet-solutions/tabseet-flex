import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { addDirectory, removeDirectory } from "../api.js";
import FolderPicker from "./FolderPicker.jsx";
import ColorPalettePicker from "./ColorPalettePicker.jsx";

const TABS = [
  { key: "folders", label: "Folders" },
  { key: "appearance", label: "Appearance" },
];

export default function SettingsModal({ roots, onClose, onChange }) {
  const [tab, setTab] = useState("folders");
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handleRemove = async (path) => {
    setBusy(true);
    setError(null);
    try {
      await removeDirectory(path);
      await onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleAdd = async (path) => {
    setPicking(false);
    setBusy(true);
    setError(null);
    try {
      await addDirectory(path);
      await onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog open onClose={onClose} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
          Settings
          <Tabs value={tab} onChange={(e, v) => setTab(v)}>
            {TABS.map((t) => (
              <Tab key={t.key} value={t.key} label={t.label} sx={{ minHeight: 48 }} />
            ))}
          </Tabs>
        </DialogTitle>
        <DialogContent dividers>
          {tab === "folders" ? (
            <>
              {error && (
                <Typography variant="body2" color="error" sx={{ mb: 1 }}>
                  {error}
                </Typography>
              )}
              <List dense sx={{ maxHeight: 240, overflowY: "auto" }}>
                {roots.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No folders added yet.
                  </Typography>
                )}
                {roots.map((r) => (
                  <ListItem
                    key={r.path}
                    sx={{ bgcolor: "action.hover", borderRadius: 1, mb: 0.5 }}
                    secondaryAction={
                      <Button onClick={() => handleRemove(r.path)} disabled={busy} color="error" size="small">
                        Remove
                      </Button>
                    }
                  >
                    <ListItemText primary={r.display} slotProps={{ primary: { noWrap: true, title: r.path } }} />
                  </ListItem>
                ))}
              </List>
            </>
          ) : (
            <ColorPalettePicker />
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between" }}>
          <Box>
            {tab === "folders" && (
              <Button onClick={() => setPicking(true)} startIcon={<AddIcon />} variant="contained">
                Add folder
              </Button>
            )}
          </Box>
          <Button onClick={onClose} color="inherit">
            Done
          </Button>
        </DialogActions>
      </Dialog>
      {picking && <FolderPicker onSelect={handleAdd} onClose={() => setPicking(false)} />}
    </>
  );
}
