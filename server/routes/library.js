import { Router } from "express";
import { listDir, listConsolidated, getProgress, listContinueWatching } from "../lib/library.js";
import { getMeta } from "../lib/media.js";
import { mapLimit } from "../lib/utils.js";
import { MEDIA_BASE } from "../lib/paths.js";

const router = Router();

// Duration comes from ffprobe (cached after first run) - fetched eagerly
// here so the grid can show durations and sort by them. Thumbnails stay
// lazy (only generated when a card actually requests its image).
async function enrichAndSort(videos, { search, sort, order }) {
  let result = videos;
  if (search) {
    result = result.filter((v) => v.name.toLowerCase().includes(search));
  }

  result = await mapLimit(result, 8, async (v) => {
    try {
      const meta = await getMeta(v.id);
      const progress = await getProgress(v.id);
      return {
        ...v,
        duration: meta.duration,
        width: meta.width,
        height: meta.height,
        size: meta.size,
        mtimeMs: meta.mtimeMs,
        progress,
      };
    } catch {
      return { ...v, duration: 0, width: 0, height: 0, size: 0, mtimeMs: 0, progress: null };
    }
  });

  const dir_ = order === "desc" ? -1 : 1;
  result.sort((a, b) => {
    if (sort === "duration") return (a.duration - b.duration) * dir_;
    if (sort === "size") return (a.size - b.size) * dir_;
    if (sort === "date") return (a.mtimeMs - b.mtimeMs) * dir_;
    return a.name.localeCompare(b.name, undefined, { numeric: true }) * dir_;
  });
  return result;
}

router.get("/continue-watching", async (req, res, next) => {
  try {
    res.json(await listContinueWatching());
  } catch (err) {
    next(err);
  }
});

// Flat, recursive view across every configured root/volume - duplicates
// across volumes are shown, not merged, so the volume tag on each video
// stays meaningful.
router.get("/consolidated", async (req, res, next) => {
  try {
    const search = (req.query.search || "").toString().toLowerCase();
    const sort = (req.query.sort || "name").toString();
    const order = (req.query.order || "asc").toString();

    const videos = await enrichAndSort(await listConsolidated(), { search, sort, order });
    res.json({ videos });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/", async (req, res, next) => {
  try {
    const dirPath = req.query.path ? String(req.query.path) : MEDIA_BASE;
    const search = (req.query.search || "").toString().toLowerCase();
    const sort = (req.query.sort || "name").toString();
    const order = (req.query.order || "asc").toString();

    const dir = await listDir(dirPath);
    const videos = await enrichAndSort(dir.videos, { search, sort, order });

    res.json({ ...dir, videos });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
