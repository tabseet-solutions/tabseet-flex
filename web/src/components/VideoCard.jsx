import { thumbUrl } from "../api.js";
import { formatDuration } from "../format.js";

export default function VideoCard({ video, onPlay }) {
  const watchPct =
    video.progress && video.progress.duration
      ? Math.min(100, (video.progress.position / video.progress.duration) * 100)
      : 0;

  return (
    <button
      onClick={() => onPlay(video)}
      data-grid-item="true"
      className="group relative flex flex-col rounded-lg overflow-hidden bg-base-800 hover:ring-2 hover:ring-accent-500 transition-all text-left focus:outline-none focus:ring-2 focus:ring-accent-500"
    >
      <div className="relative aspect-video bg-base-700 overflow-hidden">
        <img
          src={thumbUrl(video.id)}
          alt={video.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 transition-opacity">
          <svg viewBox="0 0 24 24" className="w-12 h-12 text-white drop-shadow-lg" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        {video.duration > 0 && (
          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 text-xs bg-black/75 rounded">
            {formatDuration(video.duration)}
          </span>
        )}
        {watchPct > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
            <div className="h-full bg-accent-500" style={{ width: `${watchPct}%` }} />
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
