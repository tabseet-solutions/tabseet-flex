// Coordinates thumbnail fetches so they never win a race against video
// playback for the browser's small per-origin connection pool (6 on
// HTTP/1.1, which is what this app's plain `docker compose` setup serves
// over - no HTTP/2/TLS in front of it). A fast scroll through a library
// with uncached thumbnails can fire off dozens of <img> requests; each one
// that's still in flight (mid ffmpeg-generation on the server) holds a
// connection open, so a `/stream` request fired right after can end up
// queued behind them at the network layer - looking exactly like playback
// "refusing" to start until one of those connections frees up.
//
// Two things fix that: a concurrency cap (so browsing alone never claims
// every connection) and a hard pause that aborts whatever's in flight the
// instant the user asks to play something - mirroring streamStarted()/
// streamEnded() in server/lib/media.js, which does the same job for the
// server's own ffmpeg contention.
const MAX_CONCURRENT = 4;

let active = 0;
let paused = false;
const queue = [];
const activeControllers = new Set();

function pump() {
  if (paused) return;
  while (active < MAX_CONCURRENT && queue.length > 0) {
    runJob(queue.shift());
  }
}

function runJob(job) {
  active++;
  const controller = new AbortController();
  job.controller = controller;
  activeControllers.add(controller);
  fetch(job.url, { signal: controller.signal })
    .then((res) => {
      if (!res.ok) throw new Error(`Thumbnail fetch failed: ${res.status}`);
      return res.blob();
    })
    .then((blob) => job.resolve(URL.createObjectURL(blob)))
    .catch((err) => {
      if (err.name === "AbortError") {
        // Aborted by pauseThumbnailLoading(), not by its own consumer -
        // put it back at the front so it's first up again once
        // resumeThumbnailLoading() runs, rather than losing its place to
        // cards that entered the viewport later.
        if (!job.cancelled) queue.unshift(job);
      } else if (!job.cancelled) {
        job.reject(err);
      }
    })
    .finally(() => {
      activeControllers.delete(controller);
      active--;
      pump();
    });
}

// Queues a thumbnail fetch through the shared, pausable concurrency limit.
// Returns a cancel() so a card that scrolls out / unmounts before its turn
// can drop out of the queue (or abort its own in-flight request) instead of
// wasting a connection on a thumbnail nobody's looking at anymore.
export function requestThumbnail(url) {
  const job = { url, cancelled: false, controller: null };
  const promise = new Promise((resolve, reject) => {
    job.resolve = resolve;
    job.reject = reject;
  });
  queue.push(job);
  pump();
  return {
    promise,
    cancel() {
      job.cancelled = true;
      const idx = queue.indexOf(job);
      if (idx !== -1) queue.splice(idx, 1);
      job.controller?.abort();
    },
  };
}

// Called the instant the user asks to play a video. Aborts every in-flight
// thumbnail fetch right away (freeing their connections immediately,
// rather than waiting out however long ffmpeg takes to finish) and blocks
// new ones from starting until resumeThumbnailLoading().
export function pauseThumbnailLoading() {
  paused = true;
  for (const controller of activeControllers) controller.abort();
}

export function resumeThumbnailLoading() {
  paused = false;
  pump();
}
