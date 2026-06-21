import { useEffect, useRef, useState } from "react";
import { requestThumbnail } from "../lib/thumbnailLoader.js";

// Reproduces what `loading="lazy"` would normally give a plain <img> -
// don't fetch until the card is near the viewport - but routes the actual
// fetch through lib/thumbnailLoader.js's queue instead of handing the
// browser a bare <img src>. A native lazy <img> request is invisible to
// that queue and would go on competing with video playback for a
// connection until it finishes on its own; this way it can be paused and
// aborted the instant playback is requested.
const OBSERVER_OPTIONS = { rootMargin: "200px" };

export function useThumbnail(url) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const [src, setSrc] = useState(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, OBSERVER_OPTIONS);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    setSrc(null);
    const { promise, cancel } = requestThumbnail(url);
    let objectUrl = null;
    promise
      .then((blobUrl) => {
        objectUrl = blobUrl;
        setSrc(blobUrl);
      })
      .catch(() => {});
    return () => {
      cancel();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [visible, url]);

  return [ref, src];
}
