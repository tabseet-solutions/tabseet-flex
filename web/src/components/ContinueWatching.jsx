import { useRef } from "react";
import { Box, Typography } from "@mui/material";
import VideoCard from "./VideoCard.jsx";

export default function ContinueWatching({ items, onPlay }) {
  const scrollRef = useRef(null);
  // Touch already scrolls natively via overflow-x-auto; this only adds
  // click-and-drag support for mouse/trackpad pointers.
  const drag = useRef({ active: false, startX: 0, scrollLeft: 0, moved: false });

  if (!items || items.length === 0) return null;

  const onPointerDown = (e) => {
    if (e.pointerType === "touch") return;
    drag.current = {
      active: true,
      startX: e.clientX,
      scrollLeft: scrollRef.current.scrollLeft,
      moved: false,
    };
  };

  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > 5) d.moved = true;
    scrollRef.current.scrollLeft = d.scrollLeft - dx;
  };

  const stopDrag = () => {
    drag.current.active = false;
  };

  const onClickCapture = (e) => {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  };

  return (
    <Box component="section" sx={{ mb: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
        Continue Watching
      </Typography>
      <Box
        ref={scrollRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onPointerLeave={stopDrag}
        onClickCapture={onClickCapture}
        className="cursor-grab active:cursor-grabbing select-none"
        sx={{ display: "flex", gap: 1.5, overflowX: "auto", pb: 0.5 }}
      >
        {items.map((v) => (
          <Box key={v.id} className="w-36 sm:w-44 md:w-48 lg:w-52" sx={{ flexShrink: 0 }}>
            <VideoCard video={v} onPlay={() => onPlay(v, items)} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
