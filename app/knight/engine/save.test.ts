import { describe, it, expect } from "vitest";
import { loadSave, writeSave, recordClear, defaultSave, KNIGHT_SAVE_KEY } from "./save";
import type { StorageLike } from "@/app/game/_shared/storage";

const store = (data: Record<string, string> = {}) => {
  const d = { ...data };
  return {
    d,
    io: { getItem: (k: string) => (k in d ? d[k] : null), setItem: (k: string, v: string) => { d[k] = v; } } as StorageLike,
  };
};

describe("knight save", () => {
  it("starts at level 1 with nothing cleared", () => {
    expect(loadSave(store().io)).toEqual(defaultSave());
  });

  it("round-trips", () => {
    const s = store();
    writeSave(s.io, { version: 1, level: 9, best: 8 });
    expect(loadSave(s.io)).toEqual({ version: 1, level: 9, best: 8 });
  });

  it("falls back to a fresh save rather than throwing", () => {
    for (const junk of ["{not json", '"a string"', "[]", '{"level":"nine"}', '{"level":-3}']) {
      expect(loadSave(store({ [KNIGHT_SAVE_KEY]: junk }).io).level).toBe(1);
    }
  });

  it("survives storage being blocked entirely", () => {
    const hostile: StorageLike = {
      getItem: () => { throw new Error("SecurityError"); },
      setItem: () => { throw new Error("SecurityError"); },
    };
    expect(loadSave(hostile)).toEqual(defaultSave());
    expect(() => writeSave(hostile, defaultSave())).not.toThrow();
  });
});

describe("recordClear", () => {
  it("unlocks the next level and remembers the deepest cleared", () => {
    expect(recordClear(defaultSave(), 1)).toMatchObject({ level: 2, best: 1 });
  });

  it("never walks progress backwards when replaying an early level", () => {
    const deep = { version: 1, level: 12, best: 11 };
    expect(recordClear(deep, 2)).toEqual(deep);
  });
});
