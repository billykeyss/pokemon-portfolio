import { describe, it, expect } from "vitest";
import { createWorld, spawnHero, heroOf } from "./world";
import { levelFor } from "./level";
import { statsOf } from "./stats";
import { openShop, purchase } from "./shop";
import { defaultMods, UPGRADES } from "../data/upgrades";
import { beginRoom, settleClear, carryForward, freshCarry, healedHp, BASE_ROOM_HEAL } from "./run";

const arena = { width: 360, height: 560 };

describe("beginRoom", () => {
  // Regression coverage for the review's mutation 1: `page.tsx:52` assigning
  // fresh mods (`defaultMods()`) instead of `carry.mods` one line lower. Both
  // page.tsx and playRun call beginRoom now, so this single test guards both
  // call sites; a build carried into a room must be the build the room
  // starts with, not the default.
  it("seeds the world with the carried mods, not a fresh build", () => {
    const reach = UPGRADES.find((u) => u.id === "reach");
    if (!reach) throw new Error("expected a 'reach' upgrade in the catalogue");
    const carriedMods = reach.apply(defaultMods());

    const world = beginRoom(1, { mods: carriedMods, purse: 0, hp: Number.POSITIVE_INFINITY });

    expect(world.mods).toEqual(carriedMods);
    expect(world.mods).not.toEqual(defaultMods());
  });

  it("seeds the world with the carried purse", () => {
    const world = beginRoom(1, { mods: defaultMods(), purse: 42, hp: Number.POSITIVE_INFINITY });
    expect(world.purse).toBe(42);
  });

  it("clamps the carried hp to this room's max", () => {
    const world = beginRoom(1, { mods: defaultMods(), purse: 0, hp: 2 });
    expect(heroOf(world)?.hp).toBe(2);
  });

  it("spawns exactly the room's own enemies", () => {
    const world = beginRoom(3, freshCarry());
    const enemies = world.entities.filter((e) => e.kind === "enemy");
    expect(enemies).toHaveLength(levelFor(3).spawns.length);
  });
});

describe("carryForward", () => {
  it("carries a purchase's mods forward, not the mods the room started with", () => {
    const world = createWorld({ arena, seed: 1 });
    world.purse = 1000;
    const shop = openShop(1);
    const offer = shop.offers[0];

    expect(purchase(world, shop, 0)).toBe(true);

    const carry = carryForward(world);
    expect(carry.mods).toEqual(offer.upgrade.apply(defaultMods()));
    expect(carry.mods).not.toEqual(defaultMods());
  });

  it("reflects spent coins rather than refunding them", () => {
    const world = createWorld({ arena, seed: 1 });
    world.purse = 100;
    const shop = openShop(1);
    const price = shop.offers[0].price;

    purchase(world, shop, 0);

    expect(carryForward(world).purse).toBe(100 - price);
  });

  it("carries an undamaged hero's hp unchanged", () => {
    const world = createWorld({ arena, seed: 1 });
    const hero = spawnHero(world, { x: 100, y: 100 });
    hero.hp = 2;

    expect(carryForward(world).hp).toBe(2);
  });

  it("clamps hp to this world's own max, never handing back more than a room can hold", () => {
    const world = createWorld({ arena, seed: 1 });
    const hero = spawnHero(world, { x: 100, y: 100 });
    // Combat itself should never let hp exceed max, but the carried value
    // must not depend on that holding.
    hero.hp = statsOf(world).maxHp + 50;

    expect(carryForward(world).hp).toBe(statsOf(world).maxHp);
  });

  it("falls back to full HP when there is no hero to read", () => {
    const world = createWorld({ arena, seed: 1 });
    expect(carryForward(world).hp).toBe(statsOf(world).maxHp);
  });
});

describe("freshCarry", () => {
  it("returns the default mods and an empty purse", () => {
    expect(freshCarry().mods).toEqual(defaultMods());
    expect(freshCarry().purse).toBe(0);
  });

  it("carries hp unbounded, so any room's own clamp resolves it to full", () => {
    expect(freshCarry().hp).toBe(Number.POSITIVE_INFINITY);
    expect(Math.min(37, freshCarry().hp)).toBe(37);
  });
});

