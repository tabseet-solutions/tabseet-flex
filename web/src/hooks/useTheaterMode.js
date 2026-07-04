import { useEffect, useState } from "react";

const STORAGE_KEY = "theaterMode";

function getInitialTheaterMode() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "true" || stored === "false") return stored === "true";
  return true;
}

export function useTheaterMode() {
  const [theater, setTheater] = useState(getInitialTheaterMode);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(theater));
  }, [theater]);

  return [theater, setTheater];
}
