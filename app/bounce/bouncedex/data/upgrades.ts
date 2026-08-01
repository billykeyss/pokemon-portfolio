import type { Rng } from "@/app/game/_shared/rng";

export const UPGRADE_EVERY_WAVES = 5;

/**
 * Run modifiers. Every field here MUST be read somewhere in the simulation —
 * an upgrade that silently does nothing is worse than no upgrade, because the
 * player spends a choice on it. `upgrades.test.ts` guards this.
 */
export interface RunMods {
  // --- launcher -----------------------------------------------------------
  /** Multiplier on launch velocity. */
  launchPower: number;
  /** Number of critters visible and queued. */
  queueSize: number;
  /** Seconds between automatic launches. */
  autoFireInterval: number;

  // --- projectile physics -------------------------------------------------
  /** Multiplier on wall bounciness. */
  wallRestitution: number;
  /** Multiplier on projectile mass — heavier shots punch through. */
  massMult: number;
  /** Raises damping toward 1, keeping critters airborne (and bouncing) longer. */
  airTime: number;

  // --- damage -------------------------------------------------------------
  /** Global damage multiplier. */
  damageMult: number;
  /** Extra damage fraction per combo step. */
  comboStep: number;

  // --- behaviours granted to every critter --------------------------------
  /** Whether settling critters explode. */
  detonateOnSettle: boolean;
  /** Blast radius multiplier for bombs and HARD LANDING alike. */
  blastRadiusMult: number;
  /** Extra pass-through charges granted to every critter. */
  extraPhases: number;
  /** Every critter bursts on first contact. */
  forceSplit: boolean;
  /** Every critter steers toward enemies. */
  forceMagnet: boolean;

  // --- the board ----------------------------------------------------------
  /** Maximum simultaneous settled bumpers. */
  maxSettled: number;
  /** Multiplier on the bumper firing interval (lower is faster). */
  plinkIntervalMult: number;
  /** Multiplier on bumper firing range. */
  plinkRangeMult: number;

  // --- the nest -----------------------------------------------------------
  /** Extra nest hit points above the base. */
  nestHpBonus: number;
  /** Multiplier on how fast enemies descend. */
  enemySpeedMult: number;
}

export function defaultMods(): RunMods {
  return {
    launchPower: 1,
    queueSize: 3,
    autoFireInterval: 1.4,

    wallRestitution: 1,
    massMult: 1,
    airTime: 1,

    damageMult: 1,
    comboStep: 0.25,

    detonateOnSettle: false,
    blastRadiusMult: 1,
    extraPhases: 0,
    forceSplit: false,
    forceMagnet: false,

    maxSettled: 36,
    plinkIntervalMult: 1,
    plinkRangeMult: 1,

    nestHpBonus: 0,
    enemySpeedMult: 1,
  };
}

export interface Upgrade {
  id: string;
  name: string;
  description: string;
  apply(mods: RunMods): RunMods;
}

