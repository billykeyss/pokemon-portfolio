import { describe, expect, it } from "vitest";
import { bit, type Mask } from "../engine/candidates";
import type { Board, Cell, Digit, Grid, Puzzle } from "../engine/types";
import { AUTO_FINISH_MAX, autoFinishTrigger, autoFinishable } from "./autoFinish";

const parse = (s: string): Grid =>
  [...s.replaceAll(/[^0-9.]/g, "")].map((c) => (c === "." ? 0 : Number(c)) as Cell);

const SOLUTION = parse(
  "534678912" + "672195348" + "198342567" +
  "859761423" + "426853791" + "713924856" +
  "961537284" + "287419635" + "345286179",
);

const basePuzzle: Puzzle = { givens: SOLUTION, solution: SOLUTION, tier: "easy", seed: 1 };

/**
 * A board where every cell is given except `zeroGivens`, which are open for
 * an entry. `entries` fills some of those in — the rest are genuinely empty.
 *
 * The candidates handed to `autoFinishable` are supplied separately by each
 * test rather than derived with `allCandidates`: the function only ever reads
 * `candidates[cell]` for cells it already knows are empty, so a synthetic
 * mask pins the exact branch under test instead of depending on a real
 * puzzle happening to be unambiguous at the chosen cells.
 */
function makeBoard(zeroGivens: number[], entries: Record<number, number> = {}): Board {
  const givens = SOLUTION.map((v, i) => (zeroGivens.includes(i) ? 0 : v)) as Cell[];
  const entryGrid = new Array(81).fill(0) as Cell[];
  for (const [i, v] of Object.entries(entries)) entryGrid[Number(i)] = v as Cell;
  return { puzzle: { ...basePuzzle, givens }, entries: entryGrid };
}

function singletonCandidates(empties: number[]): Mask[] {
  const cands = new Array(81).fill(0) as Mask[];
  for (const i of empties) cands[i] = bit(SOLUTION[i] as Digit);
  return cands;
}

const otherDigit = (d: number): Digit => (d === 9 ? 1 : ((d + 1) as Digit));

describe("autoFinishable", () => {
  it("exports the documented starting threshold", () => {
    expect(AUTO_FINISH_MAX).toBe(5);
  });

  it("returns the forced placement for every empty cell, in board order", () => {
    const empties = [4, 1, 7, 0, 3]; // deliberately out of order
    const b = makeBoard(empties);
    const cands = singletonCandidates(empties);
    const result = autoFinishable(b, cands);
    expect(result).toEqual(
      [0, 1, 3, 4, 7].map((cell) => ({ cell, digit: SOLUTION[cell] })),
    );
  });

  it("fires at exactly AUTO_FINISH_MAX empty cells", () => {
    const empties = [0, 1, 2, 3, 4];
    expect(empties).toHaveLength(AUTO_FINISH_MAX);
    const b = makeBoard(empties);
    const cands = singletonCandidates(empties);
    expect(autoFinishable(b, cands)).toHaveLength(AUTO_FINISH_MAX);
  });

  it("refuses to fire with one more empty cell than the threshold, even if every one is forced", () => {
    const empties = [0, 1, 2, 3, 4, 5];
    expect(empties).toHaveLength(AUTO_FINISH_MAX + 1);
    const b = makeBoard(empties);
    const cands = singletonCandidates(empties);
    expect(autoFinishable(b, cands)).toBeNull();
  });

  it("refuses to fire on an already-solved board", () => {
    const b = makeBoard([]);
    expect(autoFinishable(b, singletonCandidates([]))).toBeNull();
  });

  it("refuses to fire while any remaining empty cell has more than one candidate", () => {
    // Two of three cells are forced; the third still poses a real choice, so
    // there is a decision left the game must not make.
    const empties = [0, 1, 2];
    const b = makeBoard(empties);
    const cands = singletonCandidates(empties);
    cands[1] |= bit(otherDigit(SOLUTION[1] as number));
    expect(autoFinishable(b, cands)).toBeNull();
  });

  it("refuses to fire while any remaining empty cell has zero candidates", () => {
    const empties = [0, 1];
    const b = makeBoard(empties);
    const cands = singletonCandidates(empties);
    cands[0] = 0;
    expect(autoFinishable(b, cands)).toBeNull();
  });

  it("refuses to fire when a wrong entry is on the board, even though the remaining cells look forced", () => {
    // The trap showHint already guards against: candidates are computed from
    // the merged grid, wrong entries included, so a mistake corrupts what
    // "exactly one candidate" means everywhere it is seen. Auto-finish must
    // not confidently write more digits on top of a false premise.
    const empties = [0, 1];
    const wrong = otherDigit(SOLUTION[2] as number);
    const b = makeBoard([...empties, 2], { 2: wrong });
    const cands = singletonCandidates(empties);
    expect(autoFinishable(b, cands)).toBeNull();
  });

  it("still fires when the disagreeing entry happens to be correct", () => {
    // A filled cell that matches the solution is not a wrong entry, even
    // though it started out as one of the puzzle's blanks — the guard is
    // about correctness, not about given-vs-entered.
    const empties = [0, 1];
    const b = makeBoard([...empties, 2], { 2: SOLUTION[2] as number });
    const cands = singletonCandidates(empties);
    expect(autoFinishable(b, cands)).toEqual(
      empties.map((cell) => ({ cell, digit: SOLUTION[cell] })),
    );
  });

  it("never counts a given cell as empty", () => {
    // Sanity check on the fixture itself: every index outside zeroGivens is a
    // given equal to the solution, so it can never masquerade as forced-empty
    // or as a wrong entry.
    const b = makeBoard([0]);
    for (let i = 1; i < 81; i++) expect(b.puzzle.givens[i]).toBe(SOLUTION[i]);
  });
});

