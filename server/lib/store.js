import fs from "node:fs/promises";
import path from "node:path";

const DATA_DIR = process.env.DATA_DIR || path.resolve("data");

// Tiny JSON-file store with a read-through, write-through in-memory cache.
//
// Without this, every read re-parses the *entire* file from disk - fine
// for a one-off lookup, but folder listings call getMeta() once per video
// to merge in durations, so listing a folder of N videos turned into N
// full reads+parses of the same (also O(N)-sized) meta.json. That's the
// O(N^2) pattern that made scrolling/opening large folders slow: scaled
// with library size, all to look up data that's already sitting in memory
// a moment after the first read.
const caches = new Map(); // file -> parsed contents
const loads = new Map(); // file -> in-flight initial load promise
const locks = new Map(); // file -> mutex chain for updates

function withLock(file, fn) {
  const prev = locks.get(file) || Promise.resolve();
  const next = prev.then(fn, fn);
  locks.set(file, next.catch(() => {}));
  return next;
}

async function readJson(file, fallback) {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, file), "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return fallback;
    throw err;
  }
}

async function writeJson(file, data) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const target = path.join(DATA_DIR, file);
  const tmp = `${target}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2));
  await fs.rename(tmp, target);
}

// Loads a file into the cache exactly once, even if many callers race to
// read it before the first load finishes.
function load(file, fallback) {
  if (caches.has(file)) return Promise.resolve(caches.get(file));
  let pending = loads.get(file);
  if (!pending) {
    pending = readJson(file, fallback).then((data) => {
      caches.set(file, data);
      loads.delete(file);
      return data;
    });
    loads.set(file, pending);
  }
  return pending;
}

export function makeStore(file, fallback) {
  return {
    async read() {
      return load(file, fallback);
    },
    async update(mutator) {
      return withLock(file, async () => {
        const current = await load(file, fallback);
        const next = await mutator(current);
        caches.set(file, next);
        await writeJson(file, next);
        return next;
      });
    },
  };
}
