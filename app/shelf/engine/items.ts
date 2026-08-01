/**
 * Hand-drawn 10x10 item sprites, one per goods type.
 *
 * Pixel grids rather than generated art: at tray size these draw about 40px
 * across, where a hand-placed silhouette reads far more clearly than a
 * downscaled illustration. It also matches how the arcade's other hand-made
 * sprites are authored.
 *
 * Legend is per item, so each keeps its own small palette. `.` is transparent.
 */
export interface ItemArt {
  name: string;
  /** Shown on the shelf label and used as the colourblind-safe cue. */
  glyph: string;
  /** Representative colour, for the tray slot glow and the shelf tag. */
  tint: string;
  palette: Record<string, string>;
  grid: readonly string[];
}

const OUTLINE = "#141018";

export const ITEMS: readonly ItemArt[] = [
  {
    name: "apple",
    glyph: "A",
    tint: "#E0392F",
    palette: { R: "#E0392F", D: "#9E1F1A", H: "#FF7A6B", S: "#7A4A22", L: "#57B84A", K: OUTLINE },
    grid: [
      "....SK....",
      "...SLLK...",
      ".KKRRRKK..",
      "KHRRRRRRK.",
      "KHRRRRRRK.",
      "KRRRRRRDK.",
      "KRRRRRRDK.",
      ".KRRRRDK..",
      "..KRRDK...",
      "...KKK....",
    ],
  },
  {
    name: "milk",
    glyph: "M",
    tint: "#EDF2F7",
    palette: { W: "#EDF2F7", D: "#B8C4D0", B: "#3B82F6", K: OUTLINE },
    grid: [
      "..KKKK....",
      ".KWWWDK...",
      "KWWWWWDK..",
      "KWWWWWDK..",
      "KWBBBWDK..",
      "KWBBBWDK..",
      "KWWWWWDK..",
      "KWWWWWDK..",
      "KWWWWWDK..",
      ".KKKKKK...",
    ],
  },
  {
    name: "bread",
    glyph: "B",
    tint: "#D9A441",
    palette: { B: "#D9A441", D: "#A87528", H: "#F2CE7E", K: OUTLINE },
    grid: [
      "..KKKKK...",
      ".KHHBBBK..",
      "KHBBBBBDK.",
      "KHBBBBBDK.",
      "KBBBBBBDK.",
      "KBBBBBBDK.",
      "KBBBBBBDK.",
      "KBBBBBBDK.",
      ".KDDDDDK..",
      "..KKKKK...",
    ],
  },
  {
    name: "soda",
    glyph: "S",
    tint: "#3FBF6F",
    palette: { G: "#3FBF6F", D: "#237A44", H: "#7FE8A6", S: "#C9D2DA", K: OUTLINE },
    grid: [
      "..KSSK....",
      "..KGGK....",
      ".KHGGGDK..",
      ".KHGGGDK..",
      ".KGGGGDK..",
      ".KGGGGDK..",
      ".KGGGGDK..",
      ".KGGGGDK..",
      ".KDDDDDK..",
      "..KKKKK...",
    ],
  },
  {
    name: "cheese",
    glyph: "C",
    tint: "#F2C13D",
    palette: { Y: "#F2C13D", D: "#C08F1C", H: "#FFE28A", K: OUTLINE },
    grid: [
      "..........",
      "....KKKK..",
      "..KKHYYYK.",
      ".KHYYYYYK.",
      "KYYDYYYYK.",
      "KYYYYYDYK.",
      "KYDYYYYYK.",
      "KYYYYYDYK.",
      ".KDDDDDDK.",
      "..KKKKKK..",
    ],
  },
  {
    name: "egg",
    glyph: "E",
    tint: "#F6EBD9",
    palette: { W: "#F6EBD9", D: "#CDBB9E", Y: "#F2B830", K: OUTLINE },
    grid: [
      "...KKK....",
      "..KWWWK...",
      ".KWWWWDK..",
      "KWWYYWWDK.",
      "KWWYYWWDK.",
      "KWWWWWWDK.",
      "KWWWWWWDK.",
      ".KWWWWDK..",
      "..KDDDK...",
      "...KKK....",
    ],
  },
  {
    name: "juice",
    glyph: "J",
    tint: "#F2751F",
    palette: { O: "#F2751F", D: "#B34D0C", H: "#FFA65C", S: "#57B84A", K: OUTLINE },
    grid: [
      "....KSK...",
      "...KOOK...",
      "..KHOOODK.",
      ".KHOOOODK.",
      ".KOOOOODK.",
      ".KOOOOODK.",
      ".KOOOOODK.",
      ".KOOOOODK.",
      ".KDDDDDDK.",
      "..KKKKKK..",
    ],
  },
  {
    name: "berry",
    glyph: "P",
    tint: "#A855F7",
    palette: { P: "#A855F7", D: "#6B21A8", H: "#D8B4FE", L: "#57B84A", K: OUTLINE },
    grid: [
      "....LK....",
      "...KLK....",
      "..KKPPKK..",
      ".KHPPPPDK.",
      "KHPPPPPPDK",
      "KPPPPPPPDK",
      "KPPPPPPPDK",
      ".KPPPPPDK.",
      "..KPPPDK..",
      "...KKKK...",
    ],
  },
];

export const MAX_TYPES = ITEMS.length;
export const SPRITE_SIZE = 10;

export function itemAt(type: number): ItemArt {
  return ITEMS[type % ITEMS.length];
}
