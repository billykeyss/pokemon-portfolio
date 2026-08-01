import type { Body } from "./types";
import type { World } from "./world";
import { getCritter, EVOLVE_HIT_THRESHOLD } from "../data/critters";

export interface ImpactEvent {
  attackerId: number;
  targetId: number;
  damage: number;
  combo: number;
  killed: boolean;
}

export interface EvolutionEvent {
  bodyId: number;
  fromId: string;
  options: readonly [string, string];
}

/**
 * Chain length beyond which damage stops growing. Long chains should still
 * read as spectacle — the HUD shows the true count — but a 90-hit chain with
 * MOMENTUM would otherwise multiply damage ~46x and trivialise every wave.
 */
export const COMBO_DAMAGE_CAP = 25;

/**
 * Damage scales +25% per combo step by default. Linear rather than
 * exponential, and capped: the spectacle comes from chain *length*, not from a
 * multiplier that runs away.
 */
export function comboDamage(base: number, combo: number, step = 0.25): number {
  return Math.round(base * (1 + Math.min(combo, COMBO_DAMAGE_CAP) * step));
}

export function applyImpact(
  world: World,
  attacker: Body,
  target: Body,
  /** Extra multiplier for special sources such as blasts. */
  sourceMult = 1,
): ImpactEvent | null {
  if (attacker.critterId === null) return null;
  if (target.kind !== "enemy") return null;
  // Already dead but still present in a stale iteration array this step.
  if (target.hp <= 0) return null;

  const def = getCritter(attacker.critterId);
  // Settled bumpers deal flat damage; only an airborne launch builds a chain.
  const isLaunch = attacker.kind === "projectile";
  const damage = Math.max(
    1,
    Math.round(
      comboDamage(def.damage, isLaunch ? attacker.chain : 0, world.mods.comboStep) *
        world.mods.damageMult *
        sourceMult,
    ),
  );

  target.hp -= damage;
  attacker.hitsDealt += 1;

  if (isLaunch) {
    attacker.chain += 1;
    world.combo = attacker.chain;
    if (attacker.chain > world.bestCombo) world.bestCombo = attacker.chain;
  }

  const killed = target.hp <= 0;
  if (killed) {
    world.bodies = world.bodies.filter((b) => b.id !== target.id);
  }

  return {
    attackerId: attacker.id,
    targetId: target.id,
    damage,
    combo: isLaunch ? attacker.chain : 0,
    killed,
  };
}

/**
 * The first settled critter that has dealt enough damage and still has an
 * evolution available. Damage *taken* is irrelevant — only damage dealt counts,
 * so evolution rewards good placement rather than absorbing punishment.
 */
export function pendingEvolution(world: World): EvolutionEvent | null {
  for (const b of world.bodies) {
    if (!b.settled || b.critterId === null) continue;
    if (b.hitsDealt < EVOLVE_HIT_THRESHOLD) continue;

    const def = getCritter(b.critterId);
    if (def.evolvesTo === null) continue; // already stage 2
    // Already decided this line — autoEvolveDecided() handles it silently.
    if (world.branchChoices[def.id]) continue;

    return { bodyId: b.id, fromId: def.id, options: def.evolvesTo };
  }
  return null;
}

/**
 * Evolve every ready critter whose branch was already chosen this run.
 * Returns how many evolved. This is what keeps the choice meaningful (asked
 * once) without spamming a dialog for each of a dozen identical critters.
 */
export function autoEvolveDecided(world: World): number {
  let count = 0;
  for (const b of world.bodies) {
    if (!b.settled || b.critterId === null) continue;
    if (b.hitsDealt < EVOLVE_HIT_THRESHOLD) continue;

    const def = getCritter(b.critterId);
    if (def.evolvesTo === null) continue;

    const chosen = world.branchChoices[def.id];
    if (!chosen) continue;

    applyEvolution(world, b.id, chosen);
    count += 1;
  }
  return count;
}

export function applyEvolution(world: World, bodyId: number, toId: string): void {
  const body = world.bodies.find((b) => b.id === bodyId);
  if (!body || body.critterId === null) {
    throw new Error(`No evolvable body with id ${bodyId}`);
  }

  const from = getCritter(body.critterId);
  if (from.evolvesTo === null || !from.evolvesTo.includes(toId)) {
    throw new Error(`${toId} is not a valid evolution of ${from.id}`);
  }

  const to = getCritter(toId);
  // Remember the branch so the rest of this line follows it without asking.
  world.branchChoices[from.id] = to.id;
  if (!world.discovered.includes(to.id)) world.discovered.push(to.id);

  body.critterId = to.id;
  body.evolvedAtTick = world.tick;
  body.radius = to.radius;
  body.mass = to.mass;
  body.restitution = to.restitution;
  body.hitsDealt = 0;
}
