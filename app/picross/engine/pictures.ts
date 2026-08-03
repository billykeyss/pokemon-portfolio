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
    // boulder's symmetric diamonds — the taper only goes one way.
    grid: [
      "....##....",
      "...####...",
      "..######..",
      ".########.",
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
    // A fan: wide dome at the hinge, tapering to a point — droplet's taper
    // read the other way up.
    grid: [
      "..######..",
      "##########",
      "##########",
      "##########",
      ".########.",
      "..######..",
      "...####...",
      "...####...",
      "....##....",
      "....##....",
    ],
  },
  {
    id: "arrow",
    name: "Arrow",
    colour: "#8FA8F0",
    // The chevron the Arrow Escape cabinet clears, on a shaft.
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
      "...####...",
    ],
  },
  {
    id: "crate",
    name: "Crate",
    colour: "#6B4A2A",
    // The stocked crate Shelf Sort works with, lid bevelled top and bottom.
    grid: [
      ".########.",
      "##########",
      "##########",
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
    // Round head, straight robe, a scalloped hem in three thick teeth rather
    // than single pixels, which the solver reads as noise, not a hem.
    grid: [
      "....####....",
      "...######...",
      "..########..",
      ".##########.",
      "############",
      "############",
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
    // A single peak widening straight down into solid rock — deliberately
    // solid rather than a jagged multi-peak range, to keep clue lists shallow
    // at this size.
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
      "###############",
      "###############",
      "###############",
      "###############",
      "###############",
      "###############",
    ],
  },
  {
    id: "bulwark",
    name: "Bulwark",
    colour: "#C4A277",
    // A shield: flat full-width top, tapering in steadily to a clipped point.
    grid: [
      "###############",
      "###############",
      "###############",
      ".#############.",
      ".#############.",
      "..###########..",
      "..###########..",
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
    // A cut crystal: a solid rhombus, point to point.
    grid: [
      ".......#.......",
      "......###......",
      ".....#####.....",
      "....#######....",
      "...#########...",
      "..###########..",
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
