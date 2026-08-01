import { describe, expect, it } from "vitest";
import type { StorageLike } from "@/app/game/_shared/storage";
import {
  defaultTrafficSave,
  loadTrafficSave,
  migrateTrafficSave,
  TRAFFIC_SAVE_KEY,
  writeTrafficSave,
} from "./save";

const memStorage = (seed: Record<string, string> = {}): StorageLike => {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
  };
};

describe("migrateTrafficSave", () => {
  it("coerces junk to defaults", () => {
    expect(migrateTrafficSave(null)).toEqual(defaultTrafficSave());
    expect(migrateTrafficSave([1, 2])).toEqual(defaultTrafficSave());
    expect(migrateTrafficSave("nope")).toEqual(defaultTrafficSave());
  });

  it("keeps valid fields", () => {
    const save = migrateTrafficSave({
      version: 1,
      level: 8,
      best: 12,
      movesByLevel: { 3: 7 },
    });
    expect(save).toEqual({
      version: 1,
      level: 8,
      best: 12,
      movesByLevel: { 3: 7 },
    });
  });

  it("repairs a level below one", () => {
    expect(migrateTrafficSave({ level: 0 }).level).toBe(1);
    expect(migrateTrafficSave({ level: Number.NaN }).level).toBe(1);
  });

  it("never reports best below level", () => {
    expect(migrateTrafficSave({ level: 15, best: 2 }).best).toBe(15);
  });

  it("drops nonsense move counts", () => {
    expect(
      migrateTrafficSave({ movesByLevel: { 1: "x", 2: 4, 0: 3, bad: 1 } }).movesByLevel,
    ).toEqual({ 2: 4 });
  });
});

describe("loadTrafficSave / writeTrafficSave", () => {
  it("round-trips", () => {
    const storage = memStorage();
    const save = { ...defaultTrafficSave(), level: 5, best: 9 };
    writeTrafficSave(storage, save);
    expect(loadTrafficSave(storage)).toEqual(save);
  });

  it("returns defaults for an empty store", () => {
    expect(loadTrafficSave(memStorage())).toEqual(defaultTrafficSave());
  });

  it("returns defaults for a corrupt payload", () => {
    expect(loadTrafficSave(memStorage({ [TRAFFIC_SAVE_KEY]: "{oops" }))).toEqual(
      defaultTrafficSave(),
    );
  });

  it("does not collide with the other games' save keys", () => {
    expect(TRAFFIC_SAVE_KEY).not.toBe("game:sort");
    expect(TRAFFIC_SAVE_KEY).not.toBe("bounce:bouncedex");
  });
});
