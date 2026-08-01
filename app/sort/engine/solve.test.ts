import { describe, expect, it } from "vitest";
import { applyMove, isSolved } from "./rules";
import { canonicalKey, hint, solve } from "./solve";
import type { Puzzle } from "./types";

const puzzle = (bottles: number[][], colors: number, capacity = 4): Puzzle => ({
  bottles: bottles.map((b) => [...b]),
  capacity,
  colors,
});

describe("canonicalKey", () => {
  it("ignores bottle order", () => {
    const a = puzzle([[0, 1], [1, 0], []], 2);
    const b = puzzle([[], [1, 0], [0, 1]], 2);
    expect(canonicalKey(a)).toBe(canonicalKey(b));
  });

  it("distinguishes genuinely different states", () => {
    const a = puzzle([[0, 1], []], 2);
    const b = puzzle([[1, 0], []], 2);
    expect(canonicalKey(a)).not.toBe(canonicalKey(b));
  });
});

describe("solve", () => {
  it("reports an already-solved puzzle with no moves", () => {
    const p = puzzle([[0, 0, 0, 0], [1, 1, 1, 1], []], 2);
    const r = solve(p);
    expect(r.status).toBe("solved");
    if (r.status === "solved") expect(r.moves).toHaveLength(0);
  });

  it("solves a one-move puzzle", () => {
    const p = puzzle([[0, 0, 0], [0], [1, 1, 1, 1]], 2);
    const r = solve(p);
    expect(r.status).toBe("solved");
    if (r.status === "solved") expect(r.moves).toEqual([{ from: 1, to: 0 }]);
  });

  it("returns a move sequence that actually reaches a solved state", () => {
    const p = puzzle(
      [
        [0, 1, 0, 1],
        [1, 0, 1, 0],
        [],
        [],
      ],
      2,
    );
    const r = solve(p);
    expect(r.status).toBe("solved");
    if (r.status !== "solved") return;

    let state = p;
    for (const m of r.moves) state = applyMove(state, m);
    expect(isSolved(state)).toBe(true);
  });

  it("solves a four-colour puzzle and the path replays cleanly", () => {
    const p = puzzle(
      [
        [0, 1, 2, 3],
        [3, 2, 1, 0],
        [1, 0, 3, 2],
        [2, 3, 0, 1],
        [],
        [],
      ],
      4,
    );
    const r = solve(p);
    expect(r.status).toBe("solved");
    if (r.status !== "solved") return;

    let state = p;
    for (const m of r.moves) state = applyMove(state, m);
    expect(isSolved(state)).toBe(true);
  });

  it("reports an unsolvable puzzle", () => {
    // Two colours, no spare space, every bottle mixed and full: no legal move
    // exists, so the search exhausts immediately.
    const p = puzzle(
      [
        [0, 1, 0, 1],
        [1, 0, 1, 0],
      ],
      2,
    );
    expect(solve(p).status).toBe("unsolvable");
  });

  it("returns unknown rather than lying when the node cap is hit", () => {
    const p = puzzle(
      [
        [0, 1, 2, 3],
        [3, 2, 1, 0],
        [1, 0, 3, 2],
        [2, 3, 0, 1],
        [],
        [],
      ],
      4,
    );
    expect(solve(p, 1).status).toBe("unknown");
  });
});

describe("hint", () => {
  it("returns the first move of a solution", () => {
    const p = puzzle([[0, 0, 0], [0], [1, 1, 1, 1]], 2);
    expect(hint(p)).toEqual({ from: 1, to: 0 });
  });

  it("returns null when there is nothing to suggest", () => {
    const p = puzzle([[0, 0, 0, 0], [1, 1, 1, 1]], 2);
    expect(hint(p)).toBeNull();
  });
});
