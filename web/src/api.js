async function request(path, options) {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const getDirectories = () => request("/directories");

export const addDirectory = (path) =>
  request("/directories", { method: "POST", body: JSON.stringify({ path }) });

export const removeDirectory = (path) =>
  request(`/directories?path=${encodeURIComponent(path)}`, { method: "DELETE" });

export const browse = (path) =>
  request(`/browse${path ? `?path=${encodeURIComponent(path)}` : ""}`);

export const getLibrary = ({ path, search, sort, order } = {}) => {
  const params = new URLSearchParams();
  if (path) params.set("path", path);
  if (search) params.set("search", search);
  if (sort) params.set("sort", sort);
  if (order) params.set("order", order);
  return request(`/library?${params.toString()}`);
};

export const getContinueWatching = () => request("/library/continue-watching");

export const getVideo = (id) => request(`/video/${id}`);

export const getProgress = (id) => request(`/progress/${id}`);

export const setProgress = (id, position, duration) =>
  request(`/progress/${id}`, { method: "PUT", body: JSON.stringify({ position, duration }) });

export const thumbUrl = (id) => `/api/video/${id}/thumb`;
export const streamUrl = (id) => `/api/video/${id}/stream`;

export const startFlip = (id) => request(`/video/${id}/flip`, { method: "POST" });
export const getFlipStatus = (id) => request(`/video/${id}/flip`);
export const getActiveFlips = () => request("/flips");
export const flipPreviewUrl = (id) => `/api/video/${id}/flip/preview`;
export const commitFlip = (id) => request(`/video/${id}/flip/commit`, { method: "POST" });
export const discardFlip = (id) => request(`/video/${id}/flip/discard`, { method: "POST" });

export const getDuplicates = () => request("/duplicates");
export const resolveDuplicate = (keepId, deleteIds) =>
  request("/duplicates/resolve", { method: "POST", body: JSON.stringify({ keepId, deleteIds }) });
