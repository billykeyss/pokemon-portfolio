import { describe, expect, it } from "vitest";
import { ALL_DIGITS, bit } from "./candidates";
import { CELLS } from "./grid";
import { clearStrikesAt, emptyMarks, setStrike, toggleStrike, visibleMarks } from "./marks";

describe("emptyMarks", () => {
  it("is 81 cells, all unstruck", () => {
    const m = emptyMarks();
    expect(m).toHaveLength(CELLS);
    expect(m.every((mask) => mask === 0)).toBe(true);
  });
});

describe("setStrike", () => {
  it("sets exactly the requested digit in the requested cell", () => {
    const m = setStrike(emptyMarks(), 5, 7, true);
    expect(m[5]).toBe(bit(7));
    for (let i = 0; i < CELLS; i++) if (i !== 5) expect(m[i]).toBe(0);
  });

  it("clears without touching other struck digits in the same cell", () => {
    let m = setStrike(emptyMarks(), 5, 7, true);
    m = setStrike(m, 5, 3, true);
    m = setStrike(m, 5, 7, false);
    expect(m[5]).toBe(bit(3));
  });

  it("does not mutate the array it is given", () => {
    const before = emptyMarks();
    setStrike(before, 5, 7, true);
    expect(before[5]).toBe(0);
  });
});

describe("toggleStrike", () => {
  const candidatesWith = (...digits: number[]) =>
    digits.reduce((m, d) => m | bit(d as never), 0);

  it("strikes an unstruck digit that is a live candidate", () => {
    const result = toggleStrike(emptyMarks(), 10, 4, candidatesWith(4, 6));
    expect(result).not.toBeNull();
    expect(result!.before).toBe(false);
    expect(result!.after).toBe(true);
    expect(result!.marks[10]).toBe(bit(4));
  });

  it("un-strikes a struck digit on a second toggle", () => {
    const first = toggleStrike(emptyMarks(), 10, 4, candidatesWith(4, 6))!;
    const second = toggleStrike(first.marks, 10, 4, candidatesWith(4, 6));
    expect(second).not.toBeNull();
    expect(second!.before).toBe(true);
    expect(second!.after).toBe(false);
    expect(second!.marks[10]).toBe(0);
  });

  it("refuses to strike a digit outside the current candidate set", () => {
    // This is the single most important guard in the file: a mark must never
    // assert something about a digit the board is not actually offering.
    const result = toggleStrike(emptyMarks(), 10, 9, candidatesWith(4, 6));
    expect(result).toBeNull();
  });

  it("leaves the board fully open — every digit strikeable when every digit is a candidate", () => {
    for (let d = 1; d <= 9; d++) {
      expect(toggleStrike(emptyMarks(), 0, d as never, ALL_DIGITS)).not.toBeNull();
    }
  });

  it("does not mutate the marks array it is given", () => {
    const before = emptyMarks();
    toggleStrike(before, 10, 4, candidatesWith(4));
    expect(before[10]).toBe(0);
  });

  it("touches only the one cell named", () => {
    const result = toggleStrike(emptyMarks(), 10, 4, candidatesWith(4))!;
    for (let i = 0; i < CELLS; i++) if (i !== 10) expect(result.marks[i]).toBe(0);
  });
});

describe("clearStrikesAt", () => {
  it("zeroes exactly the named cell", () => {
    let m = setStrike(emptyMarks(), 5, 7, true);
    m = setStrike(m, 6, 3, true);
    const cleared = clearStrikesAt(m, 5);
    expect(cleared[5]).toBe(0);
    expect(cleared[6]).toBe(bit(3));
  });

  it("is a no-op on an already-clear cell", () => {
    const m = emptyMarks();
    expect(clearStrikesAt(m, 5)).toEqual(m);
  });

  it("does not mutate the array it is given", () => {
    const before = setStrike(emptyMarks(), 5, 7, true);
    clearStrikesAt(before, 5);
    expect(before[5]).toBe(bit(7));
  });
});

describe("visibleMarks", () => {
  it("keeps a struck digit that is still a live candidate", () => {
    expect(visibleMarks(bit(4), bit(4) | bit(6))).toBe(bit(4));
  });

  it("drops a struck digit that has fallen out of the candidate set, without needing the stored mark changed", () => {
    // The scenario the design calls out: a peer claims the digit, the strike
    // goes moot, and it is filtered at render time rather than deleted from
    // storage — so it can reappear if the candidate ever comes back.
    const stored = bit(4) | bit(6);
    expect(visibleMarks(stored, bit(6))).toBe(bit(6) & stored);
    expect(visibleMarks(stored, bit(6)) & bit(4)).toBe(0);

    // The candidate returns (e.g. the placement that claimed it was undone)
    // and the same stored mark is visible again, unchanged.
    expect(visibleMarks(stored, bit(4) | bit(6))).toBe(stored);
  });

  it("shows nothing for a filled cell, whose candidate mask is always 0", () => {
    expect(visibleMarks(bit(4), 0)).toBe(0);
  });
});
