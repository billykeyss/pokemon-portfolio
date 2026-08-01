import type { Vec2 } from "./vec";
import { norm, sub } from "./vec";
import type { World } from "./world";
import { FIXED_DT, GRAVITY, DAMPING } from "./world";

export const LAUNCH_SPEED = 620;

/**
 * Deliberately mediocre: pick the lowest enemy and fire straight at it.
 * It never plans a bank shot. This is a design requirement, not a shortcut —
 * idling must stay viable while aiming yourself stays meaningfully better.
 */
export function autoAim(world: World, origin: Vec2): Vec2 {
  const enemies = world.bodies.filter((b) => b.kind === "enemy");
  if (enemies.length === 0) return { x: 0, y: -1 };

  let target = enemies[0];
  for (const e of enemies) {
    if (e.pos.y > target.pos.y) target = e;
  }

  const dir = norm(sub(target.pos, origin));
  // Never fire into the floor, even if the target has slipped below us.
  if (dir.y >= 0) return norm({ x: dir.x, y: -0.35 });
  return dir;
}

/** Direction from the launcher to the player's finger, clamped upward. */
export function aimFromDrag(origin: Vec2, touch: Vec2): Vec2 {
  const raw = sub(touch, origin);
  if (raw.x === 0 && raw.y === 0) return { x: 0, y: -1 };
  const dir = norm(raw);
  if (dir.y > 0) return norm({ x: dir.x, y: -0.05 });
  return dir;
}

/**
 * Simulate a launch against walls only, ignoring other bodies, and return
 * sampled points for the aim arc. Pure — it must never touch world state.
 */
export function predictPath(
  world: World,
  origin: Vec2,
  dir: Vec2,
  power: number,
  steps: number,
): Vec2[] {
  const { arena } = world;
  const pos = { ...origin };
  const vel = { x: dir.x * LAUNCH_SPEED * power, y: dir.y * LAUNCH_SPEED * power };
  const radius = 12;
  const out: Vec2[] = [];

  // Sample every 4 sim steps so the arc covers useful distance without
  // returning hundreds of nearly-identical points.
  const SUBSTEPS = 4;

  for (let i = 0; i < steps; i++) {
    for (let s = 0; s < SUBSTEPS; s++) {
      vel.y += GRAVITY * FIXED_DT;
      const d = Math.pow(DAMPING, FIXED_DT);
      vel.x *= d;
      vel.y *= d;
      pos.x += vel.x * FIXED_DT;
      pos.y += vel.y * FIXED_DT;

      if (pos.x - radius < 0) {
        pos.x = radius;
        vel.x = Math.abs(vel.x) * 0.85;
      } else if (pos.x + radius > arena.width) {
        pos.x = arena.width - radius;
        vel.x = -Math.abs(vel.x) * 0.85;
      }
      if (pos.y - radius < 0) {
        pos.y = radius;
        vel.y = Math.abs(vel.y) * 0.85;
      }
    }
    out.push({ x: pos.x, y: pos.y });
  }

  return out;
}
