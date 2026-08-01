import { describe, it, expect } from "vitest";
import {
  createWorld,
  spawnProjectile,
  spawnEnemy,
  stepWorld,
  isOverdrive,
  triggerOverdrive,
  OVERDRIVE_CHARGE,
  OVERDRIVE_TICKS,
  FX_TICKS,
} from "./world";

const arena = { width: 400, height: 700 };
const fresh = () => createWorld({ arena, seed: 1 });

describe("overdrive", () => {
  it("starts empty and idle", () => {
    const w = fresh();
    expect(w.overdrive).toBe(0);
    expect(isOverdrive(w)).toBe(false);
  });

  it("cannot be triggered before the meter is full", () => {
    const w = fresh();
    w.overdrive = OVERDRIVE_CHARGE - 1;
    expect(triggerOverdrive(w)).toBe(false);
    expect(isOverdrive(w)).toBe(false);
  });

  it("spends the meter and runs for a fixed window", () => {
    const w = fresh();
    w.overdrive = OVERDRIVE_CHARGE;
    expect(triggerOverdrive(w)).toBe(true);
    expect(w.overdrive).toBe(0);
    expect(isOverdrive(w)).toBe(true);

    w.tick = OVERDRIVE_TICKS + 1;
    expect(isOverdrive(w)).toBe(false);
  });

  it("cannot be double-triggered while already running", () => {
    const w = fresh();
    w.overdrive = OVERDRIVE_CHARGE;
    triggerOverdrive(w);
    w.overdrive = OVERDRIVE_CHARGE;
    expect(triggerOverdrive(w)).toBe(false);
  });

  it("fills as damage is dealt", () => {
    const w = fresh();
    const p = spawnProjectile(w, "boulder", { x: 200, y: 400 }, { x: 0, y: -500 });
    spawnEnemy(w, { x: 200, y: 350 }, 1e6, 16);
    for (let i = 0; i < 60; i++) stepWorld(w);
    expect(w.overdrive).toBeGreaterThan(0);
    void p;
  });

  it("makes the board fire dramatically faster while active", () => {
    const damageOver = (overdrive: boolean) => {
      const w = fresh();
      const p = spawnProjectile(w, "boulder", { x: 200, y: 300 }, { x: 0, y: 0 });
      p.settled = true;
      p.kind = "settled";
      const e = spawnEnemy(w, { x: 200, y: 360 }, 1e9, 14);
      if (overdrive) {
        w.overdrive = OVERDRIVE_CHARGE;
        triggerOverdrive(w);
      }
      for (let i = 0; i < 240; i++) stepWorld(w);
      return 1e9 - e.hp;
    };
    expect(damageOver(true)).toBeGreaterThan(damageOver(false) * 2);
  });
});

describe("fx", () => {
  it("queues a burst when an enemy dies", () => {
    const w = fresh();
    spawnProjectile(w, "boulder", { x: 200, y: 400 }, { x: 0, y: -500 });
    spawnEnemy(w, { x: 200, y: 350 }, 1, 14);
    for (let i = 0; i < 60; i++) stepWorld(w);
    expect(w.fx.some((f) => f.kind === "kill")).toBe(true);
  });

  it("expires effects rather than accumulating them forever", () => {
    const w = fresh();
    w.fx = [{ x: 10, y: 10, tick: 0, kind: "kill", value: 5 }];
    w.tick = FX_TICKS + 1;
    stepWorld(w);
    expect(w.fx).toHaveLength(0);
  });

  it("stays bounded under a heavy wave", () => {
    const w = fresh();
    for (let i = 0; i < 40; i++) {
      spawnProjectile(w, "boulder", { x: 40 + i * 8, y: 400 }, { x: 0, y: -500 });
      spawnEnemy(w, { x: 40 + i * 8, y: 350 }, 1, 14);
    }
    for (let i = 0; i < 120; i++) stepWorld(w);
    expect(w.fx.length).toBeLessThanOrEqual(60);
  });
});
