import type { Arena, Body } from "./types";

/** Speed below which a projectile comes to rest and becomes a bumper. */
export const SETTLE_SPEED = 12;

/**
 * Advance one body by dt seconds using semi-implicit Euler (velocity first,
 * then position) — stable at our timestep and what makes the bounce feel
 * predictable. Mutates in place: this runs thousands of times per second, and
 * allocating two Vec2 per body per step is measurable.
 */
export function integrate(
  body: Body,
  dt: number,
  gravity: number,
  damping: number,
): void {
  if (body.settled) return;

  body.vel.y += gravity * dt;

  // Exponential form keeps damping frame-rate independent, so retuning the
  // fixed timestep later does not silently change game feel.
  const d = Math.pow(damping, dt);
  body.vel.x *= d;
  body.vel.y *= d;

  body.pos.x += body.vel.x * dt;
  body.pos.y += body.vel.y * dt;
}

export function isSettled(body: Body): boolean {
  const speedSq = body.vel.x * body.vel.x + body.vel.y * body.vel.y;
  return speedSq < SETTLE_SPEED * SETTLE_SPEED;
}

/**
 * Reflect a body off the arena's left, right, and top walls.
 * The bottom is deliberately open — the world layer decides whether falling
 * off the bottom means "settle", "despawn", or "hit the nest".
 * Returns true if a wall was touched this step.
 */
export function collideWalls(
  body: Body,
  arena: Arena,
  wallRestitution = 1,
  /**
   * Whether the floor reflects. Critters bounce off it so a long, fast shot
   * stays in play instead of draining out the bottom; enemies do not, because
   * reaching the floor is how they damage the nest.
   */
  reflectBottom = false,
): boolean {
  if (body.settled) return false;
  let hit = false;

  // Clamped at 1: a wall must never add energy, or a critter could accelerate
  // forever between two walls and never settle.
  const e = Math.min(1, body.restitution * wallRestitution);

  if (body.pos.x - body.radius < 0) {
    body.pos.x = body.radius;
    body.vel.x = Math.abs(body.vel.x) * e;
    hit = true;
  } else if (body.pos.x + body.radius > arena.width) {
    body.pos.x = arena.width - body.radius;
    body.vel.x = -Math.abs(body.vel.x) * e;
    hit = true;
  }

  if (body.pos.y - body.radius < 0) {
    body.pos.y = body.radius;
    body.vel.y = Math.abs(body.vel.y) * e;
    hit = true;
  } else if (reflectBottom && body.pos.y + body.radius > arena.height) {
    body.pos.y = arena.height - body.radius;
    // The floor is a springy rail, not a wall. A plain reflection let critters
    // shed their last energy down here and pile up by the nest, leaving the
    // top of the board bare; kicking them back keeps bumpers well spread.
    body.vel.y = -Math.abs(body.vel.y) * Math.min(1, Math.max(e, 0.92));
    hit = true;
  }

  return hit;
}

/**
 * Push two static bodies apart along their centre line, splitting the
 * correction evenly. Position only — neither body may start moving.
 */
export function separateStatic(a: Body, b: Body): boolean {
  const dx = b.pos.x - a.pos.x;
  const dy = b.pos.y - a.pos.y;
  const distSq = dx * dx + dy * dy;
  const minDist = a.radius + b.radius;
  if (distSq >= minDist * minDist) return false;

  const dist = Math.sqrt(distSq);
  // Perfectly coincident: shove along a fixed axis so the result is finite.
  const nx = dist === 0 ? 1 : dx / dist;
  const ny = dist === 0 ? 0 : dy / dist;
  const push = (minDist - dist) / 2;

  a.pos.x -= nx * push;
  a.pos.y -= ny * push;
  b.pos.x += nx * push;
  b.pos.y += ny * push;
  return true;
}

/** Overlap test with no collision response — used to decide whether a ghost
 *  should phase through before any impulse is applied. */
export function overlaps(a: Body, b: Body): boolean {
  const dx = b.pos.x - a.pos.x;
  const dy = b.pos.y - a.pos.y;
  const r = a.radius + b.radius;
  return dx * dx + dy * dy < r * r;
}

/**
 * Resolve a circle-circle collision: push the pair apart so they stop
 * overlapping, then exchange impulse along the collision normal.
 * Settled bodies act as infinite mass — they are the arena's bumpers and must
 * not drift when struck. Returns true if the bodies were touching.
 */
export function collidePair(a: Body, b: Body): boolean {
  // Two settled bumpers exchange no impulse, but they must still stop
  // overlapping: a critter that settles on top of another would otherwise stay
  // merged into it for the rest of the run.
  if (a.settled && b.settled) return separateStatic(a, b);

  const dx = b.pos.x - a.pos.x;
  const dy = b.pos.y - a.pos.y;
  const distSq = dx * dx + dy * dy;
  const minDist = a.radius + b.radius;

  if (distSq >= minDist * minDist) return false;

  // Coincident centres: nudge apart along a fixed axis to avoid NaN.
  const dist = Math.sqrt(distSq) || 1e-6;
  const nx = distSq === 0 ? 1 : dx / dist;
  const ny = distSq === 0 ? 0 : dy / dist;

  const invMassA = a.settled ? 0 : 1 / a.mass;
  const invMassB = b.settled ? 0 : 1 / b.mass;
  const invMassSum = invMassA + invMassB;
  if (invMassSum === 0) return false;

  // Positional correction, split by inverse mass.
  const overlap = minDist - dist;
  a.pos.x -= nx * overlap * (invMassA / invMassSum);
  a.pos.y -= ny * overlap * (invMassA / invMassSum);
  b.pos.x += nx * overlap * (invMassB / invMassSum);
  b.pos.y += ny * overlap * (invMassB / invMassSum);

  // Impulse along the normal, using the softer of the two restitutions.
  const rvx = b.vel.x - a.vel.x;
  const rvy = b.vel.y - a.vel.y;
  const velAlongNormal = rvx * nx + rvy * ny;
  if (velAlongNormal > 0) return true; // already separating

  const e = Math.min(a.restitution, b.restitution);
  const j = (-(1 + e) * velAlongNormal) / invMassSum;

  a.vel.x -= j * invMassA * nx;
  a.vel.y -= j * invMassA * ny;
  b.vel.x += j * invMassB * nx;
  b.vel.y += j * invMassB * ny;

  return true;
}
