import { PlayIcon } from "@heroicons/react/24/solid";
import { thumbUrl } from "../api.js";
import { formatDuration } from "../format.js";
import { useThumbnail } from "../hooks/useThumbnail.js";

export default function VideoCard({ video, onPlay, volume }) {
  const watchPct =
    video.progress && video.progress.duration
      ? Math.min(100, (video.progress.position / video.progress.duration) * 100)
      : 0;
  const [thumbRef, thumbSrc] = useThumbnail(thumbUrl(video.id));

  return (
    <button
      onClick={() => onPlay(video)}
      data-grid-item="true"
      className="group relative flex flex-col rounded-lg overflow-hidden bg-gray-100 dark:bg-base-800 hover:ring-2 hover:ring-primary-500 transition-all text-left focus:outline-none focus:ring-2 focus:ring-primary-500"
    >
      <div ref={thumbRef} className="relative w-full aspect-video bg-gray-200 dark:bg-base-700 overflow-hidden">
        {thumbSrc && (
          <img
            src={thumbSrc}
            alt={video.name}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 transition-opacity">
          <PlayIcon className="w-12 h-12 text-white drop-shadow-lg" />
        </div>
        {video.duration > 0 && (
          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 text-xs bg-black/75 rounded">
            {formatDuration(video.duration)}
          </span>
        )}
        {volume && (
          <span className="absolute top-1 left-1 px-1.5 py-0.5 text-xs bg-black/75 rounded text-secondary-400">
            {volume}
          </span>
        )}
        {watchPct > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
            <div className="h-full bg-primary-500" style={{ width: `${watchPct}%` }} />
          </div>
        )}
      </div>
      <div className="px-2 py-1.5">
        <p className="text-sm truncate" title={video.name}>
          {video.name.replace(/\.[^.]+$/, "")}
        </p>
      </div>
    </button>
  );
}
