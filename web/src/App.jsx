import { useCallback, useEffect, useRef, useState } from "react";
import TopBar from "./components/TopBar.jsx";
import Breadcrumbs from "./components/Breadcrumbs.jsx";
import FolderCard from "./components/FolderCard.jsx";
import VideoCard from "./components/VideoCard.jsx";
import ContinueWatching from "./components/ContinueWatching.jsx";
import SettingsModal from "./components/SettingsModal.jsx";
import Player from "./components/Player.jsx";
import FlipStatusBar from "./components/FlipStatusBar.jsx";
import DuplicatesModal from "./components/DuplicatesModal.jsx";
import {
  getDirectories,
  getLibrary,
  getConsolidated,
  getContinueWatching,
  getVideo,
  getActiveFlips,
  startFlip as apiStartFlip,
  commitFlip as apiCommitFlip,
  discardFlip as apiDiscardFlip,
} from "./api.js";
import { pauseThumbnailLoading, resumeThumbnailLoading } from "./lib/thumbnailLoader.js";
import { useTheme } from "./hooks/useTheme.js";

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const [roots, setRoots] = useState([]);
  const [view, setView] = useState("folders");
  const [currentPath, setCurrentPath] = useState(null);
  const [dir, setDir] = useState(null);
  const [consolidated, setConsolidated] = useState(null);
  const [consolidatedLoading, setConsolidatedLoading] = useState(false);
  const [consolidatedError, setConsolidatedError] = useState(null);
  const [continueWatching, setContinueWatching] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("name");
  const [order, setOrder] = useState("asc");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [duplicatesOpen, setDuplicatesOpen] = useState(false);
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeFlips, setActiveFlips] = useState({});
  const flipNamesRef = useRef({});
  const mainRef = useRef(null);
  const focusedPathRef = useRef(undefined);

  const loadRoots = useCallback(async () => {
    setRoots(await getDirectories());
  }, []);

  const loadContinueWatching = useCallback(async () => {
    setContinueWatching(await getContinueWatching());
  }, []);

  useEffect(() => {
    loadRoots();
    loadContinueWatching();
  }, [loadRoots, loadContinueWatching]);

  // Flip jobs live server-side, independent of whatever video/folder is
  // currently on screen, so they're tracked here (not in Player) and
  // discovered on load in case one was left running/ready from before.
  const pollFlips = useCallback(async () => {
    let jobs;
    try {
      jobs = await getActiveFlips();
    } catch {
      return;
    }
    await Promise.all(
      Object.keys(jobs).map(async (id) => {
        if (!flipNamesRef.current[id]) {
          try {
            flipNamesRef.current[id] = (await getVideo(id)).name;
          } catch {
            /* ignore */
          }
        }
      })
    );
    setActiveFlips(
      Object.fromEntries(
        Object.entries(jobs).map(([id, job]) => [id, { ...job, name: flipNamesRef.current[id] }])
      )
    );
  }, []);

  useEffect(() => {
    pollFlips();
  }, [pollFlips]);

  useEffect(() => {
    const hasRunning = Object.values(activeFlips).some((j) => j.status === "running");
    if (!hasRunning) return;
    const t = setInterval(pollFlips, 1500);
    return () => clearInterval(t);
  }, [activeFlips, pollFlips]);

  // Auto-dismiss terminal "done" toasts after a few seconds.
  useEffect(() => {
    const doneIds = Object.entries(activeFlips)
      .filter(([, j]) => j.status === "done")
      .map(([id]) => id);
    if (doneIds.length === 0) return;
    const t = setTimeout(() => {
      setActiveFlips((prev) => {
        const next = { ...prev };
        doneIds.forEach((id) => delete next[id]);
        return next;
      });
    }, 5000);
    return () => clearTimeout(t);
  }, [activeFlips]);

  const handleStartFlip = useCallback(async (video) => {
    flipNamesRef.current[video.id] = video.name;
    setActiveFlips((prev) => ({ ...prev, [video.id]: { status: "running", progress: 0, name: video.name } }));
    try {
      const status = await apiStartFlip(video.id);
      setActiveFlips((prev) => ({ ...prev, [video.id]: { ...status, name: video.name } }));
    } catch (err) {
      setActiveFlips((prev) => ({ ...prev, [video.id]: { status: "error", error: err.message, name: video.name } }));
    }
  }, []);

  // Re-fetches whichever view is currently on screen - used after anything
  // that can change what it shows (a flip being kept, the player closing).
  const refreshCurrentView = useCallback(() => {
    if (view === "consolidated") {
      getConsolidated({ search, sort, order }).then(setConsolidated).catch(() => {});
    } else if (currentPath !== null) {
      getLibrary({ path: currentPath, search, sort, order }).then(setDir).catch(() => {});
    }
  }, [view, currentPath, search, sort, order]);

  const handleKeepFlip = useCallback(
    async (id) => {
      const status = await apiCommitFlip(id);
      setActiveFlips((prev) => ({ ...prev, [id]: { ...prev[id], ...status } }));
      loadContinueWatching();
      refreshCurrentView();
    },
    [refreshCurrentView, loadContinueWatching]
  );

  const handleDiscardFlip = useCallback(async (id) => {
    try {
      await apiDiscardFlip(id);
    } finally {
      setActiveFlips((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }, []);

  const dismissFlip = useCallback((id) => {
    setActiveFlips((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const handlePreviewFlip = useCallback(async (id) => {
    try {
      const v = await getVideo(id);
      pauseThumbnailLoading();
      setPlayer({ video: v, siblings: [v] });
    } catch {
      /* ignore */
    }
  }, []);

  // Debounce free-text search before it hits the API.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (view !== "folders" || currentPath === null) {
      setDir(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getLibrary({ path: currentPath, search, sort, order })
      .then((res) => {
        if (!cancelled) setDir(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [view, currentPath, search, sort, order]);

  useEffect(() => {
    if (view !== "consolidated") {
      setConsolidated(null);
      return;
    }
    let cancelled = false;
    setConsolidatedLoading(true);
    setConsolidatedError(null);
    getConsolidated({ search, sort, order })
      .then((res) => {
        if (!cancelled) setConsolidated(res);
      })
      .catch((err) => {
        if (!cancelled) setConsolidatedError(err.message);
      })
      .finally(() => {
        if (!cancelled) setConsolidatedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [view, search, sort, order]);

  // Auto-focus the first card whenever a new folder/view finishes loading
  // (not on every reload of the *same* view - search/sort/player-close also
  // reload `dir`/`consolidated`, and refocusing on those would yank focus out
  // of the search box while typing).
  const viewKey = view === "consolidated" ? "consolidated" : currentPath;
  const isViewLoading = view === "consolidated" ? consolidatedLoading : loading;
  useEffect(() => {
    if (isViewLoading || player || settingsOpen || duplicatesOpen) return;
    if (focusedPathRef.current === viewKey) return;
    const active = document.activeElement;
    const activeTag = active?.tagName;
    if (activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT") return;
    const first = mainRef.current?.querySelector("[data-grid-item]");
    if (first) {
      first.focus();
      focusedPathRef.current = viewKey;
    }
  }, [viewKey, isViewLoading, dir, consolidated, roots, continueWatching, player, settingsOpen, duplicatesOpen]);

  // Arrow-key navigation across the folder/video card grid(s). Cards are
  // plain DOM order (CSS grid auto-flow row), so rather than hardcoding each
  // grid's responsive column count, this reads actual rendered positions -
  // it works the same whether the target is in the same grid or (crossing
  // row boundaries) a different one entirely, e.g. from folders into videos.
  useEffect(() => {
    const ARROWS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];
    function onKeyDown(e) {
      if (!ARROWS.includes(e.key)) return;
      if (player || settingsOpen || duplicatesOpen) return;
      const active = document.activeElement;
      const activeTag = active?.tagName;
      if (activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT") return;
      const container = mainRef.current;
      if (!container) return;
      const items = Array.from(container.querySelectorAll("[data-grid-item]"));
      if (items.length === 0) return;

      if (!items.includes(active)) {
        e.preventDefault();
        items[0].focus();
        return;
      }

      const TOL = 10;
      const rect = active.getBoundingClientRect();
      const candidates = items
        .filter((item) => item !== active)
        .map((item) => {
          const r = item.getBoundingClientRect();
          return { item, dx: r.left - rect.left, dy: r.top - rect.top };
        });

      let next = null;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        const sign = e.key === "ArrowRight" ? 1 : -1;
        const sameRow = candidates.filter((c) => Math.abs(c.dy) < TOL && Math.sign(c.dx) === sign);
        sameRow.sort((a, b) => Math.abs(a.dx) - Math.abs(b.dx));
        next = sameRow[0]?.item;
      } else {
        const sign = e.key === "ArrowDown" ? 1 : -1;
        const inDirection = candidates.filter((c) => Math.abs(c.dy) >= TOL && Math.sign(c.dy) === sign);
        if (inDirection.length > 0) {
          const closestDy = Math.min(...inDirection.map((c) => Math.abs(c.dy)));
          const targetRow = inDirection.filter((c) => Math.abs(Math.abs(c.dy) - closestDy) < TOL);
          targetRow.sort((a, b) => Math.abs(a.dx) - Math.abs(b.dx));
          next = targetRow[0]?.item;
        }
      }

      if (next) {
        e.preventDefault();
        next.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [player, settingsOpen, duplicatesOpen]);

  const openFolder = (path) => {
    setSearchInput("");
    setSearch("");
    setView("folders");
    setCurrentPath(path);
  };

  const goHome = () => {
    setSearchInput("");
    setSearch("");
    setView("folders");
    setCurrentPath(null);
  };

  const changeView = (next) => {
    setView(next);
  };

  const handlePlay = (video, siblings) => {
    // Stop competing with the stream request for a connection before it's
    // even issued - see lib/thumbnailLoader.js.
    pauseThumbnailLoading();
    setPlayer({ video, siblings });
  };

  const handleClosePlayer = () => {
    setPlayer(null);
    resumeThumbnailLoading();
    loadContinueWatching();
    refreshCurrentView();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar
        search={searchInput}
        onSearchChange={setSearchInput}
        sort={sort}
        order={order}
        onSortChange={setSort}
        onOrderChange={setOrder}
        onHome={goHome}
        onSettings={() => setSettingsOpen(true)}
        onDuplicates={() => setDuplicatesOpen(true)}
        view={view}
        onChangeView={changeView}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main ref={mainRef} className="flex-1 px-4 py-4">
        {view === "consolidated" ? (
          <>
            {consolidatedError && <p className="text-red-600 dark:text-red-400 text-sm my-2">{consolidatedError}</p>}
            {consolidatedLoading && <p className="text-gray-500 text-sm my-4">Loading…</p>}
            {!consolidatedLoading && consolidated && (
              consolidated.videos.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {consolidated.videos.map((v) => (
                    <VideoCard
                      key={v.id}
                      video={v}
                      volume={v.volume}
                      onPlay={() => handlePlay(v, consolidated.videos)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No videos found across your library folders.</p>
              )
            )}
          </>
        ) : currentPath === null ? (
          <>
            <ContinueWatching
              items={continueWatching}
              onPlay={(v, items) => handlePlay(v, items)}
            />
            <h2 className="text-lg font-semibold mb-2">Folders</h2>
            {roots.length === 0 ? (
              <div className="text-gray-500 dark:text-gray-400 text-sm">
                No library folders yet.{" "}
                <button className="text-primary-500 dark:text-primary-400 underline" onClick={() => setSettingsOpen(true)}>
                  Add one
                </button>
                .
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                {roots.map((r) => (
                  <FolderCard
                    key={r.path}
                    folder={{ name: r.display.split("/").pop() || r.display, path: r.path }}
                    onOpen={openFolder}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <Breadcrumbs crumbs={dir?.breadcrumbs} onNavigate={openFolder} />
            {error && <p className="text-red-600 dark:text-red-400 text-sm my-2">{error}</p>}
            {loading && <p className="text-gray-500 text-sm my-4">Loading…</p>}
            {!loading && dir && (
              <>
                {dir.folders.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 mb-6">
                    {dir.folders.map((f) => (
                      <FolderCard key={f.path} folder={f} onOpen={openFolder} />
                    ))}
                  </div>
                )}
                {dir.videos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {dir.videos.map((v) => (
                      <VideoCard key={v.id} video={v} onPlay={() => handlePlay(v, dir.videos)} />
                    ))}
                  </div>
                ) : (
                  dir.folders.length === 0 && (
                    <p className="text-gray-500 text-sm">No videos in this folder.</p>
                  )
                )}
              </>
            )}
          </>
        )}
      </main>

      {settingsOpen && (
        <SettingsModal
          roots={roots}
          onClose={() => setSettingsOpen(false)}
          onChange={loadRoots}
        />
      )}

      {duplicatesOpen && <DuplicatesModal onClose={() => setDuplicatesOpen(false)} />}

      {player && (
        <Player
          video={player.video}
          siblings={player.siblings}
          flipJob={activeFlips[player.video.id] || null}
          onClose={handleClosePlayer}
          onNavigate={(v) => setPlayer({ video: v, siblings: player.siblings })}
          onStartFlip={handleStartFlip}
          onKeepFlip={handleKeepFlip}
          onDiscardFlip={handleDiscardFlip}
        />
      )}

      <FlipStatusBar
        flips={activeFlips}
        onPreview={handlePreviewFlip}
        onKeep={handleKeepFlip}
        onDiscard={handleDiscardFlip}
        onDismiss={dismissFlip}
      />
    </div>
  );
}
