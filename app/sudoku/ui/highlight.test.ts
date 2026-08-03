import { describe, expect, it } from "vitest";
import { allCandidates, bit } from "../engine/candidates";
import { PEERS, boxOf, cellsOf, colOf, rowOf } from "../engine/grid";
import type { Cell, Grid, Puzzle } from "../engine/types";
import { highlightMap } from "./highlight";

const parse = (s: string): Grid =>
  [...s.replaceAll(/[^0-9.]/g, "")].map((c) => (c === "." ? 0 : Number(c)) as Cell);

const SOLUTION = parse(
  "534678912" + "672195348" + "198342567" +
  "859761423" + "426853791" + "713924856" +
  "961537284" + "287419635" + "345286179",
);

const puzzle: Puzzle = {
  givens: parse("53..7...." + "6..195..." + ".98....6." + "8...6...3" + "4..8.3..1" + "7...2...6" + ".6....28." + "...419..5" + "....8..79"),
  solution: SOLUTION,
  tier: "easy",
  seed: 1,
};

const board = (entries: Record<number, number> = {}) => {
  const cells = new Array(81).fill(0) as Cell[];
  for (const [i, v] of Object.entries(entries)) cells[Number(i)] = v as Cell;
  return { puzzle, entries: cells };
};

const input = (over: Partial<Parameters<typeof highlightMap>[0]> = {}) => {
  const b = over.board ?? board();
  return {
    board: b,
    candidates: allCandidates(b),
    selected: null,
    armed: null,
    hint: null,
    ...over,
  };
};

