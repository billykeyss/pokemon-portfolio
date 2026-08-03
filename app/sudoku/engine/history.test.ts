import { describe, expect, it } from "vitest";
import { emptyHistory, record, redo, undo } from "./history";

describe("history", () => {
  it("has nothing to undo when empty", () => {
    expect(undo(emptyHistory())).toBeNull();
    expect(redo(emptyHistory())).toBeNull();
  });

  it("undoes the most recent change first", () => {
    let h = record(emptyHistory(), { index: 0, before: 0, after: 5 });
    h = record(h, { index: 1, before: 0, after: 3 });

    const first = undo(h);
    expect(first?.change).toEqual({ index: 1, before: 0, after: 3 });

    const second = undo(first!.history);
    expect(second?.change).toEqual({ index: 0, before: 0, after: 5 });
    expect(undo(second!.history)).toBeNull();
  });

  it("redoes what it undid", () => {
    const h = record(emptyHistory(), { index: 4, before: 0, after: 9 });
    const back = undo(h)!;
    const forward = redo(back.history)!;
    expect(forward.change).toEqual({ index: 4, before: 0, after: 9 });
    expect(redo(forward.history)).toBeNull();
  });

  it("drops the redo stack once a new change is recorded", () => {
    const h = record(emptyHistory(), { index: 0, before: 0, after: 1 });
    const back = undo(h)!;
    const diverged = record(back.history, { index: 2, before: 0, after: 7 });
    expect(redo(diverged)).toBeNull();
  });

  it("does not mutate the history it is given", () => {
    const h = record(emptyHistory(), { index: 0, before: 0, after: 1 });
    undo(h);
    expect(h.past).toHaveLength(1);
  });

  it("redoes in LIFO order when multiple changes are on the redo stack", () => {
    let h = record(emptyHistory(), { index: 0, before: 0, after: 1 });
    h = record(h, { index: 1, before: 0, after: 2 });

    const back1 = undo(h)!;
    const back2 = undo(back1.history)!;

    const forward1 = redo(back2.history)!;
    expect(forward1.change).toEqual({ index: 0, before: 0, after: 1 });

    const forward2 = redo(forward1.history)!;
    expect(forward2.change).toEqual({ index: 1, before: 0, after: 2 });
    expect(redo(forward2.history)).toBeNull();
  });

  it("does not mutate record's input", () => {
    const h = record(emptyHistory(), { index: 0, before: 0, after: 1 });
    const h2 = record(h, { index: 1, before: 0, after: 2 });
    expect(h.past).toHaveLength(1);
    expect(h.future).toHaveLength(0);
  });

  it("does not mutate redo's input", () => {
    const h = record(emptyHistory(), { index: 0, before: 0, after: 1 });
    const back = undo(h)!;
    redo(back.history);
    expect(back.history.future).toHaveLength(1);
    expect(back.history.past).toHaveLength(0);
  });
});
