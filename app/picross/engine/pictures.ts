import type { Picture } from "./types";

/**
 * Puzzle artwork, ordered small to large.
 *
 * Hand-drawn in the same spirit as `_shared/icons.ts`: the arcade's own
 * critters and objects, not anyone else's. Every one of these has to survive
 * `isLineSolvable`, so a picture is a design constraint as much as a drawing —
 * large open fields deduce easily, scattered single pixels usually do not.
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
    grid: [".###.", ".#.#.", ".###.", "..#..", "..##."],
  },
  {
    id: "leaf",
    name: "Leaf",
    colour: "#3BA85B",
    grid: [
      "...###..",
      "..#####.",
      ".######.",
      "#######.",
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
];
