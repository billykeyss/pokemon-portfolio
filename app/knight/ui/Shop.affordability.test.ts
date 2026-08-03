import { describe, it, expect } from "vitest";
import { createWorld } from "../engine/world";
import { openShop, purchase, rerollCost } from "../engine/shop";

const arena = { width: 360, height: 560 };

describe("what the shop screen has to render", () => {
  it("gives every offer a name, a description and a price to show", () => {
    for (const offer of openShop(3).offers) {
      expect(offer.upgrade.name.length).toBeGreaterThan(0);
      expect(offer.upgrade.description.length).toBeGreaterThan(0);
      expect(offer.price).toBeGreaterThan(0);
    }
  });

  it("leaves a hole where a bought card was, so the row does not reshuffle", () => {
    const w = createWorld({ arena, seed: 1 });
    w.purse = 1000;
    const shop = openShop(3);
    const idsBefore = shop.offers.map((o) => o.upgrade.id);

    purchase(w, shop, 1);

    expect(shop.offers[0]?.upgrade.id).toBe(idsBefore[0]);
    expect(shop.offers[1]).toBeUndefined();
    expect(shop.offers[2]?.upgrade.id).toBe(idsBefore[2]);
  });

  it("always leaves the player able to walk away broke", () => {
    const w = createWorld({ arena, seed: 1 });
    w.purse = 0;
    const shop = openShop(3);
    // Nothing is affordable and rerolling is out of reach, but leaving is not
    // gated on either — the Next room button has no purse condition.
    expect(shop.offers.every((o) => w.purse < o.price)).toBe(true);
    expect(w.purse).toBeLessThan(rerollCost(shop.rerolls));
  });
});
