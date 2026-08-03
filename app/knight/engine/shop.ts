import { makeRng } from "@/app/game/_shared/rng";
import type { World } from "./world";
import { seedForLevel } from "./level";
import { rollOffers, type Upgrade } from "../data/upgrades";

export interface Offer {
  upgrade: Upgrade;
  price: number;
}

export interface ShopState {
  /** A bought slot becomes a hole, so the row does not reshuffle under a thumb. */
  offers: Offer[];
  rerolls: number;
}

const REROLL_BASE = 5;
const REROLL_STEP = 3;
/** Keeps a shop's offers from colliding with the room layout's own draws. */
const SHOP_SALT = 0x5109;

/**
 * With 8 upgrades and 3 draws there are only 56 unordered outcomes, so no
 * seed mix can eliminate collisions by construction of the hash alone — a
 * reroll can land on the exact set (same ids, any order) it just replaced
 * purely by chance. Distinctness from the set being replaced is enforced
 * here instead: redraw with a bumped salt until the ids differ, bounded so a
 * pathological run can never spin forever. With 56 possible outcomes this
 * bound is never exhausted in practice; if it ever were, the loop simply
 * keeps the last draw rather than looping forever or throwing — a shop that
 * opens is better than a crash.
 */
const MAX_REROLL_ATTEMPTS = 16;

/** Rising, so rerolling is a real cost rather than a free spin to the best card. */
export function rerollCost(rerolls: number): number {
  return REROLL_BASE + REROLL_STEP * rerolls;
}

function draw(level: number, salt: number): Upgrade[] {
  const rng = makeRng(seedForLevel(level) ^ salt);
  return rollOffers(rng);
}

function toOffers(upgrades: Upgrade[]): Offer[] {
  return upgrades.map((upgrade) => ({ upgrade, price: upgrade.price }));
}

/** Order doesn't matter to the player: three identical cards reshuffled are
 *  still the same shop, so distinctness is judged on the id set, not the
 *  ordered array. */
function idSetOfUpgrades(upgrades: readonly Upgrade[]): Set<string> {
  return new Set(upgrades.map((u) => u.id));
}

/** `shop.offers` can be sparse (bought slots are holes); holes contribute no id. */
function idSetOfOffers(offers: readonly (Offer | undefined)[]): Set<string> {
  const ids = new Set<string>();
  for (let i = 0; i < offers.length; i++) {
    const o = offers[i];
    if (o) ids.add(o.upgrade.id);
  }
  return ids;
}

function sameIds(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const id of a) if (!b.has(id)) return false;
  return true;
}

/** The same level always offers the same shop, so a room is a known quantity. */
export function openShop(level: number): ShopState {
  return {
    offers: toOffers(draw(level, SHOP_SALT)),
    rerolls: 0,
  };
}

export function purchase(world: World, shop: ShopState, index: number): boolean {
  const offer = shop.offers[index];
  if (!offer) return false;
  if (world.purse < offer.price) return false;

  world.purse -= offer.price;
  world.mods = offer.upgrade.apply(world.mods);
  delete shop.offers[index];
  return true;
}

/**
 * Redraws the offers, guaranteeing the new id set differs from the one being
 * replaced. Same level and same reroll count still give the same result:
 * the base salt and every bumped salt are pure functions of (level,
 * shop.rerolls, attempt), and the set it must differ from is itself the
 * deterministic result of everything that happened before this call.
 */
export function reroll(world: World, shop: ShopState, level: number): boolean {
  const cost = rerollCost(shop.rerolls);
  if (world.purse < cost) return false;

  world.purse -= cost;
  shop.rerolls += 1;

  const before = idSetOfOffers(shop.offers);
  const baseSalt = SHOP_SALT + shop.rerolls;

  let picked = draw(level, baseSalt);
  for (let attempt = 1; attempt < MAX_REROLL_ATTEMPTS && sameIds(idSetOfUpgrades(picked), before); attempt++) {
    picked = draw(level, baseSalt + attempt);
  }

  shop.offers = toOffers(picked);
  return true;
}
