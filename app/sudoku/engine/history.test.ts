import { describe, expect, it } from "vitest";
import { emptyHistory, record, redo, undo } from "./history";

describe("history", () => {
  it("has nothing to undo when empty", () => {
    expect(undo(emptyHistory())).toBeNull();
    expect(redo(emptyHistory())).toBeNull();
  });

  it("undoes the most recent change first", () => {
    let h = record(emptyHistory(), { kind: "place", index: 0, before: 0, after: 5 });
    h = record(h, { kind: "place", index: 1, before: 0, after: 3 });

    const first = undo(h);
    expect(first?.change).toEqual({ kind: "place", index: 1, before: 0, after: 3 });

    const second = undo(first!.history);
    expect(second?.change).toEqual({ kind: "place", index: 0, before: 0, after: 5 });
    expect(undo(second!.history)).toBeNull();
  });

  it("redoes what it undid", () => {
    const h = record(emptyHistory(), { kind: "place", index: 4, before: 0, after: 9 });
    const back = undo(h)!;
    const forward = redo(back.history)!;
    expect(forward.change).toEqual({ kind: "place", index: 4, before: 0, after: 9 });
    expect(redo(forward.history)).toBeNull();
  });

  it("drops the redo stack once a new change is recorded", () => {
    const h = record(emptyHistory(), { kind: "place", index: 0, before: 0, after: 1 });
    const back = undo(h)!;
    const diverged = record(back.history, { kind: "place", index: 2, before: 0, after: 7 });
    expect(redo(diverged)).toBeNull();
  });

  it("does not mutate the history it is given", () => {
    const h = record(emptyHistory(), { kind: "place", index: 0, before: 0, after: 1 });
    undo(h);
    expect(h.past).toHaveLength(1);
  });

  it("redoes in LIFO order when multiple changes are on the redo stack", () => {
    let h = record(emptyHistory(), { kind: "place", index: 0, before: 0, after: 1 });
    h = record(h, { kind: "place", index: 1, before: 0, after: 2 });

    const back1 = undo(h)!;
    const back2 = undo(back1.history)!;

    const forward1 = redo(back2.history)!;
    expect(forward1.change).toEqual({ kind: "place", index: 0, before: 0, after: 1 });

    const forward2 = redo(forward1.history)!;
    expect(forward2.change).toEqual({ kind: "place", index: 1, before: 0, after: 2 });
    expect(redo(forward2.history)).toBeNull();
  });

  it("does not mutate record's input", () => {
    const h = record(emptyHistory(), { kind: "place", index: 0, before: 0, after: 1 });
    record(h, { kind: "place", index: 1, before: 0, after: 2 });
    expect(h.past).toHaveLength(1);
    expect(h.future).toHaveLength(0);
  });

  it("does not mutate redo's input", () => {
    const h = record(emptyHistory(), { kind: "place", index: 0, before: 0, after: 1 });
    const back = undo(h)!;
    redo(back.history);
    expect(back.history.future).toHaveLength(1);
    expect(back.history.past).toHaveLength(0);
  });

  it("records and undoes a strike change, round-tripping its digit and before/after flags", () => {
    // A strike Change carries a digit and boolean before/after rather than a
    // Cell — record/undo/redo must move it exactly as given, with no
    // assumption baked in that a Change is always a placement.
    const h = record(emptyHistory(), {
      kind: "strike",
      index: 12,
      digit: 7,
      before: false,
      after: true,
    });
    const back = undo(h);
    expect(back?.change).toEqual({ kind: "strike", index: 12, digit: 7, before: false, after: true });
    expect(back?.history.past).toHaveLength(0);

    const forward = redo(back!.history);
    expect(forward?.change).toEqual({ kind: "strike", index: 12, digit: 7, before: false, after: true });
  });

  it("interleaves placements and strikes in one LIFO stack, never conflating the two kinds", () => {
    // The bug this pins: if strikes lived outside history entirely, undoing
    // after several strikes would jump straight past all of them to revert
    // the last placement instead — exactly the surprise a widened Change
    // exists to prevent. This checks undo pops in true chronological order
    // regardless of which kind of change is on top.
    let h = record(emptyHistory(), { kind: "place", index: 0, before: 0, after: 5 });
    h = record(h, { kind: "strike", index: 1, digit: 3, before: false, after: true });
    h = record(h, { kind: "strike", index: 1, digit: 3, before: true, after: false });
    h = record(h, { kind: "place", index: 2, before: 0, after: 9 });

    const u1 = undo(h)!;
    expect(u1.change).toEqual({ kind: "place", index: 2, before: 0, after: 9 });

    const u2 = undo(u1.history)!;
    expect(u2.change).toEqual({ kind: "strike", index: 1, digit: 3, before: true, after: false });

    const u3 = undo(u2.history)!;
    expect(u3.change).toEqual({ kind: "strike", index: 1, digit: 3, before: false, after: true });

    const u4 = undo(u3.history)!;
    expect(u4.change).toEqual({ kind: "place", index: 0, before: 0, after: 5 });

    expect(undo(u4.history)).toBeNull();
  });

  it("undoes an auto-finish's several placements in one step, not one per cell", () => {
    // The whole point of bundling auto-finish into a single Change: if a
    // caller instead pushed one "place" per cell, `past` would hold N entries
    // here instead of one, and undoing once would only revert the last of
    // them — leaving the player partway through the auto-finish rather than
    // back where they were before it.
    const placements = [
      { index: 4, before: 0 as const, after: 6 as const },
      { index: 5, before: 0 as const, after: 1 as const },
      { index: 6, before: 0 as const, after: 3 as const },
    ];
    const h = record(emptyHistory(), { kind: "auto-finish", placements });
    expect(h.past).toHaveLength(1);

    const back = undo(h)!;
    expect(back.change).toEqual({ kind: "auto-finish", placements });
    expect(back.history.past).toHaveLength(0);
    // Nothing left to undo: no per-cell entries were ever pushed alongside it.
    expect(undo(back.history)).toBeNull();

    const forward = redo(back.history)!;
    expect(forward.change).toEqual({ kind: "auto-finish", placements });
    expect(redo(forward.history)).toBeNull();
  });

  it("does not conflate an auto-finish with a place or a strike sitting next to it", () => {
    let h = record(emptyHistory(), { kind: "place", index: 0, before: 0, after: 9 });
    h = record(h, {
      kind: "auto-finish",
      placements: [{ index: 1, before: 0, after: 2 }],
    });
    h = record(h, { kind: "strike", index: 3, digit: 5, before: false, after: true });

    const u1 = undo(h)!;
    expect(u1.change.kind).toBe("strike");
    const u2 = undo(u1.history)!;
    expect(u2.change.kind).toBe("auto-finish");
    const u3 = undo(u2.history)!;
    expect(u3.change).toEqual({ kind: "place", index: 0, before: 0, after: 9 });
    expect(undo(u3.history)).toBeNull();
  });
});
