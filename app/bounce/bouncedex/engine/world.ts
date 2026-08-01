import type { Vec2 } from "./vec";
import type { Arena, Body } from "./types";
import { integrate, collideWalls, collidePair, isSettled, overlaps } from "./physics";
import { applyImpact, type ImpactEvent } from "./combat";
import { getCritter, type BehaviorTag } from "../data/critters";
import { defaultMods, type RunMods } from "../data/upgrades";

/** Simulation runs at a fixed 120Hz regardless of render frame rate. */
export const FIXED_DT = 1 / 120;
/**
 * The arena is a top-down pinball surface, not a side view. With downward
 * gravity a launched critter arcs up and falls straight back out of the open
 * bottom before it can slow down, so nothing ever settles and the board never
 * fills — which is the entire escalation curve. Zero gravity plus heavy
 * damping makes critters ricochet, bleed speed, and park as bumpers.
 */
export const GRAVITY = 0;
export const DAMPING = 0.5;
/** Board budget: beyond this, the oldest bumpers are retired. */
export const MAX_SETTLED = 36;
export const ENEMY_FALL_SPEED = 26;
const DEFAULT_NEST_HP = 28;

/**
 * Settled critters fire at enemies near their lane on this cadence. This is
 * the run's escalation curve: the board fills with bumpers, board DPS climbs,
 * and later waves get shredded by critters you placed ten waves ago.
 */
export const PLINK_INTERVAL_TICKS = 45;
export const PLINK_RANGE = 95;
/** How long the evolution flash lasts, in ticks (~0.6s). */
export const EVOLVE_FLASH_TICKS = 72;
/** How long a floating number or burst lives, in ticks. */
export const FX_TICKS = 54;
/** Hard cap so a huge wave cannot flood the renderer. */
const MAX_FX = 60;
/** Damage needed to fill the overdrive meter. */
export const OVERDRIVE_CHARGE = 4200;
/** How long overdrive runs once triggered (~4s). */
export const OVERDRIVE_TICKS = 480;
/** Bumpers fire this many times faster during overdrive. */
const OVERDRIVE_RATE = 5;
/** Extra launch speed at full charge. */
export const CHARGE_SPEED_BONUS = 0.85;
/** Damping a fully charged shot decays toward (higher = floatier). */
const CHARGED_DAMPING = 0.88;

/** Sticky: ticks between damage pulses while riding a host. */
export const STICKY_INTERVAL_TICKS = 24;
/** Magnet: steering strength and acquisition range. */
export const MAGNET_ACCEL = 900;
export const MAGNET_RANGE = 260;
/** Blast radii for an innate bomb versus the HARD LANDING upgrade. */
export const BOMB_RADIUS = 90;
export const DETONATE_RADIUS = 55;
const BOMB_BLAST_MULT = 2.5;
const DETONATE_BLAST_MULT = 1;

const behaviorOf = (b: Body): BehaviorTag | null =>
  b.critterId === null ? null : getCritter(b.critterId).behavior;

export interface World {
  tick: number;
  arena: Arena;
  bodies: Body[];
  nextId: number;
  nestHp: number;
  maxNestHp: number;
  wave: number;
  combo: number;
  bestCombo: number;
  rngSeed: number;
  over: boolean;
  /** Impacts produced by the most recent step; the renderer drains this. */
  impacts: ImpactEvent[];
  /** Short-lived visual effects. The sim owns them so they survive the gap
   *  between simulation steps and render frames. */
  fx: Fx[];
  /** Damage banked toward the next overdrive, 0..OVERDRIVE_CHARGE. */
  overdrive: number;
  /** Tick overdrive expires, or -1 when idle. */
  overdriveUntil: number;
  /**
   * Tick of the last damaging impact per body pair, keyed "loId:hiId".
   * Two overlapping bodies collide on *every* step they remain in contact, so
   * without this a resting enemy would take 120 hits a second.
   */
  contacts: Map<string, number>;
  /**
   * Branch chosen per base critter this run. The first Ember to evolve asks;
   * every later Ember follows the same branch automatically, so a board full
   * of critters does not bury the player in identical dialogs.
   */
  branchChoices: Record<string, string>;
  /** Evolved forms reached this run, for the Dex. */
  discovered: string[];
  /** Run modifiers from upgrades. The simulation reads these directly so the
   *  sim, not the React shell, is the single source of truth for them. */
  mods: RunMods;
}

