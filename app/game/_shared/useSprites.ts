"use client";

import { useEffect, useRef, useState } from "react";

export type SpriteMap = Record<string, HTMLImageElement | undefined>;

/**
 * Load a set of images once and hand them to a canvas renderer.
 *
 * The map lives in a ref because the render loop reads it every frame and must
 * not re-subscribe when a sprite arrives; the counter exists only so React
 * re-renders once loading finishes. A sprite that fails to load simply stays
 * absent, and the renderer falls back to drawing the shape itself — missing art
 * should never mean a missing game.
 */
export function useSprites(sources: Record<string, string>): {
  sprites: React.MutableRefObject<SpriteMap>;
  loaded: number;
} {
  const sprites = useRef<SpriteMap>({});
  const [loaded, setLoaded] = useState(0);

  // Serialised so a caller can pass an object literal without re-triggering.
  const key = JSON.stringify(sources);

  useEffect(() => {
    const entries = Object.entries(JSON.parse(key) as Record<string, string>);
    let cancelled = false;

    for (const [name, src] of entries) {
      const image = new Image();
      image.onload = () => {
        if (cancelled) return;
        sprites.current[name] = image;
        setLoaded((n) => n + 1);
      };
      image.onerror = () => {
        // Leave it absent; the renderer draws its own fallback.
      };
      image.src = src;
    }

    return () => {
      cancelled = true;
    };
  }, [key]);

  return { sprites, loaded };
}
