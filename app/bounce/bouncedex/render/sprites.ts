import type { BehaviorTag } from "../data/critters";

/**
 * Chunky 8x8 pixel sprites, one silhouette per behavior, so a critter reads as
 * what it *does* at a glance: heavy is a squat rock, ghost has a ragged hem,
 * magnet is a horseshoe, bomb has a fuse.
 *
 * Legend:
 *   `.` transparent   `B` body (the critter's colour)
 *   `D` shade (darker)  `L` highlight (lighter)
 *   `E` eye (near-black)  `W` eye white
 */
export type SpriteGrid = readonly string[];

export const SPRITE_SIZE = 8;

const STANDARD: SpriteGrid = [
  "..LLBB..",
  ".LBBBBB.",
  "BBBBBBBB",
  "BEBBBBEB",
  "BBBBBBBB",
  "BBBBBBBB",
  ".DBBBBD.",
  "..DDDD..",
];

const HEAVY: SpriteGrid = [
  "........",
  "..LLDD..",
  ".LBBBBD.",
  "DBBBBBBD",
  "BEBBBBEB",
  "BBBBBBBB",
  "DBBBBBBD",
  ".DDDDDD.",
];

const LIGHT: SpriteGrid = [
  "...LL...",
  "..LBBL..",
  ".LBBBBL.",
  "LBEBBEBL",
  ".BBBBBB.",
  "..BBBB..",
  "...DD...",
  "........",
];

const STICKY: SpriteGrid = [
  "..LLBB..",
  ".LBBBBB.",
  "BBBBBBBB",
  "BEBBBBEB",
  "BBBBBBBB",
  "DBBBBBBD",
  ".D.DD.D.",
  "..D..D..",
];

const SPLITTER: SpriteGrid = [
  "..LLBB..",
  ".LBDBBB.",
  "BBBDBBBB",
  "BEBDBBEB",
  "BBBDBBBB",
  "BBBDBBBB",
  ".DBDBBD.",
  "..DDDD..",
];

const GHOST: SpriteGrid = [
  "..LLBB..",
  ".LBBBBB.",
  "BBBBBBBB",
  "BWEBBWEB",
  "BBBBBBBB",
  "BBBBBBBB",
  "BBBBBBBB",
  "B.BB.BB.",
];

const MAGNET: SpriteGrid = [
  ".LL..BB.",
  "LBB..BBD",
  "BBB..BBD",
  "BBB..BBD",
  "BBBBBBBB",
  "BEBBBBEB",
  ".BBBBBB.",
  "..DDDD..",
];

const BOMB: SpriteGrid = [
  ".....LL.",
  "....L...",
  "..LLBB..",
  ".LBBBBB.",
  "BEBBBBEB",
  "BBBBBBBB",
  ".DBBBBD.",
  "..DDDD..",
];

export const SPRITES: Record<BehaviorTag, SpriteGrid> = {
  standard: STANDARD,
  heavy: HEAVY,
  light: LIGHT,
  sticky: STICKY,
  splitter: SPLITTER,
  ghost: GHOST,
  magnet: MAGNET,
  bomb: BOMB,
};

/** Descending horde: a squat blob with a scowl. */
export const ENEMY_SPRITE: SpriteGrid = [
  "..DDDD..",
  ".DBBBBD.",
  "DBBBBBBD",
  "BEBBBBEB",
  "BBBBBBBB",
  "BDBBBBDB",
  ".DBBBBD.",
  "..D..D..",
];

/** Boss: bigger, hornier, meaner. */
export const BOSS_SPRITE: SpriteGrid = [
  "D......D",
  "DD.DD.DD",
  "DBBBBBBD",
  "BEBBBBEB",
  "BBBBBBBB",
  "BDDBBDDB",
  "DBBBBBBD",
  ".D.DD.D.",
];

const clamp255 = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

/** Parse `#rrggbb` into a tuple. Falls back to white on anything unexpected. */
export function parseHex(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [255, 255, 255];
  const v = parseInt(m[1], 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

export function toRgb([r, g, b]: [number, number, number]): string {
  return `rgb(${r},${g},${b})`;
}

/** Scale a colour's channels; <1 shades, >1 tints. */
export function scaleColor(hex: string, factor: number): string {
  const [r, g, b] = parseHex(hex);
  return toRgb([clamp255(r * factor), clamp255(g * factor), clamp255(b * factor)]);
}

export const EYE_COLOR = "#17111f";
export const EYE_WHITE = "#f8f0e0";

/** Resolve a sprite legend character to a paint colour, or null for transparent. */
export function colorFor(cell: string, base: string): string | null {
  switch (cell) {
    case "B":
      return base;
    case "D":
      return scaleColor(base, 0.62);
    case "L":
      return scaleColor(base, 1.4);
    case "E":
      return EYE_COLOR;
    case "W":
      return EYE_WHITE;
    default:
      return null;
  }
}
