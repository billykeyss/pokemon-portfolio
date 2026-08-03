import { describe, expect, it } from "vitest";
import { colOf, rowOf } from "../engine/grid";
import { actionForKey, inputStatus, keypadAction, movedIndex } from "./keys";

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
    // Shift+5 is the strike shortcut (see the "strikes" block below), not a
    // plain digit placement and not redo — this pins it away from both.
    expect(actionForKey("5", true)).toEqual({ kind: "strike", digit: 5 });
  });

  it("maps every Shift+digit to a strike action", () => {
    for (let d = 1; d <= 9; d++) {
      expect(actionForKey(String(d), true)).toEqual({ kind: "strike", digit: d });
    }
  });

  it("keeps the strike shortcut and redo on entirely different keys, so neither can shadow the other", () => {
    // actionForKey's digit branch only ever matches "1".."9"; "u" never
    // reaches it, and the digit branch never produces a "redo". This test
    // exists so a future refactor that merged the two branches would have to
    // break one of these two assertions to compile-and-pass.
    expect(actionForKey("u", true)).toEqual({ kind: "redo" });
    expect(actionForKey("9", true)).not.toEqual({ kind: "redo" });
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

describe("keypadAction", () => {
  it("fills the selected cell rather than arming the digit", () => {
    // The bug this exists to prevent: arming unconditionally meant a player who
    // had already picked a cell watched their selection vanish, and had to pick
    // it a second time.
    expect(keypadAction(5, 40, false)).toEqual({ kind: "place", cell: 40, digit: 5 });
    expect(keypadAction(1, 0, false)).toEqual({ kind: "place", cell: 0, digit: 1 });
    expect(keypadAction(9, 80, false)).toEqual({ kind: "place", cell: 80, digit: 9 });
  });

  it("arms the digit when no cell is selected", () => {
    expect(keypadAction(5, null, false)).toEqual({ kind: "arm", digit: 5 });
  });

  it("disarms when the keypad reports a null digit", () => {
    // Keypad passes null when the armed digit is tapped a second time, and it
    // must disarm whether or not a cell happens to be selected, in either mode.
    expect(keypadAction(null, null, false)).toEqual({ kind: "disarm" });
    expect(keypadAction(null, 40, false)).toEqual({ kind: "disarm" });
    expect(keypadAction(null, 40, true)).toEqual({ kind: "disarm" });
  });

  it("strikes the selected cell instead of placing, when mark mode is on", () => {
    expect(keypadAction(5, 40, true)).toEqual({ kind: "strike", cell: 40, digit: 5 });
    expect(keypadAction(3, 0, true)).toEqual({ kind: "strike", cell: 0, digit: 3 });
  });

  it("disarms rather than arming a digit for painting, when mark mode is on with nothing selected", () => {
    // Mark mode has no digit-first equivalent — there is nothing to "arm" a
    // strike onto — so a tap with no selection must not fall through to the
    // ordinary arm behaviour.
    expect(keypadAction(5, null, true)).toEqual({ kind: "disarm" });
  });

  it("treats cell 0 as a real selection, not as absent", () => {
    // A plain truthiness check here would make the top-left cell the one square
    // on the board that cannot be filled this way.
    expect(keypadAction(3, 0, false).kind).toBe("place");
    expect(keypadAction(3, 0, true).kind).toBe("strike");
  });
});

describe("inputStatus", () => {
  const name = (i: number) => `r${Math.floor(i / 9) + 1}c${(i % 9) + 1}`;

  it("names the armed digit and says taps will place it", () => {
    expect(inputStatus(null, 5, false, name)).toBe("5 armed — tap cells to place it");
  });

  it("names the selected cell and says taps will fill it", () => {
    expect(inputStatus(40, null, false, name)).toBe("r5c5 — tap a number to fill it");
  });

  it("invites either direction when neither is chosen", () => {
    expect(inputStatus(null, null, false, name)).toBe("Tap a cell, or a number to arm it");
  });

  it("says striking, not filling, in mark mode", () => {
    // The whole point of the line: the same tap does something different here,
    // and nothing else on screen distinguishes the two.
    expect(inputStatus(40, null, true, name)).toBe(
      "Marking r5c5 — tap a number to cross it off",
    );
  });

  it("asks for a cell first in mark mode, since there is no digit-first strike", () => {
    expect(inputStatus(null, null, true, name)).toBe("Marking — tap a cell first");
  });

  it("lets mark mode win over an armed digit, since that is what a tap will do", () => {
    expect(inputStatus(null, 5, true, name)).toBe("Marking — tap a cell first");
  });

  it("distinguishes the two non-mark directions — the mix-up this exists to stop", () => {
    expect(inputStatus(null, 5, false, name)).not.toBe(inputStatus(40, null, false, name));
  });
});