describe("healedHp", () => {
  it("leaves hp untouched when there is no mending", () => {
    expect(healedHp(3, 0, 5)).toBe(3);
  });

  it("adds exactly one heart for one stack of mending", () => {
    expect(healedHp(3, 1, 5)).toBe(4);
  });

  it("does not exceed max when mending at full health", () => {
    expect(healedHp(5, 1, 5)).toBe(5);
  });

  it("does not exceed a max that a heart purchase has raised", () => {
    const world = createWorld({ arena, seed: 1 });
    spawnHero(world, { x: 100, y: 100 });
    const baseMax = statsOf(world).maxHp;

    const heart = UPGRADES.find((u) => u.id === "heart");
    if (!heart) throw new Error("expected a 'heart' upgrade in the catalogue");
    world.mods = heart.apply(world.mods);
    const raisedMax = statsOf(world).maxHp;

    expect(raisedMax).toBeGreaterThan(baseMax);
    expect(healedHp(raisedMax - 1, 10, raisedMax)).toBe(raisedMax);
  });

  it("does not push a hero already above max any higher", () => {
    expect(healedHp(10, 1, 5)).toBe(10);
  });

  it("does not make a hero already above max worse either", () => {
    // Math.min(maxHp, hp + healOnClear) alone would *reduce* this case down
    // to maxHp — a defensive clamp turning into a damage source. It must not.
    expect(healedHp(10, 0, 5)).toBe(10);
  });
});

describe("BASE_ROOM_HEAL", () => {
  // The call sites (page.tsx and the ladder harness) never pass healOnClear
  // alone — they pass `BASE_ROOM_HEAL + world.mods.healOnClear`, so every
  // room clear heals at least this much even with no Mending purchased. This
  // is the floor that replaces the old full-heal-per-room behavior once hp
  // started carrying forward between rooms.
  it("is exactly one heart", () => {
    expect(BASE_ROOM_HEAL).toBe(1);
  });

  it("heals a room's worth even with no Mending bought", () => {
    expect(healedHp(3, BASE_ROOM_HEAL + 0, 5)).toBe(4);
  });

  it("lets Mending stack on top of the floor rather than replace it", () => {
    const mendStacks = 2;
    expect(healedHp(1, BASE_ROOM_HEAL + mendStacks, 5)).toBe(4);
  });

  it("still cannot push hp past this room's max", () => {
    expect(healedHp(5, BASE_ROOM_HEAL + 3, 5)).toBe(5);
  });
});

describe("settleClear", () => {
  // Regression coverage for the review's mutation 2: `page.tsx:145` deleting
  // the `sweepCoins(world)` call.
  it("banks every coin left on the floor", () => {
    const world = createWorld({ arena, seed: 1 });
    spawnHero(world, { x: 100, y: 100 });
    world.coins.push({ id: 1, pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, value: 7 });
    world.coins.push({ id: 2, pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, value: 3 });
    world.purse = 5;

    settleClear(world);

    expect(world.purse).toBe(5 + 7 + 3);
    expect(world.coins).toHaveLength(0);
  });

  // Regression coverage for the review's mutation 3: `page.tsx:149` healing
  // by `BASE_ROOM_HEAL` alone, dropping `world.mods.healOnClear` — which
  // would make every "Mending" purchase a no-op in practice.
  it("heals by the room-clear floor plus any purchased Mending, not the floor alone", () => {
    const world = createWorld({ arena, seed: 1 });
    const hero = spawnHero(world, { x: 100, y: 100 });
    hero.hp = 1;
    world.mods = { ...defaultMods(), healOnClear: 2 };

    settleClear(world);

    expect(hero.hp).toBe(1 + BASE_ROOM_HEAL + 2);
  });

  it("never heals past this room's current max", () => {
    const world = createWorld({ arena, seed: 1 });
    const hero = spawnHero(world, { x: 100, y: 100 });
    hero.hp = statsOf(world).maxHp - 1;
    world.mods = { ...defaultMods(), healOnClear: 99 };

    settleClear(world);

    expect(hero.hp).toBe(statsOf(world).maxHp);
  });

  it("does nothing when there is no hero on the world", () => {
    const world = createWorld({ arena, seed: 1 });
    world.coins.push({ id: 1, pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, value: 4 });
    expect(() => settleClear(world)).not.toThrow();
    expect(world.purse).toBe(4);
  });
});
