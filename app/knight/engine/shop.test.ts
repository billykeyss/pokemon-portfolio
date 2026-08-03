import { describe, it, expect } from "vitest";
import { createWorld } from "./world";
import { defaultMods } from "../data/upgrades";
import { openShop, purchase, reroll, rerollCost, type Offer } from "./shop";

const arena = { width: 360, height: 560 };

/** Order doesn't matter to the player: canonicalize to a sorted id string so
 *  a reshuffled-but-identical shop still reads as "the same set". Holes
 *  (bought slots) contribute no id. */
function idsOf(offers: readonly (Offer | undefined)[]): string {
  return offers
    .filter((o): o is Offer => o !== undefined)
    .map((o) => o.upgrade.id)
    .sort()
    .join(",");
}

describe("the shop", () => {
  it("opens with three priced offers", () => {
    const shop = openShop(3);
    expect(shop.offers).toHaveLength(3);
    for (const o of shop.offers) expect(o.price).toBe(o.upgrade.price);
    expect(shop.rerolls).toBe(0);
  });

  it("offers the same things for the same level", () => {
    expect(openShop(4).offers.map((o) => o.upgrade.id)).toEqual(
      openShop(4).offers.map((o) => o.upgrade.id),
    );
  });

  it("prices rerolls at five, rising by three each time", () => {
    expect(rerollCost(0)).toBe(5);
    expect(rerollCost(1)).toBe(8);
    expect(rerollCost(2)).toBe(11);
  });

  it("buys an affordable upgrade, spending the coins and applying the mod", () => {
    const w = createWorld({ arena, seed: 1 });
    w.purse = 100;
    const shop = openShop(2);
    const price = shop.offers[0].price;

    expect(purchase(w, shop, 0)).toBe(true);
    expect(w.purse).toBe(100 - price);
    expect(w.mods).not.toEqual(defaultMods());
    expect(shop.offers[0]).toBeUndefined();
  });

  it("refuses an upgrade it cannot afford and changes nothing", () => {
    const w = createWorld({ arena, seed: 1 });
    w.purse = 1;
    const shop = openShop(2);

    expect(purchase(w, shop, 0)).toBe(false);
    expect(w.purse).toBe(1);
    expect(w.mods).toEqual(defaultMods());
    expect(shop.offers).toHaveLength(3);
  });

  it("refuses an out-of-range or already-bought slot", () => {
    const w = createWorld({ arena, seed: 1 });
    w.purse = 1000;
    const shop = openShop(2);

    expect(purchase(w, shop, 99)).toBe(false);
    expect(purchase(w, shop, -1)).toBe(false);
    expect(purchase(w, shop, 0)).toBe(true);
    expect(purchase(w, shop, 0)).toBe(false); // that slot is spent
  });

  it("rerolls for coins and updates the reroll counter", () => {
    const w = createWorld({ arena, seed: 1 });
    w.purse = 50;
    const shop = openShop(2);

    expect(reroll(w, shop, 2)).toBe(true);
    expect(w.purse).toBe(50 - 5);
    expect(shop.rerolls).toBe(1);
  });

  it("refuses a reroll it cannot afford", () => {
    const w = createWorld({ arena, seed: 1 });
    w.purse = 2;
    const shop = openShop(2);
    const before = shop.offers.map((o) => o.upgrade.id);

    expect(reroll(w, shop, 2)).toBe(false);
    expect(w.purse).toBe(2);
    expect(shop.offers.map((o) => o.upgrade.id)).toEqual(before);
  });

  // Regression for a Critical finding: with 8 upgrades and 3 draws there are
  // only 56 unordered outcomes, so XOR-ing a small offset into the seed
  // collides by the birthday paradox — a reroll could reproduce the exact
  // set (same ids, any order) it just replaced. A single-level sample (as
  // this file had before) cannot catch that; only a sweep can. This sweep
  // reproduced 61 first-reroll collisions and 60 second-reroll collisions
  // (by id set) against the pre-fix implementation over levels 1-2000, and
  // must find zero now that distinctness is enforced by construction rather
  // than hoped for from the hash.
  it("never lets a reroll reproduce the set it just replaced, across a sweep of levels", () => {
    for (let level = 1; level <= 2000; level++) {
      const w = createWorld({ arena, seed: 1 });
      w.purse = 1_000_000;
      const shop = openShop(level);
      const opening = idsOf(shop.offers);

      expect(reroll(w, shop, level)).toBe(true);
      const first = idsOf(shop.offers);
      expect(first).not.toBe(opening);

      expect(reroll(w, shop, level)).toBe(true);
      const second = idsOf(shop.offers);
      expect(second).not.toBe(first);
    }
  });

  it("leaves a genuine hole at a bought slot, not a dense array holding undefined", () => {
    const w = createWorld({ arena, seed: 1 });
    w.purse = 100_000;
    const shop = openShop(2);
    const before = shop.offers.map((o) => o.upgrade.id);

    expect(purchase(w, shop, 1)).toBe(true);

    // No compaction and no splice: the array is still length 3, and the
    // untouched slots kept their original ids rather than sliding toward
    // the hole.
    expect(shop.offers.length).toBe(3);
    expect(shop.offers[0]?.upgrade.id).toBe(before[0]);
    expect(shop.offers[2]?.upgrade.id).toBe(before[2]);
    expect(shop.offers[1]).toBeUndefined();

    // `toBeUndefined()` alone can't tell a real hole (`delete`) from a dense
    // array with a stored `undefined` (e.g. `offers[1] = undefined`) — both
    // read as undefined at that index. `in` and `Object.keys` can: a real
    // hole has no own key at all, which is what the renderer's `.map`ping
    // over these offers later depends on to skip the bought slot.
    expect(1 in shop.offers).toBe(false);
    expect(Object.keys(shop.offers)).toEqual(["0", "2"]);
  });

  it("allows a purchase when the purse exactly covers the price", () => {
    const w = createWorld({ arena, seed: 1 });
    const shop = openShop(2);
    w.purse = shop.offers[0].price;

    expect(purchase(w, shop, 0)).toBe(true);
    expect(w.purse).toBe(0);
  });
});
