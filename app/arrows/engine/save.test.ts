import { describe, expect, it } from "vitest";
import type { StorageLike } from "@/app/game/_shared/storage";
import {
  ARROWS_SAVE_KEY,
  defaultArrowsSave,
  loadArrowsSave,
  migrateArrowsSave,
  writeArrowsSave,
} from "./save";

const memStorage = (seed: Record<string, string> = {}): StorageLike => {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
  };
};

describe("migrateArrowsSave", () => {
  it("coerces junk to defaults", () => {
    expect(migrateArrowsSave(null)).toEqual(defaultArrowsSave());
    expect(migrateArrowsSave([1])).toEqual(defaultArrowsSave());
    expect(migrateArrowsSave("nope")).toEqual(defaultArrowsSave());
  });

  it("keeps valid fields", () => {
    expect(
      migrateArrowsSave({ version: 1, level: 7, best: 9, missesByLevel: { 2: 0 } }),
    ).toEqual({ version: 1, level: 7, best: 9, missesByLevel: { 2: 0 } });
  });

  it("repairs a level below one", () => {
    expect(migrateArrowsSave({ level: 0 }).level).toBe(1);
    expect(migrateArrowsSave({ level: Number.NaN }).level).toBe(1);
  });

  it("never reports best below level", () => {
    expect(migrateArrowsSave({ level: 14, best: 2 }).best).toBe(14);
  });

  it("keeps a clean run recorded as zero misses", () => {
    // Zero is the best possible score, so it must survive the coercion that
    // rejects other falsy-looking values.
    expect(migrateArrowsSave({ missesByLevel: { 1: 0 } }).missesByLevel).toEqual({ 1: 0 });
  });

  it("drops nonsense miss entries", () => {
    expect(
      migrateArrowsSave({ missesByLevel: { 1: "x", 2: 2, 0: 3, bad: 1 } }).missesByLevel,
    ).toEqual({ 2: 2 });
  });
});

describe("loadArrowsSave / writeArrowsSave", () => {
  it("round-trips", () => {
    const storage = memStorage();
    const save = { ...defaultArrowsSave(), level: 6, best: 8 };
    writeArrowsSave(storage, save);
    expect(loadArrowsSave(storage)).toEqual(save);
  });

  it("returns defaults for an empty store", () => {
    expect(loadArrowsSave(memStorage())).toEqual(defaultArrowsSave());
  });

  it("returns defaults for a corrupt payload", () => {
    expect(loadArrowsSave(memStorage({ [ARROWS_SAVE_KEY]: "{" }))).toEqual(
      defaultArrowsSave(),
    );
  });

  it("does not collide with the other games' save keys", () => {
    for (const other of ["game:sort", "game:traffic", "game:shelf", "bounce:bouncedex"]) {
      expect(ARROWS_SAVE_KEY).not.toBe(other);
    }
  });
});
