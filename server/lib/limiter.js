// A tiny global concurrency limiter. Used to bound how many ffmpeg
// processes can run at once - without this, scrolling through a library
// of hundreds of videos fires off a thumbnail request per card, each
// spawning its own ffmpeg process, which can exhaust the container's
// CPU/memory and crash it.
//
// `concurrency` can be a number or a () => number - the latter lets the
// limit itself react to live conditions (e.g. dropping to 1 while a video
// is actively streaming, so thumbnail generation doesn't compete with it
// for I/O on a slow drive).
export function createLimiter(concurrency) {
  const getLimit = typeof concurrency === "function" ? concurrency : () => concurrency;
  let active = 0;
  const queue = [];

  function next() {
    if (active >= getLimit() || queue.length === 0) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    fn()
      .then(resolve, reject)
      .finally(() => {
        active--;
        next();
      });
  }

  return function limit(fn) {
    return new Promise((resolve, reject) => {
      queue.push({ fn, resolve, reject });
      next();
    });
  };
}
