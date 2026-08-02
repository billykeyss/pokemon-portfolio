import { describe, expect, it } from "vitest";
import { puzzleForLevel, levelCount } from "../engine/level";
import { puzzleFrom } from "../engine/clues";
import { cellAt, cellRect, gutterFor, layoutPuzzle, MIN_CELL_PX } from "./layout";
import type { Picture } from "../engine/types";

const SMALL: Picture = {
  id: "t",
  name: "T",
  colour: "#000000",
  grid: [".#.#.", "#####", "#####", ".###.", "..#.."],
};

describe("gutterFor", () => {
  it("is the deepest clue list, not the theoretical maximum", () => {
    expect(gutterFor([[1, 1], [5], [3]])).toBe(2);
  });

  it("reserves a slot even for an empty line, which renders as 0", () => {
    expect(gutterFor([[], []])).toBe(1);
  });
});

describe("layoutPuzzle", () => {
  it("fits the grid and both gutters inside the canvas", () => {
    const layout = layoutPuzzle(puzzleFrom(SMALL), 360, 360);
    expect(layout.originX + layout.cell * layout.size).toBeLessThanOrEqual(360);
    expect(layout.originY + layout.cell * layout.size).toBeLessThanOrEqual(360);
    expect(layout.originX).toBeGreaterThanOrEqual(layout.cell * layout.rowGutter);
    expect(layout.originY).toBeGreaterThanOrEqual(layout.cell * layout.colGutter);
  });

  it("keeps every shipped puzzle above the tappable floor on a phone", () => {
    // The design's main risk: clue gutters competing with the grid for a fixed
    // canvas. A picture whose clues squeeze cells below this fails here rather
    // than shipping unreadable.
    for (let n = 1; n <= levelCount(); n++) {
      const layout = layoutPuzzle(puzzleForLevel(n), 360, 360);
      expect(layout.cell, `level ${n} (${puzzleForLevel(n).id})`).toBeGreaterThanOrEqual(
        MIN_CELL_PX,
      );
    }
  });
});

describe("cellAt", () => {
  it("round-trips with cellRect", () => {
    const layout = layoutPuzzle(puzzleFrom(SMALL), 360, 360);
    const rect = cellRect(layout, 2, 3);
    expect(cellAt(layout, rect.x + rect.w / 2, rect.y + rect.h / 2)).toEqual({
      row: 2,
      col: 3,
    });
  });

  it("returns null in the clue gutters and off the board", () => {
    const layout = layoutPuzzle(puzzleFrom(SMALL), 360, 360);
    expect(cellAt(layout, layout.originX - 2, layout.originY + 2)).toBeNull();
    expect(cellAt(layout, layout.originX + 2, layout.originY - 2)).toBeNull();
    expect(cellAt(layout, 9999, 9999)).toBeNull();
  });
});
