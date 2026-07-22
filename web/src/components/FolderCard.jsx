import { Card, CardActionArea, Typography } from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";

// Hoisted - static across every card in the grid, no need to reallocate per render.
const actionAreaSx = { display: "flex", flexDirection: "column", alignItems: "center", gap: 1, p: 1.5 };
const iconSx = { fontSize: 48 };
const nameSx = { width: "100%" };

export default function FolderCard({ folder, onOpen }) {
  return (
    <Card variant="outlined">
      <CardActionArea onClick={() => onOpen(folder.path)} data-grid-item="true" sx={actionAreaSx}>
        <FolderIcon color="secondary" sx={iconSx} />
        <Typography variant="body2" align="center" noWrap sx={nameSx} title={folder.name}>
          {folder.name}
        </Typography>
      </CardActionArea>
    </Card>
  );
}
