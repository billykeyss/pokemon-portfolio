import { describe, it, expect } from "vitest";
import {
  createWorld,
  spawnProjectile,
  spawnEnemy,
  stepWorld,
  STICKY_INTERVAL_TICKS,
  BOMB_RADIUS,
  DETONATE_RADIUS,
} from "./world";
import { defaultMods } from "../data/upgrades";

const arena = { width: 400, height: 700 };
const fresh = () => createWorld({ arena, seed: 1 });

/** Run until `pred` holds or `limit` steps elapse. Returns steps taken. */
function stepUntil(w: ReturnType<typeof fresh>, pred: () => boolean, limit = 600) {
  for (let i = 0; i < limit; i++) {
    if (pred()) return i;
    stepWorld(w);
  }
  return -1;
}

describe("ghost", () => {
  it("phases through the first enemy instead of bouncing off it", () => {
    const w = fresh();
    // "wisp" is the ghost base critter.
    const g = spawnProjectile(w, "wisp", { x: 200, y: 400 }, { x: 0, y: -300 });
    const e = spawnEnemy(w, { x: 200, y: 360 }, 10000, 14);

    stepUntil(w, () => e.hp < 10000, 60);

    expect(e.hp, "ghost should still damage what it phases through").toBeLessThan(10000);
    expect(g.vel.y, "ghost should keep travelling upward, not rebound").toBeLessThan(0);
  });

  it("collides normally once its phase charge is spent", () => {
    const w = fresh();
    const g = spawnProjectile(w, "wisp", { x: 200, y: 400 }, { x: 0, y: -300 });
    expect(g.phasesLeft).toBe(1);

    const first = spawnEnemy(w, { x: 200, y: 370 }, 10000, 14);
    stepUntil(w, () => g.phasesLeft === 0, 120);
    expect(g.phasesLeft).toBe(0);
    expect(first.hp).toBeLessThan(10000);
  });

  it("gives non-ghost critters no phase charges", () => {
    const w = fresh();
    expect(spawnProjectile(w, "boulder", { x: 200, y: 400 }, { x: 0, y: -1 }).phasesLeft).toBe(0);
  });
});

describe("magnet", () => {
  it("curves mid-flight toward an off-axis enemy", () => {
    const w = fresh();
    // "lodestone" is the magnet base critter, fired straight up.
    const m = spawnProjectile(w, "lodestone", { x: 200, y: 500 }, { x: 0, y: -260 });
    spawnEnemy(w, { x: 330, y: 300 }, 10000, 14);

    for (let i = 0; i < 40; i++) stepWorld(w);
    expect(m.vel.x, "should have acquired rightward velocity toward the enemy").toBeGreaterThan(5);
  });

  it("leaves non-magnet critters flying straight", () => {
    const w = fresh();
    const p = spawnProjectile(w, "boulder", { x: 200, y: 500 }, { x: 0, y: -260 });
    spawnEnemy(w, { x: 330, y: 300 }, 10000, 14);

    for (let i = 0; i < 40; i++) stepWorld(w);
    expect(Math.abs(p.vel.x)).toBeLessThan(1);
  });
});

describe("splitter", () => {
  it("bursts into two extra bodies on its first enemy hit", () => {
    const w = fresh();
    // "kernel" is the splitter base critter.
    spawnProjectile(w, "kernel", { x: 200, y: 400 }, { x: 0, y: -400 });
    const e = spawnEnemy(w, { x: 200, y: 360 }, 10000, 14);

    const before = w.bodies.length;
    stepUntil(w, () => e.hp < 10000, 60);
    stepWorld(w);

    expect(w.bodies.length).toBe(before + 2);
  });

  it("does not let the fragments split again", () => {
    const w = fresh();
    spawnProjectile(w, "kernel", { x: 200, y: 400 }, { x: 0, y: -400 });
    const e = spawnEnemy(w, { x: 200, y: 360 }, 100000, 14);

    stepUntil(w, () => e.hp < 100000, 60);
    for (let i = 0; i < 200; i++) stepWorld(w);

    // One parent + two fragments; a recursive split would blow this up.
    const kernels = w.bodies.filter((b) => b.critterId === "kernel");
    expect(kernels.length).toBeLessThanOrEqual(3);
    expect(kernels.every((k) => k.hasSplit)).toBe(true);
  });
});

describe("sticky", () => {
  it("latches onto the enemy it hits and rides along with it", () => {
    const w = fresh();
    // "gloop" is the sticky base critter.
    const s = spawnProjectile(w, "gloop", { x: 200, y: 400 }, { x: 0, y: -400 });
    const e = spawnEnemy(w, { x: 200, y: 360 }, 100000, 14);

    stepUntil(w, () => s.attachedTo !== null, 120);
    expect(s.attachedTo).toBe(e.id);

    for (let i = 0; i < 60; i++) stepWorld(w);
    expect(s.pos.x).toBeCloseTo(e.pos.x, 0);
    expect(s.pos.y).toBeCloseTo(e.pos.y, 0);
  });

  it("keeps damaging its host over time", () => {
    const w = fresh();
    const s = spawnProjectile(w, "gloop", { x: 200, y: 400 }, { x: 0, y: -400 });
    const e = spawnEnemy(w, { x: 200, y: 360 }, 100000, 14);

    stepUntil(w, () => s.attachedTo !== null, 120);
    const atAttach = e.hp;
    for (let i = 0; i < STICKY_INTERVAL_TICKS * 3; i++) stepWorld(w);
    expect(e.hp).toBeLessThan(atAttach);
  });

  it("settles in place once its host dies", () => {
    const w = fresh();
    const s = spawnProjectile(w, "gloop", { x: 200, y: 400 }, { x: 0, y: -400 });
    spawnEnemy(w, { x: 200, y: 360 }, 12, 14);

    stepUntil(w, () => s.settled, 600);
    expect(s.settled).toBe(true);
    expect(s.attachedTo).toBeNull();
  });
});

