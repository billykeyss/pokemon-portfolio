"use client";

import { useEffect } from "react";

/**
 * Registers the offline cache, from wherever the player happens to land.
 *
 * This used to live only on the arcade index, which meant offline support was
 * reachable only by someone who visited the dashboard first — a bookmark or a
 * shared link straight to a game registered nothing and worked online only.
 * Rendering it from the root layout makes the entry point irrelevant.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline caching is a bonus; a failed registration must not break the
      // page it was registered from.
    });
  }, []);

  return null;
}
