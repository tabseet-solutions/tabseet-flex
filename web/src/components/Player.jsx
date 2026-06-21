import { useEffect, useRef, useState, useCallback } from "react";
import Plyr from "plyr";
import "plyr/dist/plyr.css";
import {
  XMarkIcon,
  BackwardIcon,
  ForwardIcon,
  InformationCircleIcon,
  TvIcon,
  ArrowsRightLeftIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/20/solid";
import { streamUrl, flipPreviewUrl, setProgress } from "../api.js";
import { formatDuration } from "../format.js";

const SPEED_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const SEEK_PER_WHEEL_UNIT = 0.1; // seconds of seek per pixel of horizontal trackpad scroll
const VOLUME_PER_WHEEL_UNIT = 0.0015; // volume (0-1) per pixel of vertical trackpad scroll
const WHEEL_DEADZONE = 2; // ignore tiny/imprecise gestures

// Each shortcut's keys are a list of alternative ways to trigger it (joined
// with "or"), and each alternative is itself a list of keys pressed together
// as a combo (joined with "+"). E.g. [["Shift", "←"]] is one combo; [["←"],
// ["J"]] is two single-key alternatives.
const SHORTCUT_GROUPS = [
  {
    title: "Playback",
    items: [
      [[["Space"], ["K"]], "Play / pause"],
      [[["←"], ["J"]], "Seek back 10s"],
      [[["→"], ["L"]], "Seek forward 10s"],
      [[["Shift", "←"]], "Seek back 1s"],
      [[["Shift", "→"]], "Seek forward 1s"],
      [[["0-9"]], "Jump to 10% steps"],
    ],
  },
  {
    title: "Volume",
    items: [
      [[["↑"]], "Volume up"],
      [[["↓"]], "Volume down"],
      [[["M"]], "Mute"],
    ],
  },
  {
    title: "View",
    items: [
      [[["F"]], "Fullscreen"],
      [[["T"]], "Theater mode"],
      [[["P"]], "Picture-in-picture"],
      [[["I"]], "File info"],
    ],
  },
  {
    title: "Other",
    items: [
      [[[","]], "Speed down"],
      [[["."]], "Speed up"],
      [[["["]], "Previous video"],
      [[["]"]], "Next video"],
      [[["H"]], "Flip horizontal"],
      [[["Esc"]], "Close player"],
      [[["?"]], "Toggle this panel"],
    ],
  },
];

export default function Player({ video, siblings, flipJob, onClose, onNavigate, onStartFlip, onKeepFlip, onDiscardFlip }) {
  const containerRef = useRef(null);
  const videoElRef = useRef(null);
  const playerRef = useRef(null);
  const saveTimerRef = useRef(null);
  const hintTimerRef = useRef(null);
  const resumeTimeRef = useRef(null);
  const [showInfo, setShowInfo] = useState(false);
  const [theater, setTheater] = useState(false);
  const [hint, setHint] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [confirmFlipOpen, setConfirmFlipOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Seeded from the flip job (not always false) so a video that already has
  // a "ready" job when the player first mounts (e.g. reopened after the job
  // finished while the player was closed) renders straight into the preview
  // - see the effect below for why starting false and flipping true a beat
  // later is unsafe.
  const [previewingFlip, setPreviewingFlip] = useState(() => flipJob?.status === "ready");
  const [errorDismissed, setErrorDismissed] = useState(false);

  const index = siblings ? siblings.findIndex((v) => v.id === video.id) : -1;
  const hasPrev = index > 0;
  const hasNext = index >= 0 && index < (siblings?.length || 0) - 1;

  // `progress` is an optional 0-1 fraction (volume level, or position within
  // the video's duration) rendered as a fill bar under the hint text.
  const showHint = useCallback((text, progress = null) => {
    setHint({ text, progress });
    clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setHint(null), 700);
  }, []);

  const goPrev = useCallback(() => {
    if (hasPrev) onNavigate(siblings[index - 1]);
  }, [hasPrev, siblings, index, onNavigate]);

  const goNext = useCallback(() => {
    if (hasNext) onNavigate(siblings[index + 1]);
  }, [hasNext, siblings, index, onNavigate]);

  const requestFlip = useCallback(() => {
    if (flipJob?.status === "running" || flipJob?.status === "ready") return;
    setConfirmFlipOpen(true);
  }, [flipJob]);

  const confirmFlip = useCallback(() => {
    setConfirmFlipOpen(false);
    playerRef.current?.pause();
    onStartFlip(video);
  }, [video, onStartFlip]);

  const handleKeep = useCallback(async () => {
    const player = playerRef.current;
    resumeTimeRef.current = { id: video.id, time: player?.currentTime || 0 };
    player?.pause();
    await onKeepFlip(video.id);
    // previewingFlip/reloadKey update reactively once the flipJob prop
    // reflects "done" - this also covers Keep being clicked from the
    // global status bar while this same video happens to be open here.
  }, [video.id, onKeepFlip]);

  const handleDiscard = useCallback(async () => {
    const player = playerRef.current;
    resumeTimeRef.current = { id: video.id, time: player?.currentTime || 0 };
    player?.pause();
    await onDiscardFlip(video.id);
  }, [video.id, onDiscardFlip]);

  const prevFlipStatusRef = useRef(flipJob?.status);

  // Reset per-video UI state when switching videos (this also runs on
  // mount, but the previewingFlip/prevFlipStatusRef initial values above
  // already cover that case - this covers navigating to a sibling video
  // via [ / ] without unmounting the player). Seeding both from the new
  // video's flip job, rather than unconditionally false/undefined, matters
  // for the same reason as above: if this effect left previewingFlip false
  // while the job is already "ready", the watcher effect below would flip
  // it true a beat later, remounting the Plyr-wrapped <video> twice in
  // quick succession - Plyr's destroy()/init() racing across those two
  // remounts crashes with a React "removeChild" DOM error.
  useEffect(() => {
    setConfirmFlipOpen(false);
    setErrorDismissed(false);
    setPreviewingFlip(flipJob?.status === "ready");
    prevFlipStatusRef.current = flipJob?.status;
  }, [video.id]);

  // Drives the preview source from the flip job's status, regardless of
  // whether keep/discard/start was triggered from this player or from the
  // global status bar while looking at a different video/folder.
  useEffect(() => {
    const status = flipJob?.status;
    const prevStatus = prevFlipStatusRef.current;
    prevFlipStatusRef.current = status;

    if (status === "ready" && !previewingFlip) {
      const player = playerRef.current;
      resumeTimeRef.current = { id: video.id, time: player?.currentTime || 0 };
      player?.pause();
      setPreviewingFlip(true);
    } else if (previewingFlip && prevStatus === "ready" && status !== "ready") {
      const player = playerRef.current;
      resumeTimeRef.current = { id: video.id, time: player?.currentTime || 0 };
      player?.pause();
      setPreviewingFlip(false);
      if (status === "done") setReloadKey((k) => k + 1);
    }
  }, [flipJob?.status, previewingFlip, video.id]);

  useEffect(() => {
    const player = new Plyr(videoElRef.current, {
      controls: [
        "play-large",
        "play",
        "progress",
        "current-time",
        "duration",
        "mute",
        "volume",
        "settings",
        "pip",
        "fullscreen",
      ],
      settings: ["speed"],
      speed: { selected: 1, options: SPEED_STEPS },
      keyboard: { focused: false, global: false },
      tooltips: { controls: false, seek: true },
      // Fullscreen the whole player shell (header bar, hints, info/shortcuts
      // panels), not just Plyr's own video wrapper, so our custom overlays
      // stay visible while in fullscreen.
      fullscreen: { container: ".player-shell" },
    });
    playerRef.current = player;

    // Plyr's own fullscreen CSS only targets its own (innermost) wrapper, which
    // no longer matches the element that actually goes fullscreen now that
    // fullscreen.container points at .player-shell - so we replicate the "fill
    // the screen, hide the custom toolbar" behavior ourselves via this state.
    player.on("enterfullscreen", () => setIsFullscreen(true));
    player.on("exitfullscreen", () => setIsFullscreen(false));

    const onLoadedMeta = () => {
      const resume = resumeTimeRef.current;
      if (resume && resume.id === video.id) {
        resumeTimeRef.current = null;
        player.currentTime = resume.time;
        player.play();
        return;
      }
      const p = video.progress;
      if (p && p.duration > 0 && p.position > 5 && p.position < p.duration * 0.95) {
        player.currentTime = p.position;
      }
    };
    player.on("loadedmetadata", onLoadedMeta);

    const persist = () => {
      if (player.duration > 0 && !previewingFlip) {
        setProgress(video.id, player.currentTime, player.duration).catch(() => {});
      }
    };
    saveTimerRef.current = setInterval(persist, 5000);
    player.on("pause", persist);

    return () => {
      clearInterval(saveTimerRef.current);
      persist();
      player.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.id, reloadKey, previewingFlip]);

  useEffect(() => {
    function onKeyDown(e) {
      if (showShortcuts) {
        if (e.key === "Escape" || e.key === "?") {
          e.preventDefault();
          setShowShortcuts(false);
        }
        return;
      }
      const active = document.activeElement;
      const tag = active?.tagName;
      const isFormField = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      // Only ignore form fields outside the player (e.g. the library
      // search box). Plyr's own controls (volume/seek bar) are <input>
      // elements too - clicking them shouldn't kill every shortcut until
      // focus happens to move elsewhere.
      if (isFormField && !containerRef.current?.contains(active)) return;
      const player = playerRef.current;
      if (!player) return;

      switch (e.key) {
        case "?":
          e.preventDefault();
          setShowShortcuts(true);
          break;
        case " ":
        case "k":
          e.preventDefault();
          player.togglePlay();
          showHint(player.paused ? "Paused" : "Playing");
          break;
        case "ArrowLeft":
        case "j":
          e.preventDefault();
          player.rewind(e.shiftKey ? 1 : 10);
          showHint(e.shiftKey ? "-1s" : "-10s", player.duration ? player.currentTime / player.duration : null);
          break;
        case "ArrowRight":
        case "l":
          e.preventDefault();
          player.forward(e.shiftKey ? 1 : 10);
          showHint(e.shiftKey ? "+1s" : "+10s", player.duration ? player.currentTime / player.duration : null);
          break;
        case "ArrowUp":
          e.preventDefault();
          player.increaseVolume(0.05);
          showHint(`Volume ${Math.round(player.volume * 100)}%`, player.volume);
          break;
        case "ArrowDown":
          e.preventDefault();
          player.decreaseVolume(0.05);
          showHint(`Volume ${Math.round(player.volume * 100)}%`, player.volume);
          break;
        case "m":
          player.muted = !player.muted;
          showHint(player.muted ? "Muted" : "Unmuted");
          break;
        case "f":
          player.fullscreen.toggle();
          break;
        case "t":
          setTheater((v) => !v);
          break;
        case "p":
          if (player.pip !== undefined) {
            try {
              player.pip = !player.pip;
            } catch {
              /* PiP unsupported */
            }
          }
          break;
        case "i":
          setShowInfo((v) => !v);
          break;
        case "h":
          requestFlip();
          break;
        case ",": {
          const idx = SPEED_STEPS.indexOf(player.speed);
          const next = SPEED_STEPS[Math.max(0, idx - 1)];
          player.speed = next;
          showHint(`${next}x`);
          break;
        }
        case ".": {
          const idx = SPEED_STEPS.indexOf(player.speed);
          const next = SPEED_STEPS[Math.min(SPEED_STEPS.length - 1, idx + 1)];
          player.speed = next;
          showHint(`${next}x`);
          break;
        }
        case "[":
          goPrev();
          break;
        case "]":
          goNext();
          break;
        case "Escape":
          if (player.fullscreen.active) player.fullscreen.exit();
          else onClose();
          break;
        default: {
          if (/^[0-9]$/.test(e.key) && player.duration) {
            const pct = parseInt(e.key, 10) / 10;
            player.currentTime = player.duration * pct;
            showHint(`${pct * 100}%`, pct);
          }
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goPrev, goNext, onClose, showHint, requestFlip, showShortcuts]);

  // macOS trackpad gestures: two-finger horizontal swipe seeks, vertical
  // swipe adjusts volume. The player container has nothing to natively
  // scroll, so capturing wheel events here doesn't fight page scrolling.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onWheel(e) {
      const player = playerRef.current;
      if (!player) return;
      const absX = Math.abs(e.deltaX);
      const absY = Math.abs(e.deltaY);
      if (absX === 0 && absY === 0) return;

      // macOS's default "natural scrolling" flips the sign of wheel deltas
      // relative to finger direction, so these are negated to match: swipe
      // right -> seek forward, swipe up -> volume up.
      if (absX > absY) {
        // Always preventDefault on horizontal deltas, even tiny ones below
        // the deadzone: outside fullscreen, the browser's swipe-back/forward
        // gesture locks in its decision from the gesture's earliest (small)
        // deltas, so deferring preventDefault until the deadzone is cleared
        // is too late to stop it from hijacking the swipe.
        e.preventDefault();
        if (absX < WHEEL_DEADZONE) return;
        const seekDelta = -e.deltaX * SEEK_PER_WHEEL_UNIT;
        const next = Math.min(Math.max(player.currentTime + seekDelta, 0), player.duration || 0);
        player.currentTime = next;
        showHint(seekDelta > 0 ? "»" : "«", player.duration ? next / player.duration : null);
      } else {
        if (absY < WHEEL_DEADZONE) return;
        e.preventDefault();
        const next = Math.min(Math.max(player.volume + e.deltaY * VOLUME_PER_WHEEL_UNIT, 0), 1);
        player.volume = next;
        player.muted = false;
        showHint(`Volume ${Math.round(next * 100)}%`, next);
      }
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [showHint]);

  const videoSrc = previewingFlip
    ? flipPreviewUrl(video.id)
    : `${streamUrl(video.id)}${reloadKey ? `?v=${reloadKey}` : ""}`;

  return (
    <div ref={containerRef} className="player-shell fixed inset-0 bg-black z-50 flex flex-col text-gray-100">
      {!isFullscreen && (
        <div className="flex items-center justify-between px-4 py-2 bg-base-900/90 text-sm">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onClose}
              className="text-gray-300 hover:text-white p-1.5 rounded hover:bg-base-700"
              title="Close (Esc)"
              aria-label="Close player"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
            <span className="truncate font-medium" title={video.name}>
              {video.name.replace(/\.[^.]+$/, "")}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={goPrev}
              disabled={!hasPrev}
              className="p-1.5 rounded hover:bg-base-700 disabled:opacity-30"
              title="Previous ([)"
              aria-label="Previous video"
            >
              <BackwardIcon className="w-5 h-5" />
            </button>
            <button
              onClick={goNext}
              disabled={!hasNext}
              className="p-1.5 rounded hover:bg-base-700 disabled:opacity-30"
              title="Next (])"
              aria-label="Next video"
            >
              <ForwardIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowInfo((v) => !v)}
              className="p-1.5 rounded hover:bg-base-700"
              title="Info (i)"
              aria-label="File info"
            >
              <InformationCircleIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setTheater((v) => !v)}
              className="p-1.5 rounded hover:bg-base-700"
              title="Theater (t)"
              aria-label="Theater mode"
            >
              <TvIcon className="w-5 h-5" />
            </button>
            <button
              onClick={requestFlip}
              disabled={flipJob?.status === "running" || flipJob?.status === "ready"}
              className="p-1.5 rounded hover:bg-base-700 disabled:opacity-30"
              title="Flip horizontal - preview before it replaces the file (h)"
              aria-label="Flip horizontal"
            >
              <ArrowsRightLeftIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowShortcuts(true)}
              className="p-1.5 rounded hover:bg-base-700"
              title="Keyboard shortcuts (?)"
              aria-label="Keyboard shortcuts"
            >
              <QuestionMarkCircleIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        <div className={theater || isFullscreen ? "w-full h-full" : "w-full max-w-6xl mx-auto"}>
          <video key={`${video.id}-${reloadKey}-${previewingFlip ? "preview" : "orig"}`} ref={videoElRef} playsInline>
            <source src={videoSrc} />
          </video>
        </div>
        {hint && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/80 text-white px-3 py-1.5 rounded-md text-sm pointer-events-none flex flex-col items-center gap-1.5 min-w-[88px]">
            <span>{hint.text}</span>
            {hint.progress != null && (
              <div className="w-full h-1 bg-white/25 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full"
                  style={{ width: `${Math.round(Math.min(Math.max(hint.progress, 0), 1) * 100)}%` }}
                />
              </div>
            )}
          </div>
        )}
        {showInfo && (
          <div className="absolute top-4 right-4 bg-base-900/95 rounded-lg p-4 text-sm space-y-1 max-w-xs">
            <p className="font-semibold mb-2">File info</p>
            <p className="text-gray-400">Name</p>
            <p className="truncate mb-2">{video.name}</p>
            <p className="text-gray-400">Duration</p>
            <p className="mb-2">{formatDuration(video.duration)}</p>
            {video.width > 0 && (
              <>
                <p className="text-gray-400">Resolution</p>
                <p>
                  {video.width}×{video.height}
                </p>
              </>
            )}
          </div>
        )}

        {flipJob?.status === "running" && (
          <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-3 text-sm px-6">
            <div className="w-8 h-8 border-2 border-secondary-400 border-t-transparent rounded-full animate-spin" />
            <p>Flipping video{flipJob.progress != null ? ` - ${flipJob.progress}%` : "…"}</p>
            <div className="w-64 h-1.5 bg-base-700 rounded overflow-hidden">
              <div className="h-full bg-primary-500 transition-all" style={{ width: `${flipJob.progress ?? 0}%` }} />
            </div>
            <p className="text-gray-400 text-center">
              Building a flipped copy to preview - the original is untouched. You can close this
              player and watch other videos; it'll keep running in the background.
            </p>
          </div>
        )}

        {flipJob?.status === "error" && !errorDismissed && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-900/90 text-red-100 px-4 py-2 rounded-md text-sm max-w-md text-center">
            Flip failed: {flipJob.error}
            <button onClick={() => setErrorDismissed(true)} className="ml-3 underline">
              Dismiss
            </button>
          </div>
        )}

        {previewingFlip && (
          <div className="absolute bottom-0 left-0 right-0 bg-base-900/95 border-t border-base-700 px-4 py-3 flex items-center justify-between gap-3 text-sm">
            <span>
              Previewing flipped version - the original file hasn't changed yet.
            </span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={handleDiscard} className="px-3 py-1.5 rounded hover:bg-base-700">
                Discard
              </button>
              <button
                onClick={handleKeep}
                className="px-3 py-1.5 rounded bg-primary-500 hover:bg-primary-400 text-white"
              >
                Keep this version
              </button>
            </div>
          </div>
        )}
      </div>

      {showShortcuts && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            className="bg-base-900 rounded-lg w-full max-w-lg p-5 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">Keyboard shortcuts</h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-gray-400 hover:text-white p-1.5 rounded hover:bg-base-800"
                aria-label="Close"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
              {SHORTCUT_GROUPS.map((group) => (
                <div key={group.title}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                    {group.title}
                  </p>
                  <div className="space-y-1.5">
                    {group.items.map(([alternatives, label]) => (
                      <div key={label} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-gray-300">{label}</span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {alternatives.map((combo, i) => (
                            <span key={i} className="flex items-center gap-1">
                              {i > 0 && <span className="text-gray-500 text-xs">or</span>}
                              {combo.map((k, j) => (
                                <span key={j} className="flex items-center gap-0.5">
                                  {j > 0 && <span className="text-gray-500 text-xs">+</span>}
                                  <kbd className="inline-flex items-center justify-center min-w-[1.65rem] h-6 px-1.5 rounded-md border border-base-600 bg-base-800 text-xs font-mono text-gray-200">
                                    {k}
                                  </kbd>
                                </span>
                              ))}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {confirmFlipOpen && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]"
          onClick={() => setConfirmFlipOpen(false)}
        >
          <div className="bg-base-900 rounded-lg w-full max-w-sm p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold mb-2">Flip horizontal?</h3>
            <p className="text-sm text-gray-400 mb-4">
              This builds a mirrored copy you can preview first - the original file isn't touched
              until you choose to keep it. Re-encoding can take a while for large files, and you can
              keep watching other videos while it runs in the background.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmFlipOpen(false)}
                className="px-3 py-1.5 rounded text-sm hover:bg-base-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmFlip}
                className="px-3 py-1.5 rounded text-sm bg-primary-500 hover:bg-primary-400 text-white"
              >
                Build flipped preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