/** Minimum ticks between two damaging impacts for the same pair (0.25s). */
export const HIT_COOLDOWN_TICKS = 30;

export interface Fx {
  x: number;
  y: number;
  tick: number;
  kind: "hit" | "kill" | "big";
  value: number;
}

function pushFx(world: World, fx: Fx): void {
  // Drop the oldest rather than growing without bound in a heavy wave.
  if (world.fx.length >= MAX_FX) world.fx.shift();
  world.fx.push(fx);
}

/** True while the board is in overdrive. */
export function isOverdrive(world: World): boolean {
  return world.overdriveUntil >= 0 && world.tick < world.overdriveUntil;
}

/** Spend a full meter. Returns false if it was not ready. */
export function triggerOverdrive(world: World): boolean {
  if (world.overdrive < OVERDRIVE_CHARGE || isOverdrive(world)) return false;
  world.overdrive = 0;
  world.overdriveUntil = world.tick + OVERDRIVE_TICKS;
  return true;
}

const pairKey = (a: number, b: number): string =>
  a < b ? `${a}:${b}` : `${b}:${a}`;

export function createWorld(opts: { arena: Arena; seed: number }): World {
  return {
    tick: 0,
    arena: opts.arena,
    bodies: [],
    nextId: 1,
    nestHp: DEFAULT_NEST_HP,
    maxNestHp: DEFAULT_NEST_HP,
    wave: 0,
    combo: 0,
    bestCombo: 0,
    rngSeed: opts.seed,
    over: false,
    impacts: [],
    fx: [],
    overdrive: 0,
    overdriveUntil: -1,
    contacts: new Map(),
    branchChoices: {},
    discovered: [],
    mods: defaultMods(),
  };
}

export function spawnProjectile(
  world: World,
  critterId: string,
  pos: Vec2,
  vel: Vec2,
  charge = 0,
): Body {
  const def = getCritter(critterId);
  const body: Body = {
    id: world.nextId++,
    kind: "projectile",
    pos: { ...pos },
    vel: { ...vel },
    radius: def.radius,
    mass: def.mass * world.mods.massMult,
    restitution: def.restitution,
    hp: 1,
    critterId: def.id,
    hitsDealt: 0,
    chain: 0,
    settled: false,
    phasesLeft: (def.behavior === "ghost" ? 1 : 0) + world.mods.extraPhases,
    hasSplit: false,
    attachedTo: null,
    evolvedAtTick: -1,
    charge,
  };
  world.bodies.push(body);
  return body;
}

export function spawnEnemy(
  world: World,
  pos: Vec2,
  hp: number,
  radius: number,
): Body {
  const body: Body = {
    id: world.nextId++,
    kind: "enemy",
    pos: { ...pos },
    vel: { x: 0, y: ENEMY_FALL_SPEED },
    radius,
    mass: 1.5,
    restitution: 0.3,
    hp,
    critterId: null,
    hitsDealt: 0,
    chain: 0,
    settled: false,
    phasesLeft: 0,
    hasSplit: false,
    attachedTo: null,
    evolvedAtTick: -1,
    charge: 0,
  };
  world.bodies.push(body);
  return body;
}

/**
 * Bank damage toward overdrive and queue a visual. Only kills and meaty hits
 * get a number — every plink would be unreadable noise.
 */
function recordFx(world: World, ev: ImpactEvent, target: Body): void {
  world.overdrive = Math.min(OVERDRIVE_CHARGE, world.overdrive + ev.damage);

  if (ev.killed) {
    pushFx(world, { x: target.pos.x, y: target.pos.y, tick: world.tick, kind: "kill", value: ev.damage });
  } else if (ev.combo >= 3) {
    pushFx(world, { x: target.pos.x, y: target.pos.y, tick: world.tick, kind: "big", value: ev.damage });
  } else if (ev.damage >= 20) {
    pushFx(world, { x: target.pos.x, y: target.pos.y, tick: world.tick, kind: "hit", value: ev.damage });
  }
}

