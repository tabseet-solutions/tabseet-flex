import fs from "node:fs/promises";
import { constants as FS } from "node:fs";
import path from "node:path";
import { getRoots, registerVideos, forgetVideo, resolveId, walkVideos } from "./library.js";
import { invalidateCache, forgetMeta } from "./media.js";

// Same name (ignoring extension/case/whitespace) is the duplicate
// heuristic - good enough for a personal library where the same file
// sometimes ends up copied onto more than one drive. Thumbnails are shown
// alongside the result so it's easy to visually confirm before deleting
// anything.
function normalizedKey(name) {
  return name.replace(/\.[^.]+$/, "").trim().toLowerCase();
}

export async function findDuplicates() {
  const roots = await getRoots();
  const allVideos = [];
  for (const root of roots) {
    const videos = await walkVideos(root.path);
    allVideos.push(...videos.map((v) => ({ ...v, root: root.path, rootDisplay: root.display })));
  }

  await registerVideos(allVideos.map((v) => ({ id: v.id, path: v.path })));

  const groups = new Map();
  for (const v of allVideos) {
    const key = normalizedKey(v.name);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(v);
  }

  const duplicateGroups = [...groups.values()].filter((copies) => copies.length >= 2);

  const duplicates = await Promise.all(
    duplicateGroups.map(async (copies) => ({
      key: normalizedKey(copies[0].name),
      copies: await Promise.all(
        copies.map(async (c) => {
          const size = await fs.stat(c.path).then((s) => s.size).catch(() => 0);
          return { id: c.id, name: c.name, root: c.root, rootDisplay: c.rootDisplay, size };
        })
      ),
    }))
  );
  duplicates.sort((a, b) => a.key.localeCompare(b.key));
  return duplicates;
}

// Permanently deletes the non-kept copies. Each deletion is independent -
// one failing (e.g. a read-only mount) doesn't stop the others.
export async function resolveDuplicate(keepId, deleteIds) {
  if (!keepId) throw new Error("keepId is required");
  if (!Array.isArray(deleteIds) || deleteIds.length === 0) {
    throw new Error("deleteIds must be a non-empty array");
  }
  if (deleteIds.includes(keepId)) throw new Error("keepId cannot also be in deleteIds");

  const results = [];
  for (const id of deleteIds) {
    try {
      const filePath = await resolveId(id);
      if (!filePath) throw new Error("Unknown id");
      await fs.access(path.dirname(filePath), FS.W_OK);
      await fs.unlink(filePath);
      await invalidateCache(id);
      await forgetMeta(id);
      await forgetVideo(id);
      results.push({ id, ok: true });
    } catch (err) {
      results.push({ id, ok: false, error: err.message });
    }
  }
  return { keepId, results };
}
