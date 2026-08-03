import type { Picture } from "./types";

/**
 * Puzzle artwork, ordered small to large.
 *
 * Hand-drawn in the same spirit as `_shared/icons.ts`: the arcade's own
 * critters and objects, not anyone else's. Every one of these has to survive
 * `isLineSolvable`, so a picture is a design constraint as much as a drawing —
 * large open fields deduce easily, scattered single pixels usually do not.
 * Every row and column also has to hold at least one filled cell: a blank line
 * renders as a "0" clue and hands the player a strip of board that is never
 * in play, wasting the grid even on a puzzle that otherwise passes cleanly.
 */
export const PICTURES: readonly Picture[] = [
  {
    id: "heart",
    name: "Heart",
    colour: "#C9457A",
    grid: [".#.#.", "#####", "#####", ".###.", "..#.."],
  },
  {
    id: "cup",
    name: "Cup",
    colour: "#3B7DD8",
    grid: ["#####", "#####", ".###.", "..#..", ".###."],
  },
  {
    id: "spark",
    name: "Spark",
    colour: "#D8A11E",
    grid: ["..#..", ".###.", "#####", ".###.", "..#.."],
  },
  {
    id: "key",
    name: "Key",
    colour: "#7B4FC4",
    // The ring sits top-left with its hole punched out, a shaft runs down the
    // middle, and teeth bite in at bottom-right. The original grid left the
    // two rightmost columns entirely blank — dead board and two "0" clues — so
    // this one is drawn to use every row and column instead.
    grid: ["###..", "#.#..", "###..", "..#..", "..###"],
  },
  {
    id: "leaf",
    name: "Leaf",
    colour: "#3BA85B",
    // Widened row 3 to the full 8 columns (was 7): the original never reached
    // the rightmost column, leaving it permanently blank.
    grid: [
      "...###..",
      "..#####.",
      ".######.",
      "########",
      ".######.",
      "..####..",
      "...##...",
      "...#....",
    ],
  },
  {
    id: "flask",
    name: "Flask",
    colour: "#1F9E86",
    grid: [
      "..####..",
      "...##...",
      "...##...",
      "..####..",
      ".######.",
      "########",
      "########",
      ".######.",
    ],
  },
  {
    id: "boulder",
    name: "Boulder",
    colour: "#8A7A66",
    grid: [
      "..####..",
      ".######.",
      "########",
      "########",
      "########",
      "########",
      ".######.",
      "..####..",
    ],
  },
  {
    id: "ember",
    name: "Ember",
    colour: "#E0703A",
    grid: [
      "...##...",
      "..####..",
      "..####..",
      ".######.",
      "########",
      "########",
      ".######.",
      "..####..",
    ],
  },
  {
    id: "droplet",
    name: "Droplet",
    colour: "#6890F0",
    // A narrow point widening to a full-width equator, unlike ember and
    // boulder's symmetric diamonds — the taper only goes one way. The notch
    // in rows 2-3 is the glass highlight every raindrop icon carries; it also
    // breaks the silhouette out of pure convexity so there is something to
    // deduce, not just a run length to read off.
    grid: [
      "....##....",
      "...####...",
      "..#.####..",
      ".##.#####.",
      "##########",
      "##########",
      "##########",
      ".########.",
      ".########.",
      "..######..",
    ],
  },
  {
    id: "shell",
    name: "Shell",
    colour: "#E8C9A0",
    // A scallop: a domed hinge fanning down to three ribbed lobes, cut by two
    // notches that deepen row by row — the classic fan-shell read, and the
    // notches (uneven on purpose) keep the placement unambiguous.
    grid: [
      "...####...",
      "..######..",
      ".########.",
      "##########",
      "##########",
      "##########",
      "##########",
      "###.##.###",
      "##..##..##",
      "#...#...#.",
    ],
  },
  {
    id: "arrow",
    name: "Arrow",
    colour: "#8FA8F0",
    // The chevron the Arrow Escape cabinet clears, on a shaft with a single
    // fletching notch at the nock end. The notch is off-centre by one cell —
    // a symmetric pair of notches here left two equally valid readings and
    // failed the solver; this one has just enough asymmetry to pin down.
    grid: [
      "....##....",
      "...####...",
      "..######..",
      ".########.",
      "##########",
      "...####...",
      "...####...",
      "...####...",
      "...####...",
      "...#.##...",
    ],
  },
  {
    id: "crate",
    name: "Crate",
    colour: "#6B4A2A",
    // The stocked crate Shelf Sort works with: bevelled lid, and a cut
    // hand-hold under the rim like a real packing crate.
    grid: [
      ".########.",
      "####..####",
      "####..####",
      "##########",
      "##########",
      "##########",
      "##########",
      "##########",
      "##########",
      ".########.",
    ],
  },
  {
    id: "car",
    name: "Car",
    colour: "#E03A3A",
    // Traffic Jam's car from above: fenders wide, cabin pinched narrow between.
    grid: [
      "..######..",
      "##########",
      "##########",
      "...####...",
      "...####...",
      "...####...",
      "##########",
      "##########",
      "..######..",
      "..######..",
    ],
  },
  {
    id: "monolith",
    name: "Monolith",
    colour: "#6B5D4C",
    // A standing stone: a straight column flaring into a wide foundation,
    // read next to boulder's round diamond as a different kind of rock.
    grid: [
      "...######...",
      "...######...",
      "..########..",
      "...######...",
      "...######...",
      "...######...",
      "...######...",
      "...######...",
      "...######...",
      "...######...",
      ".##########.",
      "############",
    ],
  },
  {
    id: "wisp",
    name: "Wisp",
    colour: "#B39CD9",
    // Round head with two eye-holes at row 5, a straight robe, and a
    // scalloped hem in three thick teeth rather than single pixels, which the
    // solver reads as noise, not a hem. The eyes break the robe's columns
    // into two runs apiece, so the face is genuine board structure, not
    // decoration painted on afterward.
    grid: [
      "....####....",
      "...######...",
      "..########..",
      ".##########.",
      "############",
      "###.####.###",
      "############",
      "############",
      "############",
      "############",
      "############",
      "..##.##.##..",
    ],
  },
  {
    id: "sword",
    name: "Sword",
    colour: "#D8D4E0",
    // Critter Knight's blade: a thin edge, a full-width crossguard, a grip and
    // pommel below.
    grid: [
      ".....##.....",
      ".....##.....",
      ".....##.....",
      ".....##.....",
      ".....##.....",
      ".....##.....",
      ".....##.....",
      "############",
      ".....##.....",
      ".....##.....",
      "....####....",
      "....####....",
    ],
  },
  {
    id: "hourglass",
    name: "Hourglass",
    colour: "#C9A227",
    // Chronicles' timepiece: two triangles pinched to a waist, anchored by
    // full-width top and bottom rows so the pinch has only one valid reading.
    grid: [
      "############",
      ".##########.",
      "..########..",
      "...######...",
      "....####....",
      ".....##.....",
      ".....##.....",
      "....####....",
      "...######...",
      "..########..",
      ".##########.",
      "############",
    ],
  },
  {
    id: "avalanche",
    name: "Avalanche",
    colour: "#A89880",
    // A snow-capped peak — the critter's own emoji, 🏔️ — over solid rock with
    // a cave mouth cut into the base: a hollow fully enclosed by rock above,
    // below and to both sides, so it reads as a cavity rather than a notch
    // cut from an edge (the earlier draft was a solid triangle on a solid
    // block, which is orthogonally convex and has nothing left to deduce
    // once a single run length is known).
    grid: [
      ".......#.......",
      "......###......",
      ".....#####.....",
      "....#######....",
      "...#########...",
      "..###########..",
      ".#############.",
      "###############",
      "###############",
      "######...######",
      "######...######",
      "######...######",
      "###############",
      "###############",
      "###############",
    ],
  },
  {
    id: "bulwark",
    name: "Bulwark",
    colour: "#C4A277",
    // A shield, flat full-width top tapering to a clipped point, with a
    // heraldic window cut into the face — the emblem opening reads as the
    // shield's crest and gives the middle rows and columns a second run.
    grid: [
      "###############",
      "###############",
      "###############",
      ".#############.",
      ".#############.",
      "..####...####..",
      "..####...####..",
      "...#########...",
      "...#########...",
      "....#######....",
      "....#######....",
      ".....#####.....",
      ".....#####.....",
      "......###......",
      "......###......",
    ],
  },
  {
    id: "geode",
    name: "Geode",
    colour: "#8AA8C4",
    // A geode is a hollow stone lined with crystal, so the cavity here isn't
    // decoration, it's the subject: a rhombus with an open pocket cut into
    // its upper half. The pocket stays clear of the diamond's one full-width
    // row (the widest, at the centre) so that row survives as the anchor a
    // solid diamond needs — carving the pocket through it in an earlier draft
    // removed the only line that pinned the shape's horizontal position and
    // the puzzle stopped being line-solvable.
    grid: [
      ".......#.......",
      "......###......",
      ".....#####.....",
      "....###.###....",
      "...###...###...",
      "..###.....###..",
      ".#############.",
      "###############",
      ".#############.",
      "..###########..",
      "...#########...",
      "....#######....",
      ".....#####.....",
      "......###......",
      ".......#.......",
    ],
  },
];