/** The settled bumper under a point, if any. Used for drag-to-reposition. */
export function bumperAt(world: World, x: number, y: number): Body | null {
  let best: Body | null = null;
  let bestSq = Infinity;
  for (const b of world.bodies) {
    if (!b.settled) continue;
    const dx = b.pos.x - x;
    const dy = b.pos.y - y;
    const dSq = dx * dx + dy * dy;
    // A little slop so a fingertip does not have to be pixel-perfect.
    const r = b.radius + 10;
    if (dSq <= r * r && dSq < bestSq) {
      bestSq = dSq;
      best = b;
    }
  }
  return best;
}

/**
 * Drop a dragged bumper. If it lands on another of the same critter, the two
 * fuse: the survivor keeps their combined progress toward evolving, which is
 * what makes tending the board worth doing. Returns true if a merge happened.
 */
export function dropBumper(world: World, bodyId: number): boolean {
  const body = world.bodies.find((b) => b.id === bodyId);
  if (!body || !body.settled || body.critterId === null) return false;

  const twin = world.bodies.find(
    (o) =>
      o.id !== body.id &&
      o.settled &&
      o.critterId === body.critterId &&
      overlaps(o, body),
  );
  if (!twin) return false;

  body.hitsDealt += twin.hitsDealt;
  world.bodies = world.bodies.filter((b) => b.id !== twin.id);
  return true;
}

/** Nearest enemy to a point within `range`, or null. */
function nearestEnemy(world: World, from: Vec2, range: number): Body | null {
  let best: Body | null = null;
  let bestSq = range * range;
  for (const e of world.bodies) {
    if (e.kind !== "enemy" || e.hp <= 0) continue;
    const dx = e.pos.x - from.x;
    const dy = e.pos.y - from.y;
    const dSq = dx * dx + dy * dy;
    if (dSq < bestSq) {
      bestSq = dSq;
      best = e;
    }
  }
  return best;
}

/** Damage every enemy inside `radius`. Used by bombs and by HARD LANDING. */
function detonate(world: World, source: Body, radius: number, mult: number): void {
  for (const e of [...world.bodies]) {
    if (e.kind !== "enemy" || e.hp <= 0) continue;
    const dx = e.pos.x - source.pos.x;
    const dy = e.pos.y - source.pos.y;
    if (dx * dx + dy * dy > radius * radius) continue;

    const ev = applyImpact(world, source, e, mult);
    if (ev) {
      world.impacts.push(ev);
      recordFx(world, ev, e);
    }
  }
}

/**
 * Advance the world by exactly one FIXED_DT. Mutates in place.
 * Order matters: integrate, then walls, then pairs, then settle, then cull.
 * Resolving walls before pairs keeps bodies inside the arena when a pair
 * collision would otherwise push one through a wall.
 */
