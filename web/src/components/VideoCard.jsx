import { Box, Card, CardActionArea, LinearProgress, Typography } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { thumbUrl } from "../api.js";
import { formatDuration } from "../format.js";
import { useThumbnail } from "../hooks/useThumbnail.js";

// Hoisted out of the component - none of these depend on props/state, so
// building them fresh per card would mean per-card allocations across what
// can be a large grid.
const cardSx = { overflow: "hidden" };
const thumbBoxSx = { position: "relative", width: "100%", aspectRatio: "16 / 9", bgcolor: "action.hover", overflow: "hidden" };
const thumbImgSx = { width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.2s" };
const hoverOverlaySx = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  bgcolor: "rgba(0,0,0,0.3)",
  transition: "opacity 0.15s",
};
const playIconSx = { fontSize: 48, color: "#fff", filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.6))" };
const durationBadgeSx = {
  position: "absolute",
  bottom: 4,
  right: 4,
  px: 0.75,
  py: 0.25,
  fontSize: 12,
  bgcolor: "rgba(0,0,0,0.75)",
  color: "#fff",
  borderRadius: 0.5,
};
const volumeBadgeSx = {
  position: "absolute",
  top: 4,
  left: 4,
  px: 0.75,
  py: 0.25,
  fontSize: 12,
  bgcolor: "rgba(0,0,0,0.75)",
  color: "secondary.light",
  borderRadius: 0.5,
};
const watchProgressSx = { position: "absolute", bottom: 0, left: 0, right: 0, height: 4, bgcolor: "rgba(0,0,0,0.5)" };
const titleBoxSx = { px: 1.5, py: 1 };

export default function VideoCard({ video, onPlay, volume }) {
  const watchPct =
    video.progress && video.progress.duration
      ? Math.min(100, (video.progress.position / video.progress.duration) * 100)
      : 0;
  const [thumbRef, thumbSrc] = useThumbnail(thumbUrl(video.id));

  return (
    <Card variant="outlined" sx={cardSx} className="group">
      <CardActionArea onClick={() => onPlay(video)} data-grid-item="true">
        <Box ref={thumbRef} sx={thumbBoxSx}>
          {thumbSrc && (
            <Box component="img" src={thumbSrc} alt={video.name} className="group-hover:scale-105" sx={thumbImgSx} />
          )}
          <Box className="opacity-0 group-hover:opacity-100" sx={hoverOverlaySx}>
            <PlayArrowIcon sx={playIconSx} />
          </Box>
          {video.duration > 0 && <Box sx={durationBadgeSx}>{formatDuration(video.duration)}</Box>}
          {volume && <Box sx={volumeBadgeSx}>{volume}</Box>}
          {watchPct > 0 && <LinearProgress variant="determinate" value={watchPct} sx={watchProgressSx} />}
        </Box>
        <Box sx={titleBoxSx}>
          <Typography variant="body2" noWrap title={video.name}>
            {video.name.replace(/\.[^.]+$/, "")}
          </Typography>
        </Box>
      </CardActionArea>
    </Card>
  );
}
