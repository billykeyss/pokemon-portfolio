import { describe, expect, it } from "vitest";
import { colOf, rowOf } from "../engine/grid";
import { actionForKey, movedIndex } from "./keys";

describe("actionForKey", () => {
  it("maps every digit key to its digit", () => {
    for (let d = 1; d <= 9; d++) {
      expect(actionForKey(String(d), false)).toEqual({ kind: "digit", digit: d });
    }
  });

  it("erases on both delete keys", () => {
    expect(actionForKey("Backspace", false)).toEqual({ kind: "erase" });
    expect(actionForKey("Delete", false)).toEqual({ kind: "erase" });
  });

  it("redoes on Shift+U, which the browser reports as an uppercase U", () => {
    // The bug this pins: `event.key` is the *shifted character*, so a guard
    // written as `key === "u"` never sees Shift+U at all and redo is dead.
    expect(actionForKey("U", true)).toEqual({ kind: "redo" });
  });

  it("undoes on plain u, and on Caps-Lock u, which also arrives as U", () => {
    expect(actionForKey("u", false)).toEqual({ kind: "undo" });
    expect(actionForKey("U", false)).toEqual({ kind: "undo" });
  });

  it("does not redo when shift is held on some other key", () => {
    expect(actionForKey("Escape", true)).toEqual({ kind: "dismiss" });
    expect(actionForKey("5", true)).toEqual({ kind: "digit", digit: 5 });
  });

  it("dismisses on Escape", () => {
    expect(actionForKey("Escape", false)).toEqual({ kind: "dismiss" });
  });

  it("maps the four arrows to their grid steps", () => {
    expect(actionForKey("ArrowLeft", false)).toEqual({ kind: "move", delta: -1 });
    expect(actionForKey("ArrowRight", false)).toEqual({ kind: "move", delta: 1 });
    expect(actionForKey("ArrowUp", false)).toEqual({ kind: "move", delta: -9 });
    expect(actionForKey("ArrowDown", false)).toEqual({ kind: "move", delta: 9 });
  });

  it("ignores keys it has no meaning for", () => {
    for (const key of ["a", "0", "Enter", "Tab", " ", "F5", "Shift"]) {
      expect(actionForKey(key, false)).toBeNull();
    }
  });
});

describe("movedIndex", () => {
  it("steps within a row and within a column", () => {
    expect(movedIndex(40, 1)).toBe(41);
    expect(movedIndex(40, -1)).toBe(39);
    expect(movedIndex(40, 9)).toBe(49);
    expect(movedIndex(40, -9)).toBe(31);
  });

  it("refuses to wrap across a row boundary at every one of the eight seams", () => {
    // The bug this pins: a flat [0, 81) bound alone lets ArrowRight from
    // column 8 land on column 0 of the next row, and ArrowLeft from column 0
    // on the last column of the previous one.
    for (let row = 0; row < 9; row++) {
      expect(movedIndex(row * 9 + 8, 1)).toBeNull();
      expect(movedIndex(row * 9, -1)).toBeNull();
    }
  });

  it("refuses to leave the grid vertically", () => {
    for (let col = 0; col < 9; col++) {
      expect(movedIndex(col, -9)).toBeNull();
      expect(movedIndex(72 + col, 9)).toBeNull();
    }
  });

  it("never changes the row on a vertical step or the column on a horizontal one", () => {
    for (let i = 0; i < 81; i++) {
      for (const delta of [-1, 1]) {
        const next = movedIndex(i, delta);
        if (next !== null) expect(rowOf(next)).toBe(rowOf(i));
      }
      for (const delta of [-9, 9]) {
        const next = movedIndex(i, delta);
        if (next !== null) expect(colOf(next)).toBe(colOf(i));
      }
    }
  });
});
