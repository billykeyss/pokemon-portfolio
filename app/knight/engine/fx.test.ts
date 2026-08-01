import { describe, it, expect } from "vitest";
import { createWorld } from "./world";
import { pushFx, expireFx, FX_TICKS, MAX_FX } from "./fx";

const arena = { width: 360, height: 560 };
const fresh = () => createWorld({ arena, seed: 1 });

describe("fx queue", () => {
  it("queues an effect", () => {
    const w = fresh();
    pushFx(w, { kind: "impact", x: 10, y: 20, angle: 0, tick: 0 });
    expect(w.fx).toHaveLength(1);
  });

  it("expires effects once they are older than FX_TICKS", () => {
    const w = fresh();
    pushFx(w, { kind: "impact", x: 10, y: 20, angle: 0, tick: 0 });
    w.tick = FX_TICKS + 1;
    expireFx(w);
    expect(w.fx).toHaveLength(0);
  });

  it("keeps effects that are still alive", () => {
    const w = fresh();
    pushFx(w, { kind: "impact", x: 10, y: 20, angle: 0, tick: 0 });
    w.tick = FX_TICKS - 1;
    expireFx(w);
    expect(w.fx).toHaveLength(1);
  });

  it("stays bounded under a flood", () => {
    const w = fresh();
    for (let i = 0; i < MAX_FX * 4; i++) {
      pushFx(w, { kind: "impact", x: i, y: 0, angle: 0, tick: 0 });
    }
    expect(w.fx.length).toBeLessThanOrEqual(MAX_FX);
  });

  it("drops the oldest first when full", () => {
    const w = fresh();
    for (let i = 0; i < MAX_FX + 1; i++) {
      pushFx(w, { kind: "impact", x: i, y: 0, angle: 0, tick: 0 });
    }
    expect(w.fx[0].x).not.toBe(0);
  });
});
