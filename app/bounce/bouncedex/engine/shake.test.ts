import { describe, it, expect } from "vitest";
import { createWorld, shakeAt, SHAKE_TICKS, SHAKE_PEAK } from "./world";

const arena = { width: 400, height: 700 };
const fresh = () => createWorld({ arena, seed: 1 });

describe("shakeAt", () => {
  it("is silent with nothing happening", () => {
    expect(shakeAt(fresh())).toBe(0);
  });

  it("does not shake for ordinary hits, only kills", () => {
    const w = fresh();
    w.fx = [{ x: 10, y: 10, tick: 0, kind: "hit", value: 5 }];
    expect(shakeAt(w)).toBe(0);
  });

  it("kicks on a kill and decays away", () => {
    const w = fresh();
    w.fx = [{ x: 10, y: 10, tick: 0, kind: "kill", value: 5 }];
    const peak = shakeAt(w);
    expect(peak).toBeGreaterThan(0);

    w.tick = Math.floor(SHAKE_TICKS / 2);
    expect(shakeAt(w)).toBeLessThan(peak);

    w.tick = SHAKE_TICKS;
    expect(shakeAt(w)).toBe(0);
  });

  it("never exceeds the peak, however many kills land at once", () => {
    const w = fresh();
    // A big chain used to mean a bigger, permanent tremor.
    w.fx = Array.from({ length: 40 }, (_, i) => ({
      x: i, y: 0, tick: 0, kind: "kill" as const, value: 1,
    }));
    expect(shakeAt(w)).toBeLessThanOrEqual(SHAKE_PEAK);
    expect(SHAKE_PEAK).toBeLessThanOrEqual(3);
  });

  it("does not shake forever just because a combo is running", () => {
    // The old implementation was shake = min(combo, 6), applied every frame.
    const w = fresh();
    w.combo = 30;
    w.bestCombo = 30;
    expect(shakeAt(w)).toBe(0);
  });
});
