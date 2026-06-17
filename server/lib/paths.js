import crypto from "node:crypto";
import path from "node:path";

// Everything browsable/streamable must live under this prefix inside the
// container - it's where docker-compose bind-mounts the host's /Volumes
// (i.e. every external/mounted drive on the Mac, including renegade/PH).
export const MEDIA_BASE = process.env.MEDIA_BASE || "/media/Volumes";

export const VIDEO_EXTENSIONS = new Set([
  ".mp4",
  ".m4v",
  ".mkv",
  ".mov",
  ".avi",
  ".webm",
]);

const CONTENT_TYPES = {
  ".mp4": "video/mp4",
  ".m4v": "video/x-m4v",
  ".mkv": "video/x-matroska",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
  ".webm": "video/webm",
};

export function contentTypeFor(filePath) {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

export function isVideoFile(name) {
  return VIDEO_EXTENSIONS.has(path.extname(name).toLowerCase());
}

export function idFor(absolutePath) {
  return crypto.createHash("sha1").update(absolutePath).digest("hex").slice(0, 16);
}

// Resolves a user-supplied (absolute) path and guarantees it stays within
// MEDIA_BASE. Throws if it escapes (e.g. via "..") - this is the only
// filesystem the app is allowed to read from.
export function resolveWithinMedia(requestedPath) {
  const base = path.resolve(MEDIA_BASE);
  const resolved = requestedPath ? path.resolve(requestedPath) : base;
  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    throw new Error("Path escapes media base");
  }
  return resolved;
}

export function displayPath(absolutePath) {
  const base = path.resolve(MEDIA_BASE);
  if (absolutePath === base) return "/";
  return absolutePath.startsWith(base + path.sep)
    ? absolutePath.slice(base.length + 1)
    : absolutePath;
}
