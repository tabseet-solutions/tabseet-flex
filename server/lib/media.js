import fs from "node:fs/promises";
import { constants as FS } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { resolveId } from "./library.js";
import { makeStore } from "./store.js";
import { createLimiter } from "./limiter.js";

const CACHE_DIR = process.env.CACHE_DIR || path.resolve("cache");
const metaStore = makeStore("meta.json", {});

// Poster extraction is cheap in CPU terms (single seek + one frame), but
// it still has to read from the same slow USB/exFAT drive a video may
// currently be streaming from - on this drive, a couple of concurrent
// readers is enough to starve active playback. So the limit itself drops
// to 1 while any video is actively streaming, and only opens back up to 3
// (for fast grid population while just browsing) once nothing's playing.
//
// That limit alone only stops *new* poster jobs from starting - it does
// nothing about one already mid-decode the moment a stream begins, which
// would otherwise keep competing with playback for I/O until it finishes on
// its own. So any such job is tracked here and actually frozen (SIGSTOP) for
// as long as any stream is active, then resumed (SIGCONT) once nothing is -
// rather than just relying on the concurrency limit to eventually stop
// competing on its own time.
let activeStreams = 0;
const pausableChildren = new Set();
export function streamStarted() {
  activeStreams++;
  for (const child of pausableChildren) child.kill("SIGSTOP");
}
export function streamEnded() {
  activeStreams = Math.max(0, activeStreams - 1);
  if (activeStreams === 0) {
    for (const child of pausableChildren) child.kill("SIGCONT");
  }
}
const limitPoster = createLimiter(() => (activeStreams > 0 ? 1 : 3));
const posterInFlight = new Map();

function run(cmd, args, { pausable = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args);
    if (pausable) {
      pausableChildren.add(child);
      // A stream that was already active won't fire streamStarted() again
      // for this job, so it has to start paused itself instead of getting
      // a head start on the drive before anyone freezes it.
      if (activeStreams > 0) child.kill("SIGSTOP");
    }
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", reject);
    child.on("close", (code) => {
      pausableChildren.delete(child);
      if (code === 0) resolve(stdout);
      else reject(new Error(`${cmd} exited ${code}: ${stderr.slice(-500)}`));
    });
  });
}

