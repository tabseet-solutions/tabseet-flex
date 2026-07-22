import {
  AppBar,
  ButtonBase,
  IconButton,
  InputAdornment,
  MenuItem,
  TextField,
  Toolbar,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SettingsIcon from "@mui/icons-material/Settings";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";

export default function TopBar({
  search,
  onSearchChange,
  sort,
  order,
  onSortChange,
  onOrderChange,
  onHome,
  onSettings,
  onDuplicates,
  view,
  onChangeView,
  theme,
  onToggleTheme,
}) {
  return (
    <AppBar
      position="sticky"
      color="default"
      elevation={0}
      sx={{ borderBottom: 1, borderColor: "divider" }}
    >
      <Toolbar sx={{ gap: 1.5 }}>
        <ButtonBase onClick={onHome} sx={{ gap: 1, borderRadius: 1, flexShrink: 0 }}>
          <img src="/favicon.svg" alt="" width={28} height={28} />
          <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
            Tabseet Flex
          </Typography>
        </ButtonBase>

        <ToggleButtonGroup
          value={view}
          exclusive
          onChange={(e, next) => next && onChangeView(next)}
          size="small"
          sx={{ flexShrink: 0 }}
        >
          <ToggleButton value="folders">Folders</ToggleButton>
          <ToggleButton value="consolidated">Consolidated</ToggleButton>
        </ToggleButtonGroup>

        <TextField
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={view === "consolidated" ? "Search entire library..." : "Search this folder..."}
          sx={{ flex: 1, maxWidth: 400 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />

        <TextField
          select
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="name">Name</MenuItem>
          <MenuItem value="date">Date</MenuItem>
          <MenuItem value="duration">Duration</MenuItem>
          <MenuItem value="size">Size</MenuItem>
        </TextField>

        <Tooltip title="Toggle sort order">
          <IconButton onClick={() => onOrderChange(order === "asc" ? "desc" : "asc")} aria-label="Toggle sort order">
            {order === "asc" ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Find duplicate videos across library folders">
          <IconButton onClick={onDuplicates} aria-label="Find duplicate videos">
            <ContentCopyIcon />
          </IconButton>
        </Tooltip>

        <Tooltip title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
          <IconButton onClick={onToggleTheme} aria-label="Toggle color theme">
            {theme === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Settings">
          <IconButton onClick={onSettings} aria-label="Settings">
            <SettingsIcon />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}