export function stepWorld(world: World): void {
  if (world.over) return;

  const { bodies, arena } = world;
  const mods = world.mods;

  // FORTIFY raises the cap mid-run; the extra hearts arrive filled.
  const targetMax = DEFAULT_NEST_HP + mods.nestHpBonus;
  if (targetMax !== world.maxNestHp) {
    const delta = targetMax - world.maxNestHp;
    world.maxNestHp = targetMax;
    if (delta > 0) world.nestHp = Math.min(targetMax, world.nestHp + delta);
  }

  for (const b of bodies) {
    if (b.kind === "enemy") {
      // Enemies descend at a constant rate; they are not subject to gravity.
      b.pos.y += ENEMY_FALL_SPEED * mods.enemySpeedMult * FIXED_DT;
      continue;
    }

    // Sticky riders are carried by their host instead of being simulated.
    if (b.attachedTo !== null) continue;

    // Magnet: steer toward the nearest enemy while airborne.
    if (!b.settled && (behaviorOf(b) === "magnet" || mods.forceMagnet)) {
      const target = nearestEnemy(world, b.pos, MAGNET_RANGE);
      if (target) {
        const dx = target.pos.x - b.pos.x;
        const dy = target.pos.y - b.pos.y;
        const d = Math.hypot(dx, dy) || 1;
        b.vel.x += (dx / d) * MAGNET_ACCEL * FIXED_DT;
        b.vel.y += (dy / d) * MAGNET_ACCEL * FIXED_DT;
      }
    }

    // FEATHERWEIGHT pushes damping toward 1 (clamped, or critters never settle).
    // A charged shot pushes it further still, which is what turns one good
    // release into a long ricochet chain instead of a two-bounce dribble.
    const base = DAMPING + (CHARGED_DAMPING - DAMPING) * b.charge;
    const damping = Math.min(0.95, base * mods.airTime);
    integrate(b, FIXED_DT, GRAVITY, damping);
    collideWalls(b, arena, mods.wallRestitution, true);
  }

  // Sticky: ride the host, burn it, and settle in place when it dies.
  for (const b of world.bodies) {
    if (b.attachedTo === null) continue;

    const host = world.bodies.find((x) => x.id === b.attachedTo);
    if (!host || host.hp <= 0) {
      b.attachedTo = null;
      b.settled = true;
      b.kind = "settled";
      b.vel.x = 0;
      b.vel.y = 0;
      continue;
    }

    b.pos.x = host.pos.x;
    b.pos.y = host.pos.y;

    if ((world.tick + b.id) % STICKY_INTERVAL_TICKS === 0) {
      const ev = applyImpact(world, b, host);
      if (ev) world.impacts.push(ev);
    }
  }

  world.impacts.length = 0;

  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i];
      const b = bodies[j];
      // A sticky rider sits inside its host by design; resolving that overlap
      // would shove the pair apart by the full radius sum every step.
      if (a.attachedTo !== null || b.attachedTo !== null) continue;
      if (!overlaps(a, b)) continue;

      // Identify a critter-hits-enemy pairing, if this is one.
      let critter: Body | null = null;
      let enemy: Body | null = null;
      if (a.critterId !== null && b.kind === "enemy") {
        critter = a;
        enemy = b;
      } else if (b.critterId !== null && a.kind === "enemy") {
        critter = b;
        enemy = a;
      }

      // Ghost: pass straight through, taking no impulse from the contact.
      const phasing =
        critter !== null && !critter.settled && critter.phasesLeft > 0;
      if (!phasing) collidePair(a, b);

      if (critter === null || enemy === null) continue;

      // Sustained overlap must not re-trigger damage every step.
      const key = pairKey(a.id, b.id);
      const last = world.contacts.get(key);
      if (last !== undefined && world.tick - last < HIT_COOLDOWN_TICKS) continue;

      const ev = applyImpact(world, critter, enemy);
      if (!ev) continue;
      world.contacts.set(key, world.tick);
      world.impacts.push(ev);
      recordFx(world, ev, enemy);

      if (phasing) critter.phasesLeft -= 1;

      const behavior = behaviorOf(critter);

      // Sticky: latch onto the first thing hit and ride it.
      if (behavior === "sticky" && !critter.settled && critter.attachedTo === null) {
        critter.attachedTo = enemy.id;
        critter.vel.x = 0;
        critter.vel.y = 0;
      }

      // Splitter: burst into two fragments on first contact.
      if (
        (behavior === "splitter" || mods.forceSplit) &&
        !critter.settled &&
        !critter.hasSplit
      ) {
        critter.hasSplit = true;
        const speed = Math.hypot(critter.vel.x, critter.vel.y) * 0.8;
        const heading = Math.atan2(critter.vel.y, critter.vel.x);
        for (const spread of [-0.6, 0.6]) {
          const angle = heading + spread;
          const frag = spawnProjectile(
            world,
            critter.critterId!,
            critter.pos,
            { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
          );
          // Fragments are pre-flagged so a burst cannot cascade. They land in
          // world.bodies but not in the `bodies` snapshot this loop iterates,
          // so they first act next step — which is what we want.
          frag.hasSplit = true;
        }
      }
    }
  }


  // Drop cooldown entries that can no longer suppress anything, so the map
  // does not grow without bound over a long run.
  if (world.contacts.size > 64) {
    for (const [key, tick] of world.contacts) {
      if (world.tick - tick >= HIT_COOLDOWN_TICKS) world.contacts.delete(key);
    }
  }

  // Settled bumpers fire at nearby enemies. Staggered by body id so a board
  // full of critters does not fire in a single synchronised volley.
  for (const b of world.bodies) {
    if (!b.settled || b.critterId === null) continue;
    const interval = Math.max(
      2,
      Math.round(
        (PLINK_INTERVAL_TICKS * mods.plinkIntervalMult) /
          (isOverdrive(world) ? OVERDRIVE_RATE : 1),
      ),
    );
    if ((world.tick + b.id) % interval !== 0) continue;

    const range = PLINK_RANGE * mods.plinkRangeMult;
    let target: Body | null = null;
    let bestSq = range * range;
    for (const e of world.bodies) {
      if (e.kind !== "enemy") continue;
      const dx = e.pos.x - b.pos.x;
      const dy = e.pos.y - b.pos.y;
      const dSq = dx * dx + dy * dy;
      if (dSq < bestSq) {
        bestSq = dSq;
        target = e;
      }
    }

    if (target) {
      const ev = applyImpact(world, b, target);
      if (ev) {
        world.impacts.push(ev);
        recordFx(world, ev, target);
      }
    }
  }

  for (const b of world.bodies) {
    if (b.kind !== "projectile" || b.attachedTo !== null || !isSettled(b)) continue;

    b.settled = true;
    b.kind = "settled";
    b.vel.x = 0;
    b.vel.y = 0;

    // Bomb critters always blow up on landing; HARD LANDING grants a smaller
    // blast to everyone else.
    if (behaviorOf(b) === "bomb") {
      detonate(world, b, BOMB_RADIUS * mods.blastRadiusMult, BOMB_BLAST_MULT);
    } else if (mods.detonateOnSettle) {
      detonate(world, b, DETONATE_RADIUS * mods.blastRadiusMult, DETONATE_BLAST_MULT);
    }
  }

  // Cull: projectiles that fall out the open bottom are lost; enemies that
  // reach the bottom damage the nest.
  //
  // This MUST filter world.bodies, not the `bodies` reference captured at the
  // top of the step: applyImpact replaces world.bodies when it kills something,
  // and rebuilding from the stale array resurrects every enemy killed this step.
  let damage = 0;
  world.bodies = world.bodies.filter((b) => {
    const past = b.pos.y - b.radius > arena.height;
    if (!past) return true;
    if (b.kind === "enemy") damage += 1;
    return false;
  });

  if (damage > 0) {
    world.nestHp = Math.max(0, world.nestHp - damage);
    if (world.nestHp === 0) world.over = true;
  }

  // Retire the oldest bumpers once the board is full, keeping the body count
  // (and the O(n²) pair loop) bounded over a long run.
  const settledCount = world.bodies.reduce((n, b) => n + (b.settled ? 1 : 0), 0);
  if (settledCount > mods.maxSettled) {
    let toRemove = settledCount - mods.maxSettled;
    world.bodies = world.bodies.filter((b) => {
      if (toRemove > 0 && b.settled) {
        toRemove -= 1;
        return false;
      }
      return true;
    });
  }

  // The HUD shows the best chain currently in flight; it falls to zero once
  // every projectile has settled or left the board.
  let best = 0;
  for (const b of world.bodies) {
    if (b.kind === "projectile" && b.chain > best) best = b.chain;
  }
  world.combo = best;

  if (world.fx.length > 0) {
    world.fx = world.fx.filter((f) => world.tick - f.tick < FX_TICKS);
  }

  world.tick += 1;
}
