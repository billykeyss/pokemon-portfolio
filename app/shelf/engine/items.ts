/**
 * Fallback art: hand-drawn 10x10 goods.
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
  {
    name: "carrot",
    palette: { O: "#F2802B", D: "#B8551A", L: "#4FA83C", K: OUTLINE },
    grid: [
      "...KLK....",
      "..KLLLK...",
      "..KOOOK...",
      "..KOOODK..",
      "..KOOODK..",
      "...KOODK..",
      "...KOODK..",
      "....KODK..",
      "....KDK...",
      ".....K....",
    ],
  },
  {
    name: "fish",
    palette: { B: "#6FA3C4", D: "#3F6E8C", H: "#A8CFE3", E: "#161A1F", K: OUTLINE },
    grid: [
      "..........",
      "K...KKKK..",
      "KK.KHHHBK.",
      "KBKHBBBBBK",
      "KBBBBEBBBK",
      "KBBDBBBBBK",
      "KBKDDDDDBK",
      "KK.KDDDDK.",
      "K...KKKK..",
      "..........",
    ],
  },
  {
    name: "cookie",
    palette: { C: "#A9713F", D: "#4A2D18", K: OUTLINE },
    grid: [
      "...KKKK...",
      ".KKCCCCKK.",
      ".KCCDCCCK.",
      "KCDCCCCCCK",
      "KCCCCCDCCK",
      "KCDCCCCCCK",
      "KCCCCDCCCK",
      ".KCCCCCCK.",
      ".KKCCCCKK.",
      "...KKKK...",
    ],
  },
  {
    name: "corn",
    palette: { Y: "#F5C842", D: "#C99A1E", L: "#5A9E3A", K: OUTLINE },
    grid: [
      "....KK....",
      "...KYYK...",
      "..LKYYKL..",
      ".LLKYYYKL.",
      ".LKYYYYYKL",
      ".LKYYDYYKL",
      ".LKYYYYYKL",
      "..KYYYYYK.",
      "..KDYYYDK.",
      "...KKKK...",
    ],
  },
  {
    name: "ham",
    palette: { P: "#E88FA0", D: "#B85F72", H: "#FFB8C4", W: "#F6E9E4", K: OUTLINE },
    grid: [
      "..KKKKKK..",
      ".KPPPPPPK.",
      "KPPPPPPPPK",
      "KPHPPPPPPK",
      "KPPPPPPPDK",
      "KPPWWPPPDK",
      "KPPWWPPPDK",
      "KPPPPPPPDK",
      ".KDDDDDDK.",
      "..KKKKKK..",
    ],
  },
  {
    name: "coffee",
    palette: { B: "#4A3428", L: "#E8D9C0", D: "#6B4A33", K: OUTLINE },
    grid: [
      "..KKKKKK..",
      ".KBBBBBBK.",
      ".KBBBBBBK.",
      "KBBBBBBBBK",
      "KBLLLLLLBK",
      "KBLDDDDLBK",
      "KBLLLLLLBK",
      "KBBBBBBBBK",
      ".KBBBBBBK.",
      "..KKKKKK..",
    ],
  },
];

/**
 * The goods a level can draw from.
 *
 * A curated subset of a 64-sprite CC0 pack rather than the whole thing, and the
 * curation is doing real work. The pack leans warm — apple, tomato, strawberry
 * and cherry are all small, round and red — and this game asks one question
 * over and over: are these three the same? Two goods a player has to squint to
 * tell apart turn a puzzle into a guess.
 *
 * So the pool is chosen for separation on *both* axes. Where several share a
 * colour, their silhouettes do not: the browns are a disc, a knot, a wedge, a
 * drumstick and a roast, which read apart instantly even at slot size.
 */
export interface Good {
  name: string;
  /** Basename of the PNG in public/game/shelf/. */
  sprite: string;
}

export const GOODS: readonly Good[] = [
  { name: "cookie", sprite: "food-00" },
  { name: "tankard", sprite: "food-02" },
  { name: "honey pot", sprite: "food-05" },
  { name: "bento", sprite: "food-06" },
  { name: "apple", sprite: "food-12" },
  { name: "grapes", sprite: "food-14" },
  { name: "fried eggs", sprite: "food-16" },
  { name: "pineapple", sprite: "food-18" },
  { name: "beer", sprite: "food-20" },
  { name: "cheese", sprite: "food-24" },
  { name: "roast", sprite: "food-25" },
  { name: "aubergine", sprite: "food-27" },
  { name: "pepper", sprite: "food-29" },
  { name: "pie", sprite: "food-36" },
  { name: "pickle", sprite: "food-39" },
  { name: "pretzel", sprite: "food-40" },
  { name: "banana", sprite: "food-47" },
  { name: "watermelon", sprite: "food-48" },
  { name: "drumstick", sprite: "food-50" },
  { name: "avocado", sprite: "food-56" },
  { name: "shrimp", sprite: "food-63" },
];

/** How many goods exist. Not how many appear in one level. */
export const MAX_TYPES = GOODS.length;

export function goodAt(type: number): Good {
  return GOODS[type % GOODS.length];
}

/**
 * Drawn stand-in for a good whose sprite has not loaded.
 *
 * There are fewer grids than goods, so this wraps — it exists so a failed image
 * request degrades to a playable board rather than an empty shelf, not to be a
 * faithful likeness.
 */
export function fallbackArt(type: number): ItemArt {
  return ITEMS[type % ITEMS.length];
}

/** Sources for useSprites: every good's PNG, keyed by its sprite name. */
export function spriteSources(): Record<string, string> {
  return Object.fromEntries(
    GOODS.map((g) => [g.sprite, `/game/shelf/${g.sprite}.png`]),
  );
}
