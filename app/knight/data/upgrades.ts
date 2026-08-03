import type { Rng } from "@/app/game/_shared/rng";

/**
 * What a run has earned. Kept on the world so the simulation is the single
 * source of truth and a headless harness can play a powered-up run.
 */
export interface RunMods {
  /** Extra swing reach in pixels, granted by clearing levels. */
  reachBonus: number;
  damageBonus: number;
  maxHpBonus: number;
  iframeBonus: number;
  swingSpeedMult: number;
  moveSpeedMult: number;
  knockbackMult: number;
  coinMult: number;
  /** Hearts regained when a room clears, capped at max HP by the consumer. */
  healOnClear: number;
}

export function defaultMods(): RunMods {
  return {
    reachBonus: 0,
    damageBonus: 0,
    maxHpBonus: 0,
    iframeBonus: 0,
    swingSpeedMult: 1,
    moveSpeedMult: 1,
    knockbackMult: 1,
    coinMult: 1,
    healOnClear: 0,
  };
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  price: number;
  /** Relative draw weight. Reach is heaviest on purpose — see rollOffers. */
  weight: number;
  /** Returns a new mods object; never mutates its argument. */
  apply(mods: RunMods): RunMods;
}

export const UPGRADES: readonly Upgrade[] = [
  {
    id: "reach",
    name: "Long Arm",
    description: "+8 swing reach",
    // Priced so clearing level one (2 grunts at COIN_VALUE=5) buys exactly
    // one of these — the first shop is a decision, not a shrug.
    price: 10,
    weight: 5,
    apply: (m) => ({ ...m, reachBonus: m.reachBonus + 8 }),
  },
  {
    id: "damage",
    name: "Sharpened",
    description: "+4 damage a swing",
    price: 18,
    weight: 3,
    apply: (m) => ({ ...m, damageBonus: m.damageBonus + 4 }),
  },
  {
    id: "heart",
    name: "Stout",
    description: "+1 heart",
    price: 26,
    weight: 3,
    apply: (m) => ({ ...m, maxHpBonus: m.maxHpBonus + 1 }),
  },
  {
    id: "swift",
    name: "Quickstep",
    description: "Move 12% faster",
    price: 20,
    weight: 3,
    apply: (m) => ({ ...m, moveSpeedMult: m.moveSpeedMult * 1.12 }),
  },
  {
    id: "flurry",
    name: "Flurry",
    description: "Swing 15% faster",
    price: 30,
    weight: 2,
    apply: (m) => ({ ...m, swingSpeedMult: m.swingSpeedMult * 0.85 }),
  },
  {
    id: "heavy",
    name: "Heavy Hands",
    description: "40% more knockback",
    price: 16,
    weight: 2,
    apply: (m) => ({ ...m, knockbackMult: m.knockbackMult * 1.4 }),
  },
  {
    id: "greed",
    name: "Coin Sense",
    description: "35% more coins",
    price: 22,
    weight: 2,
    apply: (m) => ({ ...m, coinMult: m.coinMult * 1.35 }),
  },
  {
    id: "ward",
    name: "Warded",
    description: "Longer mercy after a hit",
    price: 24,
    weight: 2,
    apply: (m) => ({ ...m, iframeBonus: m.iframeBonus + 8 }),
  },
  {
    id: "mend",
    name: "Mending",
    // Stacks on top of BASE_ROOM_HEAL (engine/run.ts) rather than being the
    // only source of healing, now that every room clear heals a floor of
    // one heart on its own.
    description: "+1 extra heart each room",
    price: 26,
    weight: 2,
    apply: (m) => ({ ...m, healOnClear: m.healOnClear + 1 }),
  },
];

/**
 * Draw `count` distinct upgrades, weighted.
 *
 * Weighting is not decoration. Reach is the stat the ladder's difficulty curve
 * is balanced against, and it is no longer granted automatically — so a player
 * who buys without a plan still has to drift toward it, or the game becomes
 * unwinnable through inattention rather than through choice.
 */
export function rollOffers(rng: Rng, count = 3): Upgrade[] {
  const pool = [...UPGRADES];
  const picks: Upgrade[] = [];
  const wanted = Math.min(count, pool.length);

  while (picks.length < wanted) {
    const total = pool.reduce((sum, u) => sum + u.weight, 0);
    let roll = rng.int(total);
    let chosen = pool.length - 1;
    for (let i = 0; i < pool.length; i++) {
      roll -= pool[i].weight;
      if (roll < 0) {
        chosen = i;
        break;
      }
    }
    picks.push(pool[chosen]);
    pool.splice(chosen, 1);
  }

  return picks;
}
