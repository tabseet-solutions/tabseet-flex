import fs from "node:fs/promises";
import path from "node:path";
import { MEDIA_BASE, isVideoFile, idFor, resolveWithinMedia, displayPath } from "./paths.js";
import { makeStore } from "./store.js";

const indexStore = makeStore("index.json", {});
const configStore = makeStore("config.json", { roots: [] });
const progressStore = makeStore("progress.json", {});

export async function getRoots() {
  const cfg = await configStore.read();
  return cfg.roots.map((p) => ({ path: p, display: displayPath(p) }));
}

export async function addRoot(requestedPath) {
  const resolved = resolveWithinMedia(requestedPath);
  const stat = await fs.stat(resolved);
  if (!stat.isDirectory()) throw new Error("Not a directory");
  await configStore.update((c) => {
    if (!c.roots.includes(resolved)) return { ...c, roots: [...c.roots, resolved] };
    return c;
  });
  return getRoots();
}

export async function removeRoot(requestedPath) {
  const resolved = resolveWithinMedia(requestedPath);
  await configStore.update((c) => ({ ...c, roots: c.roots.filter((r) => r !== resolved) }));
  return getRoots();
}

// Seeds the known default library roots, for whichever of them are
// actually mounted, if no roots have been configured yet.
const DEFAULT_ROOTS = [
  path.join(MEDIA_BASE, "renegade", "PH"),
  path.join(MEDIA_BASE, "microsd", "PH"),
];

export async function ensureDefaultRoot() {
  const cfg = await configStore.read();
  if (cfg.roots.length > 0) return;
  const found = [];
  for (const defaultPath of DEFAULT_ROOTS) {
    try {
      const stat = await fs.stat(defaultPath);
      if (stat.isDirectory()) found.push(defaultPath);
    } catch {
      // volume not mounted - user can add a root from the UI
    }
  }
  if (found.length > 0) {
    await configStore.update((c) => ({ ...c, roots: found }));
  }
}

export async function listDir(requestedPath) {
  const resolved = resolveWithinMedia(requestedPath);
  const entries = await fs.readdir(resolved, { withFileTypes: true });

  const folders = [];
  const videoEntries = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(resolved, entry.name);
    if (entry.isDirectory()) {
      folders.push({ name: entry.name, path: full });
    } else if (entry.isFile() && isVideoFile(entry.name)) {
      // No fs.stat() here on purpose - size/mtime come from the cached
      // probe (getMeta, in the library route) instead of a fresh stat per
      // file per folder load, which was slow against the USB/exFAT drive.
      videoEntries.push({ id: idFor(full), name: entry.name, path: full });
    }
  }
  folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  if (videoEntries.length > 0) {
    await indexStore.update((idx) => {
      for (const v of videoEntries) {
        if (idx[v.id]?.path !== v.path) idx[v.id] = { path: v.path };
      }
      return idx;
    });
  }

  const base = path.resolve(MEDIA_BASE);
  return {
    path: resolved,
    display: displayPath(resolved),
    parent: resolved === base ? null : path.dirname(resolved),
    breadcrumbs: breadcrumbsFor(resolved),
    folders: folders.map((f) => ({ ...f, display: displayPath(f.path) })),
    videos: videoEntries.map((v) => ({ id: v.id, name: v.name, path: v.path })),
  };
}

export function breadcrumbsFor(resolvedPath) {
  const base = path.resolve(MEDIA_BASE);
  const rel = displayPath(resolvedPath);
  if (rel === "/") return [{ name: "Volumes", path: base }];
  const parts = rel.split(path.sep).filter(Boolean);
  const crumbs = [{ name: "Volumes", path: base }];
  let acc = base;
  for (const part of parts) {
    acc = path.join(acc, part);
    crumbs.push({ name: part, path: acc });
  }
  return crumbs;
}

export async function resolveId(id) {
  const idx = await indexStore.read();
  return idx[id]?.path || null;
}

// Lets other modules (e.g. duplicate-scanning) register videos they find
// without reaching into indexStore directly.
export async function registerVideos(videos) {
  if (videos.length === 0) return;
  await indexStore.update((idx) => {
    for (const v of videos) {
      if (idx[v.id]?.path !== v.path) idx[v.id] = { path: v.path };
    }
    return idx;
  });
}

// Removes all trace of a video from the index/progress stores - used when
// a file has been deleted (e.g. resolving a duplicate).
export async function forgetVideo(id) {
  await indexStore.update((idx) => {
    if (!(id in idx)) return idx;
    const next = { ...idx };
    delete next[id];
    return next;
  });
  await progressStore.update((all) => {
    if (!(id in all)) return all;
    const next = { ...all };
    delete next[id];
    return next;
  });
}

export async function browse(requestedPath) {
  const resolved = resolveWithinMedia(requestedPath);
  const entries = await fs.readdir(resolved, { withFileTypes: true });
  const folders = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith("."))
    .map((e) => ({ name: e.name, path: path.join(resolved, e.name) }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const base = path.resolve(MEDIA_BASE);
  return {
    path: resolved,
    display: displayPath(resolved),
    parent: resolved === base ? null : path.dirname(resolved),
    folders,
  };
}

export async function getProgress(id) {
  const all = await progressStore.read();
  return all[id] || null;
}

export async function setProgress(id, position, duration) {
  await progressStore.update((all) => ({
    ...all,
    [id]: { position, duration, updatedAt: Date.now() },
  }));
}

export async function listContinueWatching() {
  const all = await progressStore.read();
  const idx = await indexStore.read();
  const items = Object.entries(all)
    .filter(([, p]) => p.duration > 0 && p.position > 5 && p.position < p.duration * 0.95)
    .sort((a, b) => b[1].updatedAt - a[1].updatedAt)
    .slice(0, 24)
    .map(([id, p]) => {
      const filePath = idx[id]?.path;
      if (!filePath) return null;
      return { id, name: path.basename(filePath), path: filePath, progress: p };
    })
    .filter(Boolean);
  return items;
}
