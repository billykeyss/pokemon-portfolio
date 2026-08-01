import type { BehaviorTag } from "../data/critters";

/**
 * AI-generated pixel sprites, sliced and background-keyed by
 * `tools/build-sprites.py`. One artwork per behavior; per-critter colour comes
 * from a luminance tint at bake time, so 42 critters share 8 drawings without
 * looking identical.
 *
 * Loading is best-effort: until (or unless) a PNG arrives, the renderer falls
 * back to the hand-authored grids in `sprites.ts`, so the game always draws.
 */
export const SPRITE_FILES: Record<BehaviorTag | "enemy", string> = {
  standard: "standard",
  heavy: "heavy",
  light: "light",
  sticky: "sticky",
  splitter: "splitter",
  ghost: "ghost",
  magnet: "magnet",
  bomb: "bomb",
  enemy: "enemy",
};

export interface LoadedSprite {
  image: HTMLImageElement;
  /**
   * True when white is the creature's body (the ghost, the light orb) rather
   * than its eyes. Tinting must recolour body-white but preserve eye-white.
   */
  whiteIsBody: boolean;
}

const loaded = new Map<string, LoadedSprite>();
let onReady: (() => void) | null = null;

/** Called after each sprite arrives so the renderer can drop stale bakes. */
export function setSpriteReadyCallback(fn: () => void): void {
  onReady = fn;
}

export function getSprite(name: string): LoadedSprite | null {
  return loaded.get(name) ?? null;
}

function measureWhite(img: HTMLImageElement): boolean {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d");
  if (!ctx) return false;

  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, c.width, c.height);

  let opaque = 0;
  let white = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    opaque += 1;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    const mx = Math.max(r, g, b);
    const sat = mx === 0 ? 0 : (mx - Math.min(r, g, b)) / mx;
    if (lum > 0.85 && sat < 0.25) white += 1;
  }
  return opaque > 0 && white / opaque > 0.25;
}

let started = false;

/** Kick off sprite loading. Safe to call repeatedly; only the first runs. */
export function loadSprites(): void {
  if (started || typeof document === "undefined") return;
  started = true;

  for (const file of new Set(Object.values(SPRITE_FILES))) {
    const img = new Image();
    img.onload = () => {
      loaded.set(file, { image: img, whiteIsBody: measureWhite(img) });
      onReady?.();
    };
    // A missing sprite is not fatal — the procedural grid covers it.
    img.onerror = () => {};
    img.src = `/bounce/sprites/${file}.png`;
  }
}
