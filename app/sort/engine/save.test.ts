import { describe, expect, it } from "vitest";
import type { StorageLike } from "@/app/game/_shared/storage";
import {
  defaultSortSave,
  loadSortSave,
  migrateSortSave,
  SORT_SAVE_KEY,
  writeSortSave,
} from "./save";

const memStorage = (seed: Record<string, string> = {}): StorageLike => {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
  };
};

describe("defaultSortSave", () => {
  it("starts on level one with nothing beaten", () => {
    const s = defaultSortSave();
    expect(s.level).toBe(1);
    expect(s.best).toBe(1);
    expect(s.movesByLevel).toEqual({});
  });

  it("starts at normal speed", () => {
    expect(defaultSortSave().speed).toBe(1);
  });
});

describe("migrateSortSave", () => {
  it("coerces null to defaults", () => {
    expect(migrateSortSave(null)).toEqual(defaultSortSave());
  });

  it("coerces an array to defaults", () => {
    expect(migrateSortSave([1, 2, 3])).toEqual(defaultSortSave());
  });

  it("coerces a string to defaults", () => {
    expect(migrateSortSave("nope")).toEqual(defaultSortSave());
  });

  it("keeps valid fields", () => {
    const s = migrateSortSave({
      version: 1,
      level: 12,
      best: 14,
      movesByLevel: { 1: 9 },
      speed: 2,
    });
    expect(s.level).toBe(12);
    expect(s.best).toBe(14);
    expect(s.movesByLevel).toEqual({ 1: 9 });
    expect(s.speed).toBe(2);
  });

  it("repairs a level below one", () => {
    expect(migrateSortSave({ level: 0 }).level).toBe(1);
    expect(migrateSortSave({ level: -3 }).level).toBe(1);
    expect(migrateSortSave({ level: Number.NaN }).level).toBe(1);
  });

  it("never reports best below level", () => {
    expect(migrateSortSave({ level: 20, best: 3 }).best).toBe(20);
  });

  it("drops non-numeric and negative move counts", () => {
    expect(
      migrateSortSave({ movesByLevel: { 1: "nope", 2: 5, 3: -1 } }).movesByLevel,
    ).toEqual({ 2: 5 });
  });

  it("drops move counts keyed by nonsense", () => {
    expect(migrateSortSave({ movesByLevel: { abc: 5 } }).movesByLevel).toEqual({});
  });

  it("drops a stale glyph flag from an older save", () => {
    // The overlay is gone; a save written before that must still load.
    const s = migrateSortSave({ level: 3, symbols: true, speed: 2 });
    expect(s).not.toHaveProperty("symbols");
    expect(s.level).toBe(3);
  });

  it("falls back on a bogus speed", () => {
    expect(migrateSortSave({ speed: 99 }).speed).toBe(defaultSortSave().speed);
  });
});

describe("loadSortSave / writeSortSave", () => {
  it("round-trips", () => {
    const storage = memStorage();
    const save = { ...defaultSortSave(), level: 7, best: 9 };
    writeSortSave(storage, save);
    expect(loadSortSave(storage)).toEqual(save);
  });

  it("returns defaults for an empty store", () => {
    expect(loadSortSave(memStorage())).toEqual(defaultSortSave());
  });

  it("returns defaults for a corrupt payload", () => {
    expect(loadSortSave(memStorage({ [SORT_SAVE_KEY]: "{broken" }))).toEqual(
      defaultSortSave(),
    );
  });

  it("does not collide with the bouncedex save key", () => {
    expect(SORT_SAVE_KEY).not.toBe("bounce:bouncedex");
  });
});