describe("autoFinishTrigger", () => {
  it("fires when nothing has fired for this puzzle yet", () => {
    const empties = [0, 1];
    const b = makeBoard(empties);
    const cands = singletonCandidates(empties);
    expect(autoFinishTrigger(b, cands, null)).toEqual(
      empties.map((cell) => ({ cell, digit: SOLUTION[cell] })),
    );
  });

  it("fires the exact fire-then-undo sequence once, then refuses to re-fire", () => {
    // This is the scenario the gate exists for: auto-finish fires, the
    // player undoes it — landing back on the identical board, same Puzzle
    // object, same candidates, still qualifying — and the trigger must not
    // immediately hand the same placements back. Undo said "put that back";
    // "nothing is left to work out" being still true is not permission to
    // override that.
    const empties = [18, 40, 65];
    const b = makeBoard(empties);
    const cands = singletonCandidates(empties);

    const first = autoFinishTrigger(b, cands, null);
    expect(first).toEqual(empties.map((cell) => ({ cell, digit: SOLUTION[cell] })));

    // The caller records `b.puzzle` as fired-for right after the first call,
    // then undo (which never touches `board.puzzle`) leaves the exact same
    // board and candidates in front of the trigger a second time.
    const second = autoFinishTrigger(b, cands, b.puzzle);
    expect(second).toBeNull();
  });

  it("fires again for a different Puzzle object, even one built the same way", () => {
    // Compared by reference, not value: puzzleFor returns a fresh Puzzle on
    // every deal, so a new deal must always be able to auto-finish even if
    // its content happens to be identical to a previous one.
    const empties = [0, 1];
    const b = makeBoard(empties);
    const cands = singletonCandidates(empties);
    const differentPuzzleSameContent: Puzzle = { ...b.puzzle };
    expect(autoFinishTrigger(b, cands, differentPuzzleSameContent)).toEqual(
      empties.map((cell) => ({ cell, digit: SOLUTION[cell] })),
    );
  });

  it("still defers to autoFinishable's own refusals — the once-per-puzzle gate does not paper over them", () => {
    // Not firing here is autoFinishable's wrong-entry guard, not the gate
    // this function adds; the gate must not be the only thing standing
    // between a mistake and an auto-fill.
    const empties = [0, 1];
    const wrong = otherDigit(SOLUTION[2] as number);
    const b = makeBoard([...empties, 2], { 2: wrong });
    const cands = singletonCandidates(empties);
    expect(autoFinishTrigger(b, cands, null)).toBeNull();
  });
});
