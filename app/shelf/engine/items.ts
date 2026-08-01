/**
 * Hand-drawn 10x10 goods, one per type.
 *
 * Pixel grids rather than generated art: at the size a shelf slot draws them, a
 * hand-placed silhouette reads far more clearly than a downscaled illustration
 * would. It also matches how the arcade's other hand-made sprites are authored.
 *
 * How many of these exist is what caps the difficulty curve — the level params
 * cannot ask for more kinds of goods than there are drawn.
 *
 * Legend is per item, so each keeps its own small palette. `.` is transparent.
 */
export interface ItemArt {
  /** Identifies the drawing. Not shown to the player. */
  name: string;
  palette: Record<string, string>;
  grid: readonly string[];
}

const OUTLINE = "#141018";

const ITEMS: readonly ItemArt[] = [
  {
    name: "apple",
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

export function itemAt(type: number): ItemArt {
  return ITEMS[type % ITEMS.length];
}
