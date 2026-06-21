import { useRef } from "react";
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
    <section className="mb-6">
      <h2 className="text-lg font-semibold mb-2">Continue Watching</h2>
      <div
        ref={scrollRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onPointerLeave={stopDrag}
        onClickCapture={onClickCapture}
        className="flex gap-3 overflow-x-auto pb-1 cursor-grab active:cursor-grabbing select-none"
      >
        {items.map((v) => (
          <div key={v.id} className="w-36 sm:w-44 md:w-48 lg:w-52 flex-shrink-0">
            <VideoCard video={v} onPlay={() => onPlay(v, items)} />
          </div>
        ))}
      </div>
    </section>
  );
}