describe("bomb", () => {
  it("damages every enemy in its blast radius when it settles", () => {
    const w = fresh();
    // "fuse" is the bomb base critter; nudged so it settles almost immediately.
    spawnProjectile(w, "fuse", { x: 200, y: 300 }, { x: 1, y: 1 });
    const near = spawnEnemy(w, { x: 200 + BOMB_RADIUS * 0.5, y: 300 }, 100000, 14);
    const far = spawnEnemy(w, { x: 200 + BOMB_RADIUS * 3, y: 300 }, 100000, 14);

    stepWorld(w);

    expect(near.hp).toBeLessThan(100000);
    expect(far.hp).toBe(100000);
  });

  it("leaves the critter behind as a bumper after detonating", () => {
    const w = fresh();
    const b = spawnProjectile(w, "fuse", { x: 200, y: 300 }, { x: 1, y: 1 });
    stepWorld(w);
    expect(b.settled).toBe(true);
    expect(w.bodies).toContain(b);
  });
});

describe("upgrade: HARD LANDING (detonateOnSettle)", () => {
  it("makes an ordinary critter explode on settle", () => {
    const w = fresh();
    w.mods = { ...defaultMods(), detonateOnSettle: true };
    spawnProjectile(w, "ember", { x: 200, y: 300 }, { x: 1, y: 1 });
    const e = spawnEnemy(w, { x: 200 + DETONATE_RADIUS * 0.5, y: 300 }, 100000, 14);

    stepWorld(w);
    expect(e.hp).toBeLessThan(100000);
  });

  it("does nothing without the upgrade", () => {
    const w = fresh();
    spawnProjectile(w, "ember", { x: 200, y: 300 }, { x: 1, y: 1 });
    const e = spawnEnemy(w, { x: 200 + DETONATE_RADIUS * 0.5, y: 300 }, 100000, 14);

    stepWorld(w);
    expect(e.hp).toBe(100000);
  });
});

describe("upgrade: RUBBER WALLS (wallRestitution)", () => {
  it("rebounds faster off a wall than without the upgrade", () => {
    const speedAfterBounce = (wallRestitution: number) => {
      const w = fresh();
      w.mods = { ...defaultMods(), wallRestitution };
      const p = spawnProjectile(w, "boulder", { x: 20, y: 300 }, { x: -600, y: 0 });
      stepUntil(w, () => p.vel.x > 0, 60);
      return p.vel.x;
    };
    expect(speedAfterBounce(1.5)).toBeGreaterThan(speedAfterBounce(1));
  });

  it("never exceeds a perfectly elastic bounce", () => {
    const w = fresh();
    w.mods = { ...defaultMods(), wallRestitution: 99 };
    const p = spawnProjectile(w, "pip", { x: 12, y: 300 }, { x: -600, y: 0 });
    stepUntil(w, () => p.vel.x > 0, 60);
    expect(p.vel.x).toBeLessThanOrEqual(600);
  });
});

describe("upgrade: SHARP EDGES (damageMult)", () => {
  it("increases damage dealt", () => {
    const damageWith = (damageMult: number) => {
      const w = fresh();
      w.mods = { ...defaultMods(), damageMult };
      spawnProjectile(w, "boulder", { x: 200, y: 400 }, { x: 0, y: -400 });
      const e = spawnEnemy(w, { x: 200, y: 360 }, 100000, 14);
      stepUntil(w, () => e.hp < 100000, 60);
      return 100000 - e.hp;
    };
    expect(damageWith(2)).toBeGreaterThan(damageWith(1));
  });
});

describe("charged shots", () => {
  it("stays in play far longer than an uncharged shot", () => {
    const settleTime = (charge: number) => {
      const w = fresh();
      const p = spawnProjectile(w, "pebble", { x: 200, y: 650 }, { x: 160, y: -560 }, charge);
      let t = 0;
      while (!p.settled && t < 4000) {
        stepWorld(w);
        t += 1;
      }
      return t;
    };
    expect(settleTime(1)).toBeGreaterThan(settleTime(0) * 1.5);
  });

  it("racks up a bigger chain across a realistic spread of enemies", () => {
    const chainFor = (charge: number) => {
      const w = fresh();
      // Spread out like an actual wave. A packed lattice would just trap the
      // projectile, measuring nothing about how far it travels.
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 5; col++) {
          spawnEnemy(w, { x: 50 + col * 75, y: 140 + row * 110 }, 1e9, 14);
        }
      }
      const p = spawnProjectile(w, "pebble", { x: 200, y: 660 }, { x: 120, y: -540 }, charge);
      for (let i = 0; i < 2400 && !p.settled; i++) stepWorld(w);
      return p.chain;
    };
    const hot = chainFor(1);
    const cold = chainFor(0);
    expect(hot, `charged ${hot} vs uncharged ${cold}`).toBeGreaterThan(cold);
  });

  it("leaves uncharged shots exactly as they were", () => {
    const w = fresh();
    const p = spawnProjectile(w, "pebble", { x: 200, y: 650 }, { x: 0, y: -400 });
    expect(p.charge).toBe(0);
  });
});
