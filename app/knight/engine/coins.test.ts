import { describe, it, expect } from "vitest";
import { createWorld, spawnHero, spawnEnemy, stepWorld, FIXED_DT } from "./world";
import { dropCoins, updateCoins, sweepCoins, MAGNET_RADIUS } from "./coins";

const arena = { width: 360, height: 560 };

describe("coins", () => {
  it("drops the stated value, scaled by coinMult and floored at one", () => {
    const w = createWorld({ arena, seed: 1 });
    w.mods.coinMult = 1.35;
    dropCoins(w, { x: 100, y: 100 }, 2);
    expect(w.coins.reduce((n, c) => n + c.value, 0)).toBe(2); // floor(2 * 1.35)

    const w2 = createWorld({ arena, seed: 1 });
    w2.mods.coinMult = 0.01;
    dropCoins(w2, { x: 100, y: 100 }, 2);
    expect(w2.coins.reduce((n, c) => n + c.value, 0)).toBeGreaterThanOrEqual(1);
  });

  it("flies to a hero standing inside the magnet radius", () => {
    const w = createWorld({ arena, seed: 1 });
    const hero = spawnHero(w, { x: 180, y: 300 });
    dropCoins(w, { x: 180 + MAGNET_RADIUS - 10, y: 300 }, 1);

    for (let i = 0; i < 240 && w.coins.length > 0; i++) updateCoins(w, FIXED_DT);

    expect(w.coins).toHaveLength(0);
    expect(w.purse).toBe(1);
    expect(hero.hp).toBeGreaterThan(0);
  });

  it("ignores a hero far outside the magnet radius", () => {
    const w = createWorld({ arena, seed: 1 });
    spawnHero(w, { x: 30, y: 30 });
    dropCoins(w, { x: 330, y: 530 }, 1);

    for (let i = 0; i < 120; i++) updateCoins(w, FIXED_DT);

    expect(w.coins).toHaveLength(1);
    expect(w.purse).toBe(0);
  });

  it("sweeps every remaining coin into the purse", () => {
    const w = createWorld({ arena, seed: 1 });
    spawnHero(w, { x: 30, y: 30 });
    dropCoins(w, { x: 330, y: 530 }, 3);
    dropCoins(w, { x: 300, y: 500 }, 2);

    sweepCoins(w);

    expect(w.coins).toHaveLength(0);
    expect(w.purse).toBe(5);
  });

  it("credits the purse when an enemy dies in a real fight", () => {
    const w = createWorld({ arena, seed: 1 });
    spawnHero(w, { x: 180, y: 300 });
    spawnEnemy(w, { x: 205, y: 300 }, 10);

    for (let i = 0; i < 1200; i++) {
      stepWorld(w);
      if (!w.entities.some((e) => e.kind === "enemy" && e.deadAtTick < 0)) break;
    }
    sweepCoins(w);

    expect(w.purse).toBeGreaterThan(0);
  });
});
