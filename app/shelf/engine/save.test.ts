import { describe, expect, it } from "vitest";
import type { StorageLike } from "@/app/game/_shared/storage";
import {
  defaultShelfSave,
  loadShelfSave,
  migrateShelfSave,
  SHELF_SAVE_KEY,
  writeShelfSave,
} from "./save";

const memStorage = (seed: Record<string, string> = {}): StorageLike => {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
  };
};

describe("migrateShelfSave", () => {
  it("coerces junk to defaults", () => {
    expect(migrateShelfSave(null)).toEqual(defaultShelfSave());
    expect(migrateShelfSave([3])).toEqual(defaultShelfSave());
    expect(migrateShelfSave("x")).toEqual(defaultShelfSave());
  });

  it("keeps valid fields", () => {
    expect(
      migrateShelfSave({ version: 1, level: 6, best: 9, movesByLevel: { 2: 11 } }),
    ).toEqual({ version: 1, level: 6, best: 9, movesByLevel: { 2: 11 } });
  });

  it("repairs a level below one", () => {
    expect(migrateShelfSave({ level: 0 }).level).toBe(1);
  });

  it("never reports best below level", () => {
    expect(migrateShelfSave({ level: 12, best: 4 }).best).toBe(12);
  });

  it("drops nonsense move counts", () => {
    expect(migrateShelfSave({ movesByLevel: { 1: null, 2: 8 } }).movesByLevel).toEqual({
      2: 8,
    });
  });
});

describe("loadShelfSave / writeShelfSave", () => {
  it("round-trips", () => {
    const storage = memStorage();
    const save = { ...defaultShelfSave(), level: 4, best: 7 };
    writeShelfSave(storage, save);
    expect(loadShelfSave(storage)).toEqual(save);
  });

  it("returns defaults for an empty store", () => {
    expect(loadShelfSave(memStorage())).toEqual(defaultShelfSave());
  });

  it("returns defaults for a corrupt payload", () => {
    expect(loadShelfSave(memStorage({ [SHELF_SAVE_KEY]: "{" }))).toEqual(
      defaultShelfSave(),
    );
  });

  it("does not collide with the other games' save keys", () => {
    expect(SHELF_SAVE_KEY).not.toBe("game:sort");
    expect(SHELF_SAVE_KEY).not.toBe("game:traffic");
  });
});
