import { Router } from "express";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import { resolveId, getProgress } from "../lib/library.js";
import {
  getMeta,
  ensurePoster,
  startFlip,
  getFlipStatus,
  getFlipPreviewPath,
  commitFlip,
  discardFlip,
  streamStarted,
  streamEnded,
} from "../lib/media.js";
import { contentTypeFor } from "../lib/paths.js";

const router = Router();

async function requireVideo(req, res) {
  const filePath = await resolveId(req.params.id);
  if (!filePath) {
    res.status(404).json({ error: "Unknown video id" });
    return null;
  }
  return filePath;
}

async function streamFile(req, res, filePath) {
  const stat = await fs.stat(filePath);
  const contentType = contentTypeFor(filePath);
  const range = req.headers.range;

  // Tracked for the life of this response so background thumbnail
  // generation knows to back off while a video is actively being read -
  // see streamStarted/streamEnded in lib/media.js.
  let ended = false;
  streamStarted();
  const finish = () => {
    if (ended) return;
    ended = true;
    streamEnded();
  };
  res.on("close", finish);
  res.on("finish", finish);

  if (!range) {
    res.writeHead(200, {
      "Content-Length": stat.size,
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
    });
    fsSync.createReadStream(filePath).pipe(res);
    return;
  }

  const match = /bytes=(\d*)-(\d*)/.exec(range);
  const start = match && match[1] ? parseInt(match[1], 10) : 0;
  const end = match && match[2] ? parseInt(match[2], 10) : stat.size - 1;

  if (!match || Number.isNaN(start) || Number.isNaN(end) || start > end || end >= stat.size) {
    res.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
    res.end();
    return;
  }

  res.writeHead(206, {
    "Content-Range": `bytes ${start}-${end}/${stat.size}`,
    "Accept-Ranges": "bytes",
    "Content-Length": end - start + 1,
    "Content-Type": contentType,
  });
  const stream = fsSync.createReadStream(filePath, { start, end });
  stream.pipe(res);
  res.on("close", () => stream.destroy());
}

router.get("/:id", async (req, res, next) => {
  try {
    const filePath = await requireVideo(req, res);
    if (!filePath) return;
    const meta = await getMeta(req.params.id);
    const progress = await getProgress(req.params.id);
    res.json({
      id: req.params.id,
      name: filePath.split("/").pop(),
      duration: meta.duration,
      width: meta.width,
      height: meta.height,
      progress,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/stream", async (req, res, next) => {
  try {
    const filePath = await requireVideo(req, res);
    if (!filePath) return;
    await streamFile(req, res, filePath);
  } catch (err) {
    next(err);
  }
});

// Generated thumbnails don't change for a given id unless a flip is
// committed (which explicitly deletes the cached file - see
// invalidateCache in lib/media.js), so it's safe for browsers to hold onto
// them for a while instead of re-requesting on every folder revisit or
// re-scroll.
const CACHE_CONTROL = "public, max-age=604800";

router.get("/:id/thumb", async (req, res, next) => {
  try {
    const ok = await requireVideo(req, res);
    if (!ok) return;
    const dest = await ensurePoster(req.params.id);
    res.set("Cache-Control", CACHE_CONTROL);
    res.sendFile(dest);
  } catch (err) {
    next(err);
  }
});

router.post("/:id/flip", async (req, res, next) => {
  try {
    const ok = await requireVideo(req, res);
    if (!ok) return;
    await startFlip(req.params.id);
    res.status(202).json(getFlipStatus(req.params.id));
  } catch (err) {
    res.status(409).json({ error: err.message });
  }
});

router.get("/:id/flip", async (req, res, next) => {
  try {
    const ok = await requireVideo(req, res);
    if (!ok) return;
    res.json(getFlipStatus(req.params.id));
  } catch (err) {
    next(err);
  }
});

// Streams the not-yet-committed flipped copy, so the player can preview it
// without the original ever being touched.
router.get("/:id/flip/preview", async (req, res, next) => {
  try {
    const ok = await requireVideo(req, res);
    if (!ok) return;
    const previewPath = getFlipPreviewPath(req.params.id);
    await streamFile(req, res, previewPath);
  } catch (err) {
    res.status(409).json({ error: err.message });
  }
});

// Replaces the original with the previewed flipped copy.
router.post("/:id/flip/commit", async (req, res, next) => {
  try {
    const ok = await requireVideo(req, res);
    if (!ok) return;
    await commitFlip(req.params.id);
    res.json(getFlipStatus(req.params.id));
  } catch (err) {
    res.status(409).json({ error: err.message });
  }
});

// Throws away the previewed flipped copy - the original is untouched.
router.post("/:id/flip/discard", async (req, res, next) => {
  try {
    const ok = await requireVideo(req, res);
    if (!ok) return;
    await discardFlip(req.params.id);
    res.json({ status: "idle" });
  } catch (err) {
    res.status(409).json({ error: err.message });
  }
});

export default router;
