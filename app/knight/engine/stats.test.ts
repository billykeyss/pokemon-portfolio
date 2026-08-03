import { describe, it, expect } from "vitest";
import { createWorld, spawnHero, spawnEnemy, stepWorld } from "./world";
import { BASE_STATS, statsOf } from "./stats";

const arena = { width: 360, height: 560 };

describe("statsOf", () => {
  it("returns the base numbers for an unmodified run", () => {
    const w = createWorld({ arena, seed: 1 });
    expect(statsOf(w)).toEqual(BASE_STATS);
  });

  // Regression guard: BASE_STATS is built by reading consts imported from
  // other engine modules. A circular import between two of them once left a
  // value unresolved at module-load time, silently producing NaN rather than
  // throwing — and `toEqual`/`toBe` use Object.is semantics, under which
  // NaN === NaN, so none of the assertions above would have caught it. This
  // checks every field explicitly and covers fields added later for free.
  it("every field of BASE_STATS is a finite number", () => {
    for (const [key, value] of Object.entries(BASE_STATS)) {
      expect(Number.isFinite(value), `${key} should be finite, got ${value}`).toBe(true);
    }
  });

  it("adds flat bonuses", () => {
    const w = createWorld({ arena, seed: 1 });
    w.mods.reachBonus = 16;
    w.mods.damageBonus = 4;
    w.mods.maxHpBonus = 2;
    w.mods.iframeBonus = 8;

    const s = statsOf(w);
    expect(s.reach).toBe(BASE_STATS.reach + 16);
    expect(s.damage).toBe(BASE_STATS.damage + 4);
    expect(s.maxHp).toBe(BASE_STATS.maxHp + 2);
    expect(s.iframeTicks).toBe(BASE_STATS.iframeTicks + 8);
  });

  it("applies multipliers", () => {
    const w = createWorld({ arena, seed: 1 });
    w.mods.moveSpeedMult = 1.25;
    w.mods.knockbackMult = 2;
    w.mods.coinMult = 1.5;

    const s = statsOf(w);
    expect(s.moveSpeed).toBeCloseTo(BASE_STATS.moveSpeed * 1.25, 5);
    expect(s.knockback).toBeCloseTo(BASE_STATS.knockback * 2, 5);
    expect(s.coinMult).toBeCloseTo(1.5, 5);
  });

  it("keeps swing timings whole ticks and never lets a phase vanish", () => {
    const w = createWorld({ arena, seed: 1 });
    w.mods.swingSpeedMult = 0.01; // absurd on purpose

    const s = statsOf(w);
    for (const t of [s.windupTicks, s.activeTicks, s.recoverTicks]) {
      expect(Number.isInteger(t)).toBe(true);
      expect(t).toBeGreaterThanOrEqual(1);
    }
  });

  it("never returns a negative or zero-length reach", () => {
    const w = createWorld({ arena, seed: 1 });
    w.mods.reachBonus = -1000;
    expect(statsOf(w).reach).toBeGreaterThan(0);
  });

  it("rounds a fractional iframeBonus to a whole tick count", () => {
    const w = createWorld({ arena, seed: 1 });
    w.mods.iframeBonus = 0.5;
    expect(Number.isInteger(statsOf(w).iframeTicks)).toBe(true);
    expect(statsOf(w).iframeTicks).toBe(Math.round(BASE_STATS.iframeTicks + 0.5));
  });
});

describe("the engine actually reads Stats", () => {
  it("spawns the hero with the modified max HP", () => {
    const w = createWorld({ arena, seed: 1 });
    w.mods.maxHpBonus = 3;
    const hero = spawnHero(w, { x: 180, y: 470 });
    expect(hero.maxHp).toBe(BASE_STATS.maxHp + 3);
    expect(hero.hp).toBe(BASE_STATS.maxHp + 3);
  });

  it("deals the modified damage", () => {
    const w = createWorld({ arena, seed: 1 });
    w.mods.damageBonus = 7;
    spawnHero(w, { x: 180, y: 300 });
    const foe = spawnEnemy(w, { x: 210, y: 300 }, 500);

    const before = foe.hp;
    for (let i = 0; i < 40; i++) {
      foe.pos.x = 210;
      foe.pos.y = 300;
      foe.vel.x = 0;
      foe.vel.y = 0;
      stepWorld(w);
      if (foe.hp < before) break;
    }

    expect(before - foe.hp).toBe(BASE_STATS.damage + 7);
  });

  it("swings faster with a lower swingSpeedMult", () => {
    const cycle = (mult: number): number => {
      const w = createWorld({ arena, seed: 1 });
      w.mods.swingSpeedMult = mult;
      const hero = spawnHero(w, { x: 180, y: 300 });
      const foe = spawnEnemy(w, { x: 210, y: 300 }, 100000);

      let swings = 0;
      let prev = hero.attack.phase;
      for (let i = 0; i < 1200; i++) {
        foe.pos.x = 210;
        foe.pos.y = 300;
        foe.vel.x = 0;
        foe.vel.y = 0;
        stepWorld(w);
        if (prev !== "windup" && hero.attack.phase === "windup") swings++;
        prev = hero.attack.phase;
      }
      return swings;
    };

    expect(cycle(0.5)).toBeGreaterThan(cycle(1));
  });
});
