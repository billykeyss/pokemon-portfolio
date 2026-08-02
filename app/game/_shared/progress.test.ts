import { describe, it, expect } from "vitest";
import { levelProgress, waveProgress, readProgress } from "./progress";
import type { StorageLike } from "./storage";

const store = (data: Record<string, string>): StorageLike => ({
  getItem: (k) => (k in data ? data[k] : null),
  setItem: () => {},
});

describe("levelProgress", () => {
  const src = levelProgress("game:sort");

  it("reports the level once you are past the first", () => {
    expect(readProgress(store({ "game:sort": '{"level":12}' }), src)).toBe("lv 12");
  });

  it("stays quiet on level 1 — that is not progress", () => {
    expect(readProgress(store({ "game:sort": '{"level":1}' }), src)).toBeNull();
  });

  it("is quiet when the game has never been opened", () => {
    expect(readProgress(store({}), src)).toBeNull();
  });

  it("survives a corrupt save rather than breaking the dashboard", () => {
    expect(readProgress(store({ "game:sort": "{not json" }), src)).toBeNull();
    expect(readProgress(store({ "game:sort": '"a string"' }), src)).toBeNull();
    expect(readProgress(store({ "game:sort": '{"level":"twelve"}' }), src)).toBeNull();
    expect(readProgress(store({ "game:sort": '{"level":-4}' }), src)).toBeNull();
  });

  it("survives storage being blocked entirely", () => {
    const hostile: StorageLike = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {},
    };
    expect(readProgress(hostile, src)).toBeNull();
  });
});

describe("waveProgress", () => {
  const src = waveProgress("bounce:bouncedex");

  it("reports the best wave reached", () => {
    expect(readProgress(store({ "bounce:bouncedex": '{"bestWave":31}' }), src)).toBe(
      "wave 31",
    );
  });

  it("is quiet before a first run", () => {
    expect(readProgress(store({ "bounce:bouncedex": '{"bestWave":0}' }), src)).toBeNull();
  });
});

describe("readProgress", () => {
  it("is quiet for a cabinet that keeps no progress", () => {
    expect(readProgress(store({}), undefined)).toBeNull();
  });
});
