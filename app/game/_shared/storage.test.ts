import { describe, expect, it } from "vitest";
import { readJson, writeJson, type StorageLike } from "./storage";

function memStorage(seed: Record<string, string> = {}): StorageLike {
  const map = new Map(Object.entries(seed));
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
  };
}

const throwingStorage: StorageLike = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("quota");
  },
};

describe("readJson", () => {
  it("parses a stored payload", () => {
    expect(readJson(memStorage({ k: '{"a":1}' }), "k")).toEqual({ a: 1 });
  });

  it("returns null for a missing key", () => {
    expect(readJson(memStorage(), "k")).toBeNull();
  });

  it("returns null for malformed JSON rather than throwing", () => {
    expect(readJson(memStorage({ k: "{oops" }), "k")).toBeNull();
  });

  it("returns null when storage itself throws", () => {
    expect(readJson(throwingStorage, "k")).toBeNull();
  });
});

describe("writeJson", () => {
  it("round-trips through readJson", () => {
    const s = memStorage();
    writeJson(s, "k", { a: 1 });
    expect(readJson(s, "k")).toEqual({ a: 1 });
  });

  it("swallows storage failures", () => {
    expect(() => writeJson(throwingStorage, "k", { a: 1 })).not.toThrow();
  });
});
