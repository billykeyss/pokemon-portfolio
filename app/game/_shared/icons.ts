import type { PixelSprite } from "./pixelGrid";

/**
 * A 12x12 badge per cabinet, drawn rather than generated.
 *
 * Each one is a miniature of what its game actually looks like — the potion
 * bottle, a top-down car, goods on a shelf — so the dashboard previews the
 * games instead of labelling them with coloured squares. Pixel grids keep them
 * consistent with the arcade's other hand-made art and legible at badge size,
 * where a downscaled illustration would turn to mush.
 *
 * `.` is transparent; every other key indexes the icon's own palette.
 */
const OUTLINE = "#141018";

/** A bouncing critter mid-hop, with a motion arc behind it. */
const BOUNCEDEX: PixelSprite = {
  palette: { K: OUTLINE, B: "#F8D030", D: "#C9A414", W: "#FFFFFF", E: "#141018", A: "#6B5A2E" },
  grid: [
    "..........A.",
    ".........A..",
    "....KKKK.A..",
    "..KKBBBBKK..",
    ".KBBBBBBBBK.",
    "KBWEBBBBWEBK",
    "KBBBBBBBBBBK",
    "KBBBBBBBBBBK",
    ".KBDBBBBDBK.",
    "..KKDDDDKK..",
    "....KKKK....",
    "............",
  ],
};

/** A potion bottle, neck and all, half full. */
const POTION: PixelSprite = {
  palette: { K: OUTLINE, G: "#3A3350", L: "#8FA8F0", P: "#F08A8A", H: "#FFFFFF" },
  grid: [
    "....KKKK....",
    "....KGGK....",
    "....KGGK....",
    "...KKGGKK...",
    "..KHGGGGK...",
    "..KHGGGGGK..",
    "..KHLLLLLK..",
    "..KLLLLLLK..",
    "..KPPPPPPK..",
    "..KPPPPPPK..",
    "..KKPPPPKK..",
    "....KKKK....",
  ],
};

/** A car seen from above, the way the board draws them. */
const TRAFFIC: PixelSprite = {
  palette: { K: OUTLINE, R: "#E03A3A", D: "#9E1F1A", G: "#2B3A52", L: "#F6E8B0" },
  grid: [
    "...KKKKKK...",
    "..KLRRRRLK..",
    "..KRRRRRRK..",
    "..KGGGGGGK..",
    "..KRRRRRRK..",
    ".KKRRRRRRKK.",
    ".KKRRRRRRKK.",
    "..KRRRRRRK..",
    "..KGGGGGGK..",
    "..KRRRRRRK..",
    "..KLDDDDLK..",
    "...KKKKKK...",
  ],
};

/** Two stocked shelves, front-on. */
const SHELF: PixelSprite = {
  palette: { K: OUTLINE, W: "#6B4A2A", A: "#E0392F", B: "#F2C13D", C: "#3FBF6F", D: "#EDF2F7" },
  grid: [
    "............",
    ".KAAK..KBBK.",
    ".KAAK..KBBK.",
    "KWWWWWWWWWWK",
    "............",
    ".KCCK..KDDK.",
    ".KCCK..KDDK.",
    "KWWWWWWWWWWK",
    "............",
    "............",
    "............",
    "............",
  ],
};

/** Two chevrons crossing, one clear and one refused. */
const ARROWS: PixelSprite = {
  palette: { K: OUTLINE, A: "#8FA8F0", B: "#F0A96B", R: "#F26D6D" },
  grid: [
    "............",
    "...KK.......",
    "..KAAK......",
    ".KAAAAK.....",
    "KAAKKAAK....",
    "KKK....KKKK.",
    ".....KKKKKKK",
    "....KBBBBBBK",
    ".....KBBBBBK",
    "......KRRRK.",
    ".......KKK..",
    "............",
  ],
};

/** An hourglass over a timeline: events placed against running time. */
const CHRONICLE: PixelSprite = {
  palette: { K: OUTLINE, G: "#E8DCC0", S: "#C9A227", T: "#6B5A2E", M: "#F2E7D2" },
  grid: [
    "..KKKKKKKK..",
    "..KGGGGGGK..",
    "...KSSSSK...",
    "....KSSK....",
    ".....KK.....",
    "....KMMK....",
    "...KSSSSK...",
    "..KSSSSSSK..",
    "..KGGGGGGK..",
    "..KKKKKKKK..",
    "............",
    "KTKTKTKTKTKT",
  ],
};

/** Keyed by the registry slug, so a cabinet finds its own badge. */
export const GAME_ICONS: Record<string, PixelSprite> = {
  bouncedex: BOUNCEDEX,
  "potion-sort": POTION,
  traffic: TRAFFIC,
  shelf: SHELF,
  arrows: ARROWS,
  chronicle: CHRONICLE,
};