// Like run(), but for long-running ffmpeg jobs where we want live progress.
// Relies on `-progress pipe:1`, which makes ffmpeg emit clean key=value
// lines (out_time_us=...) on stdout instead of its usual human stats.
function runFfmpegWithProgress(args, onProgress) {
  return new Promise((resolve, reject) => {
    const child = spawn("ffmpeg", [...args, "-progress", "pipe:1", "-nostats"]);
    let buffer = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      buffer += chunk;
      let idx;
      while ((idx = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        const eq = line.indexOf("=");
        if (eq === -1) continue;
        if (line.slice(0, eq) === "out_time_us") {
          const seconds = parseInt(line.slice(eq + 1), 10) / 1e6;
          if (!Number.isNaN(seconds)) onProgress(seconds);
        }
      }
    });
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-500)}`));
    });
  });
}

async function statOf(filePath) {
  const s = await fs.stat(filePath);
  return { size: s.size, mtimeMs: s.mtimeMs };
}

async function probeFile(filePath) {
  const out = await run("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height:format=duration",
    "-of",
    "json",
    filePath,
  ]);
  const json = JSON.parse(out);
  const stream = json.streams?.[0] || {};
  const duration = parseFloat(json.format?.duration || "0") || 0;
  return {
    duration,
    width: stream.width || 0,
    height: stream.height || 0,
  };
}

// Returns cached probe metadata. Trusts the cache outright rather than
// re-stat()ing the file on every call to check for drift - stat() against
// a USB/exFAT drive through virtiofs isn't free, and folder listings call
// this once per video, so re-validating on every read defeated much of
// the point of caching. The cache is invalidated explicitly at the one
// place content can actually change instead (commitFlip, below).
export async function getMeta(id) {
  const cache = await metaStore.read();
  const cached = cache[id];
  if (cached) return cached;

  const filePath = await resolveId(id);
  if (!filePath) throw new Error("Unknown id");
  const stat = await statOf(filePath);
  const probed = await probeFile(filePath);
  const entry = { ...probed, ...stat };
  await metaStore.update((c) => ({ ...c, [id]: entry }));
  return entry;
}

function posterPath(id) {
  return path.join(CACHE_DIR, `${id}.jpg`);
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export async function ensurePoster(id) {
  const dest = posterPath(id);
  if (await exists(dest)) return dest;

  const inFlight = posterInFlight.get(id);
  if (inFlight) return inFlight;

  const job = limitPoster(async () => {
    if (await exists(dest)) return dest;
    const filePath = await resolveId(id);
    if (!filePath) throw new Error("Unknown id");
    const meta = await getMeta(id);
    const at = Math.min(Math.max(meta.duration * 0.1, 1), Math.max(meta.duration - 1, 1));
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await run(
      "ffmpeg",
      [
        "-y",
        "-ss",
        String(at),
        "-i",
        filePath,
        "-frames:v",
        "1",
        "-threads",
        "1",
        "-q:v",
        "3",
        "-vf",
        "scale='min(480,iw)':-2",
        dest,
      ],
      { pausable: true }
    );
    return dest;
  }).finally(() => posterInFlight.delete(id));

  posterInFlight.set(id, job);
  return job;
}

export function cachePaths(id) {
  return { poster: posterPath(id) };
}

export async function invalidateCache(id) {
  const { poster } = cachePaths(id);
  await fs.unlink(poster).catch(() => {});
}

// Drops the cached probe (duration/width/height/size/mtime) for an id, so
// the next getMeta() call re-probes instead of serving stale data.
export async function forgetMeta(id) {
  await metaStore.update((c) => {
    if (!(id in c)) return c;
    const next = { ...c };
    delete next[id];
    return next;
  });
}

// In-memory job tracking is fine here - one container process, and a job
// that's still "running" after a restart genuinely was interrupted anyway.
const flipJobs = new Map();

function tmpFlipPath(filePath, id) {
  return path.join(path.dirname(filePath), `.flip-${id}${path.extname(filePath)}`);
}

export function getFlipStatus(id) {
  return flipJobs.get(id) || { status: "idle" };
}

// All jobs the server currently knows about (running/ready, plus recently
// finished ones so the UI can show a brief done/error state) - lets the
// frontend discover in-progress flips regardless of which video/page it's
// currently looking at, including after a browser reload. "ready" jobs are
// never auto-pruned - they wait for an explicit keep/discard.
export function listFlipJobs() {
  const now = Date.now();
  for (const [id, job] of flipJobs) {
    const finished = job.status === "done" || job.status === "error";
    if (finished && job.finishedAt && now - job.finishedAt > 60_000) {
      flipJobs.delete(id);
    }
  }
  return Object.fromEntries(flipJobs);
}

// Deletes any leftover flip-preview files from a previous server run -
// their in-memory job state (and therefore the "ready, awaiting your
// decision" prompt) doesn't survive a restart, so there's no safe way to
// resume them; treat them as garbage. Recurses since videos can be nested.
export async function cleanupOrphanedFlips(rootDirs) {
  async function sweep(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await sweep(full);
      } else if (entry.isFile() && entry.name.startsWith(".flip-")) {
        await fs.unlink(full).catch(() => {});
      }
    }
  }
  for (const dir of rootDirs) {
    await sweep(dir);
  }
}

// Mirrors the source file left-to-right into a separate copy (never
// touching the original) so it can be previewed before committing. There's
// no way to flip pixels without decoding/re-encoding, so this re-compresses
// (libx264, crf 18) - slow and slightly lossy, but the only way to bake the
// flip into a real file rather than just the player's preview. Runs in the
// background so other videos remain watchable/browsable while this runs.
export async function startFlip(id) {
  const existing = flipJobs.get(id)?.status;
  if (existing === "running" || existing === "ready") {
    throw new Error("A flip is already in progress or awaiting your decision for this video");
  }
  const filePath = await resolveId(id);
  if (!filePath) throw new Error("Unknown id");

  flipJobs.set(id, { status: "running", startedAt: Date.now(), progress: 0 });
  runFlip(id, filePath).catch(() => {});
}

async function runFlip(id, filePath) {
  const tmp = tmpFlipPath(filePath, id);
  try {
    await fs.access(path.dirname(filePath), FS.W_OK);
    const meta = await getMeta(id);
    const totalDuration = meta.duration || 0;
    const ext = path.extname(filePath).toLowerCase();

    const args = [
      "-y",
      "-i",
      filePath,
      "-vf",
      "hflip",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "18",
      "-c:a",
      "copy",
    ];
    if ([".mp4", ".m4v", ".mov"].includes(ext)) {
      args.push("-movflags", "+faststart");
    }
    args.push(tmp);

    await runFfmpegWithProgress(args, (seconds) => {
      const progress = totalDuration > 0 ? Math.min(99, Math.round((seconds / totalDuration) * 100)) : null;
      flipJobs.set(id, { ...flipJobs.get(id), status: "running", progress });
    });
    flipJobs.set(id, {
      status: "ready",
      startedAt: flipJobs.get(id)?.startedAt,
      readyAt: Date.now(),
      progress: 100,
      tmpPath: tmp,
    });
  } catch (err) {
    await fs.unlink(tmp).catch(() => {});
    flipJobs.set(id, {
      status: "error",
      startedAt: flipJobs.get(id)?.startedAt,
      finishedAt: Date.now(),
      error: err.message,
    });
  }
}

export function getFlipPreviewPath(id) {
  const job = flipJobs.get(id);
  if (job?.status !== "ready" || !job.tmpPath) throw new Error("No flip preview ready for this video");
  return job.tmpPath;
}

// Replaces the original file with the previewed flipped copy.
export async function commitFlip(id) {
  const job = flipJobs.get(id);
  if (job?.status !== "ready" || !job.tmpPath) throw new Error("No flip preview ready for this video");
  const filePath = await resolveId(id);
  if (!filePath) throw new Error("Unknown id");

  await fs.rename(job.tmpPath, filePath);
  await invalidateCache(id);
  // The committed file has a new size/mtime - drop the cached probe so the
  // next getMeta() re-stats/probes instead of serving stale size info.
  await forgetMeta(id);
  flipJobs.set(id, { status: "done", startedAt: job.startedAt, finishedAt: Date.now(), progress: 100 });
}

// Throws away the previewed flipped copy, leaving the original untouched.
export async function discardFlip(id) {
  const job = flipJobs.get(id);
  if (!job?.tmpPath) throw new Error("No flip preview to discard for this video");
  await fs.unlink(job.tmpPath).catch(() => {});
  flipJobs.delete(id);
}
