import { describe, it, expect } from "vitest";
import {
  defaultSave,
  loadSave,
  writeSave,
  migrate,
  SAVE_KEY,
  SAVE_VERSION,
  type StorageLike,
} from "./save";

function fakeStorage(
  initial: Record<string, string> = {},
): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

describe("save", () => {
  it("returns a default save when storage is empty", () => {
    expect(loadSave(fakeStorage())).toEqual(defaultSave());
  });

  it("round-trips a save", () => {
    const s = fakeStorage();
    const save = { ...defaultSave(), eggs: 12, dex: ["ember", "blaze"], bestWave: 9 };
    writeSave(s, save);
    expect(loadSave(s)).toEqual(save);
  });

  it("falls back to defaults on unparseable JSON rather than throwing", () => {
    const s = fakeStorage({ [SAVE_KEY]: "{not json" });
    expect(loadSave(s)).toEqual(defaultSave());
  });

  it("falls back to defaults when the payload is not an object", () => {
    const s = fakeStorage({ [SAVE_KEY]: '"a string"' });
    expect(loadSave(s)).toEqual(defaultSave());
  });

  it("repairs a save with missing fields", () => {
    const s = fakeStorage({
      [SAVE_KEY]: JSON.stringify({ version: SAVE_VERSION, eggs: 5 }),
    });
    const loaded = loadSave(s);
    expect(loaded.eggs).toBe(5);
    expect(loaded.dex).toEqual([]);
    expect(loaded.bestWave).toBe(0);
  });

  it("repairs fields of the wrong type", () => {
    const s = fakeStorage({
      [SAVE_KEY]: JSON.stringify({ version: SAVE_VERSION, eggs: "lots", dex: "nope" }),
    });
    const loaded = loadSave(s);
    expect(loaded.eggs).toBe(0);
    expect(loaded.dex).toEqual([]);
  });

  it("migrates an unversioned legacy save by treating it as fresh", () => {
    expect(migrate({ eggs: 3 }).version).toBe(SAVE_VERSION);
  });

  it("stamps the current version on write", () => {
    const s = fakeStorage();
    writeSave(s, { ...defaultSave(), version: 0 });
    expect(JSON.parse(s.data[SAVE_KEY]).version).toBe(SAVE_VERSION);
  });

  it("does not throw when storage rejects a write (private mode / quota)", () => {
    const hostile: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(() => writeSave(hostile, defaultSave())).not.toThrow();
  });
});