export const UPGRADES: readonly Upgrade[] = [
  // --- launcher -----------------------------------------------------------
  {
    id: "power",
    name: "STRONG ARM",
    description: "+20% launch power",
    apply: (m) => ({ ...m, launchPower: m.launchPower * 1.2 }),
  },
  {
    id: "queue",
    name: "BIG POCKETS",
    description: "+1 queue slot",
    apply: (m) => ({ ...m, queueSize: m.queueSize + 1 }),
  },
  {
    id: "autofire",
    name: "ITCHY TRIGGER",
    description: "Auto-fire 25% faster",
    apply: (m) => ({ ...m, autoFireInterval: m.autoFireInterval * 0.75 }),
  },
  {
    id: "bigpower",
    name: "CANNON ARM",
    description: "+35% launch power, -10% damage",
    apply: (m) => ({
      ...m,
      launchPower: m.launchPower * 1.35,
      damageMult: m.damageMult * 0.9,
    }),
  },

  // --- projectile physics -------------------------------------------------
  {
    id: "walls",
    name: "RUBBER WALLS",
    description: "+15% wall bounciness",
    apply: (m) => ({ ...m, wallRestitution: m.wallRestitution * 1.15 }),
  },
  {
    id: "heavy",
    name: "LEAD BELLY",
    description: "+30% critter mass — bulldoze through clusters",
    apply: (m) => ({ ...m, massMult: m.massMult * 1.3 }),
  },
  {
    id: "airtime",
    name: "FEATHERWEIGHT",
    description: "Critters stay in play longer before settling",
    apply: (m) => ({ ...m, airTime: m.airTime * 1.25 }),
  },

  // --- damage -------------------------------------------------------------
  {
    id: "damage",
    name: "SHARP EDGES",
    description: "+15% damage",
    apply: (m) => ({ ...m, damageMult: m.damageMult * 1.15 }),
  },
  {
    id: "combo",
    name: "MOMENTUM",
    description: "Combo chains build damage twice as fast",
    apply: (m) => ({ ...m, comboStep: m.comboStep * 2 }),
  },
  {
    id: "glasscannon",
    name: "GLASS CANNON",
    description: "+40% damage, -1 queue slot",
    apply: (m) => ({
      ...m,
      damageMult: m.damageMult * 1.4,
      queueSize: Math.max(1, m.queueSize - 1),
    }),
  },

  // --- granted behaviours -------------------------------------------------
  {
    id: "detonate",
    name: "HARD LANDING",
    description: "Critters explode when they settle",
    apply: (m) => ({ ...m, detonateOnSettle: true }),
  },
  {
    id: "blast",
    name: "BIGGER BOOM",
    description: "+60% blast radius",
    apply: (m) => ({ ...m, blastRadiusMult: m.blastRadiusMult * 1.6 }),
  },
  {
    id: "phase",
    name: "PHASE SHIFT",
    description: "Every critter phases through one extra enemy",
    apply: (m) => ({ ...m, extraPhases: m.extraPhases + 1 }),
  },
  {
    id: "split",
    name: "SPLIT PERSONALITY",
    description: "Every critter bursts in two on first contact",
    apply: (m) => ({ ...m, forceSplit: true }),
  },
  {
    id: "magnet",
    name: "HOMING INSTINCT",
    description: "Every critter curves toward enemies",
    apply: (m) => ({ ...m, forceMagnet: true }),
  },

  // --- the board ----------------------------------------------------------
  {
    id: "board",
    name: "CROWDED NEST",
    description: "+8 bumpers on the board",
    apply: (m) => ({ ...m, maxSettled: m.maxSettled + 8 }),
  },
  {
    id: "plinkrate",
    name: "TRIGGER HAPPY",
    description: "Bumpers fire 30% faster",
    apply: (m) => ({ ...m, plinkIntervalMult: m.plinkIntervalMult * 0.7 }),
  },
  {
    id: "plinkrange",
    name: "LONG REACH",
    description: "+40% bumper range",
    apply: (m) => ({ ...m, plinkRangeMult: m.plinkRangeMult * 1.4 }),
  },

  // --- the nest -----------------------------------------------------------
  {
    id: "fortify",
    name: "FORTIFY",
    description: "+3 nest health, restored immediately",
    apply: (m) => ({ ...m, nestHpBonus: m.nestHpBonus + 3 }),
  },
  {
    id: "slow",
    name: "MOLASSES",
    description: "Enemies descend 15% slower",
    apply: (m) => ({ ...m, enemySpeedMult: m.enemySpeedMult * 0.85 }),
  },
];

/** Distinct random upgrades, capped at the pool size. */
export function rollUpgrades(rng: Rng, count = 3): Upgrade[] {
  const pool = [...UPGRADES];
  const picked: Upgrade[] = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    picked.push(pool.splice(rng.int(pool.length), 1)[0]);
  }
  return picked;
}
