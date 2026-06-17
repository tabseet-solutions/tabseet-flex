import VideoCard from "./VideoCard.jsx";

export default function ContinueWatching({ items, onPlay }) {
  if (!items || items.length === 0) return null;
  return (
    <section className="mb-6">
      <h2 className="text-lg font-semibold mb-2">Continue Watching</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {items.map((v) => (
          <VideoCard key={v.id} video={v} onPlay={() => onPlay(v, items)} />
        ))}
      </div>
    </section>
  );
}