describe("highlightMap", () => {
  it("returns one entry per cell", () => {
    expect(highlightMap(input())).toHaveLength(81);
  });

  it("marks nothing when nothing is selected or armed", () => {
    for (const h of highlightMap(input())) {
      expect(
        h.selected || h.peer || h.sameDigit || h.armedCandidate || h.wrong || h.hint || h.hintUnit,
      ).toBe(false);
      expect(h.eliminated).toBe(0);
    }
  });

  it("marks the selected cell and only that cell as selected", () => {
    const map = highlightMap(input({ selected: 40 }));
    expect(map[40].selected).toBe(true);
    expect(map.filter((h) => h.selected)).toHaveLength(1);
  });

  it("marks exactly the selected cell's row, column and box as peers", () => {
    const map = highlightMap(input({ selected: 40 }));
    for (let i = 0; i < 81; i++) {
      const shares =
        i !== 40 && (rowOf(i) === rowOf(40) || colOf(i) === colOf(40) || boxOf(i) === boxOf(40));
      expect(map[i].peer).toBe(shares);
    }
    expect(map[40].peer).toBe(false);
  });

  it("marks every cell holding the selected cell's digit", () => {
    const b = board({ 2: 4 });
    const map = highlightMap(input({ board: b, selected: 2 }));
    expect(map[2].sameDigit).toBe(true);
    for (let i = 0; i < 81; i++) {
      const value = b.puzzle.givens[i] !== 0 ? b.puzzle.givens[i] : b.entries[i];
      if (value === 4) expect(map[i].sameDigit).toBe(true);
    }
  });

  it("does not mark empty cells as sameDigit when an empty cell is selected with no armed digit", () => {
    // Selects index 40 (empty). Without the `|| null` guard on focusDigit,
    // valueAt returns 0, which then matches every other empty cell's 0.
    // This is the load-bearing test for that guard.
    const map = highlightMap(input({ selected: 40, armed: null }));
    expect(map[40].sameDigit).toBe(false);
    // Every one of these is genuinely empty in the fixture. The list used to
    // name nine cells, six of which are givens the loop's guard skipped in
    // silence — coverage the name claimed but did not have.
    const emptyIndices = [10, 50, 70];
    for (const i of emptyIndices) {
      expect(puzzle.givens[i]).toBe(0);
      expect(map[i].sameDigit).toBe(false);
    }
  });

  it("marks cells that could still take an armed digit", () => {
    const map = highlightMap(input({ armed: 4 }));
    for (let i = 0; i < 81; i++) {
      if (!map[i].armedCandidate) continue;
      for (const p of PEERS[i]) {
        const value = puzzle.givens[p];
        expect(value).not.toBe(4);
      }
    }
    expect(map.some((h) => h.armedCandidate)).toBe(true);
  });

  it("marks an entry that disagrees with the solution as wrong", () => {
    const wrongDigit = SOLUTION[2] === 4 ? 5 : 4;
    const map = highlightMap(input({ board: board({ 2: wrongDigit }) }));
    expect(map[2].wrong).toBe(true);
  });

  it("never marks a correct entry as wrong", () => {
    const map = highlightMap(input({ board: board({ 2: SOLUTION[2] as number }) }));
    expect(map[2].wrong).toBe(false);
  });

  it("never marks a given as wrong", () => {
    const map = highlightMap(input());
    for (let i = 0; i < 81; i++) {
      if (puzzle.givens[i] !== 0) expect(map[i].wrong).toBe(false);
    }
  });

  it("never marks a given as wrong even if the puzzle is inconsistent", () => {
    // This test exercises the !isGiven guard directly by constructing a
    // deliberately inconsistent Puzzle where a given disagrees with solution.
    // A real Puzzle should never have this property, but the guard exists
    // to defend against inconsistent data reaching the function.
    const inconsistentPuzzle: Puzzle = {
      ...puzzle,
      givens: (() => {
        const g = [...puzzle.givens];
        g[0] = 7; // Overwrite with wrong value; solution[0] is 5
        return g as Grid;
      })(),
    };
    const b = { puzzle: inconsistentPuzzle, entries: new Array(81).fill(0) as Cell[] };
    const map = highlightMap(input({ board: b }));
    expect(map[0].wrong).toBe(false);
  });

  it("marks the cells a hint rests on", () => {
    const map = highlightMap(
      input({ hint: { cells: [3, 9], units: [], digits: [7], eliminated: [] } }),
    );
    expect(map[3].hint).toBe(true);
    expect(map[9].hint).toBe(true);
    expect(map[4].hint).toBe(false);
  });

  // A locked-candidates hint, shaped exactly as explain() emits one: three
  // premise cells inside box 4, the box and the line it claims, and the two
  // eliminations the sentence is actually about. The elimination-carrying
  // fixture is the point — the only hint fixture here used to pass
  // `eliminated: []`, which is why the map dropping the field went unnoticed.
  const lockedHint = {
    cells: [30, 31, 32],
    units: [
      { kind: "box" as const, index: 4 },
      { kind: "row" as const, index: 3 },
    ],
    digits: [7 as const],
    eliminated: [
      { cell: 34, digit: 7 as const },
      { cell: 35, digit: 7 as const },
      { cell: 34, digit: 4 as const },
    ],
  };

  it("marks every cell of every unit a hint's argument names", () => {
    const map = highlightMap(input({ hint: lockedHint }));
    const inUnits = new Set<number>([...cellsOf(lockedHint.units[0]), ...cellsOf(lockedHint.units[1])]);
    for (let i = 0; i < 81; i++) {
      expect(map[i].hintUnit).toBe(inUnits.has(i));
    }
    // The premise cells sit inside the box, so they are both — the flags layer
    // rather than compete, same as everywhere else here.
    expect(map[30].hint).toBe(true);
    expect(map[30].hintUnit).toBe(true);
  });

  it("marks exactly the digits a hint eliminates, in exactly the cells it eliminates them from", () => {
    const map = highlightMap(input({ hint: lockedHint }));
    // Two removals land on cell 34; they accumulate into one mask rather than
    // the later one replacing the earlier.
    expect(map[34].eliminated).toBe(bit(7) | bit(4));
    expect(map[35].eliminated).toBe(bit(7));
    for (let i = 0; i < 81; i++) {
      if (i !== 34 && i !== 35) expect(map[i].eliminated).toBe(0);
    }
  });

  it("does not strike marks in the cells a hint's argument rests on", () => {
    // The premise cells still hold the digit — they are where it must go, not
    // where it cannot. Striking them out would invert the sentence.
    const map = highlightMap(input({ hint: lockedHint }));
    for (const i of lockedHint.cells) expect(map[i].eliminated).toBe(0);
  });

  it("leaves the hint fields clear when no hint is open", () => {
    const map = highlightMap(input({ selected: 40, armed: 4 }));
    for (const h of map) {
      expect(h.hintUnit).toBe(false);
      expect(h.eliminated).toBe(0);
    }
  });

  it("lets flags coexist rather than forcing a winner", () => {
    // A wrong entry that is also the selected cell is both, not one or the
    // other — an enum here would make the UI choose between telling the player
    // where they are and telling them they are wrong.
    const wrongDigit = SOLUTION[2] === 4 ? 5 : 4;
    const map = highlightMap(input({ board: board({ 2: wrongDigit }), selected: 2 }));
    expect(map[2].wrong).toBe(true);
    expect(map[2].selected).toBe(true);
  });
});
