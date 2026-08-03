import { makeRng } from "@/app/game/_shared/rng";
import type { Arena, Vec2 } from "./types";

/** Every room is this size; only what fills it changes. */
export const ARENA: Arena = { width: 360, height: 560 };

/** How the hero's swing reach grows over a run. */
export const REACH_PER_BONUS = 9;

export interface LevelParams {
  /** How many enemies the room holds. */
  enemies: number;
  /** Hit points each one carries. */
  enemyHp: number;
  /** Which spawn pattern lays them out. */
  pattern: SpawnPattern;
}

export interface RoomSpec {
  level: number;
  arena: Arena;
  heroStart: Vec2;
  enemyHp: number;
  spawns: Vec2[];
}

/**
 * Spawn patterns, not random scatter.
 *
 * A room reads as designed when its enemies sit in a shape you can recognise
 * and plan against — a line to break through, a ring to escape, a pincer to
 * split. Scatter gives variety but nothing to read, and this game is entirely
 * about choosing where to stand.
 */
export type SpawnPattern = "arc" | "pincer" | "ring" | "column" | "corners";

const PATTERNS: SpawnPattern[] = ["arc", "pincer", "column", "corners", "ring"];

/** Two swings at level one; GRUNT.hp is the archetype's own default. */
const OPENING_HP = 20;

/**
 * Level one is three grunts in a loose arc — winnable while you are still
 * learning that stopping is not required. Difficulty climbs on two dials:
 * count fills the room, hit points make each one outlast a single swing
 * cycle. Count is capped so a room stays readable rather than a wall of
 * bodies.
 */
/** Coerce anything — NaN, negatives, fractions — to a usable level number. */
function asLevel(level: number): number {
  return Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
}

export function paramsForLevel(level: number): LevelParams {
  const n = asLevel(level);
  return {
    // Level one is two grunts that die in two swings — a room you can lose to
    // only by standing still, so the controls are learnable before the game
    // starts asking for spacing. Both dials then climb.
    enemies: Math.min(14, 1 + Math.ceil(n * 0.9)),
    enemyHp: OPENING_HP + Math.floor((n - 1) * 5),
    // Cycle deterministically so consecutive levels never repeat a shape.
    pattern: PATTERNS[(n - 1) % PATTERNS.length],
  };
}

/** Spread consecutive levels across the seed space so 8 and 9 share nothing. */
export function seedForLevel(level: number): number {
  let h = (asLevel(level) * 2654435761) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0;
  return (h ^ (h >>> 15)) >>> 0;
}

const MARGIN = 34;
/**
 * No enemy may start closer than this to the hero.
 *
 * The ring pattern is meant to surround you, but its near edge landed 53px
 * from the spawn point — close enough to cost a heart before the level had
 * begun. Anything inside the ward is pushed straight out along its own bearing,
 * which preserves the shape while making the opening survivable.
 */
const SPAWN_WARD = 96;

function clampToRoom(p: Vec2): Vec2 {
  return {
    x: Math.max(MARGIN, Math.min(ARENA.width - MARGIN, Math.round(p.x))),
    y: Math.max(MARGIN, Math.min(ARENA.height - MARGIN, Math.round(p.y))),
  };
}

function layout(pattern: SpawnPattern, count: number, seed: number): Vec2[] {
  const rng = makeRng(seed);
  const cx = ARENA.width / 2;
  const jitter = () => rng.int(19) - 9;
  const out: Vec2[] = [];

  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    switch (pattern) {
      case "arc": {
        const a = Math.PI * (0.15 + t * 0.7);
        out.push({ x: cx - Math.cos(a) * 130 + jitter(), y: 110 + Math.sin(a) * 60 + jitter() });
        break;
      }
      case "pincer": {
        // Two files down the flanks, so the room must be split or skirted.
        const left = i % 2 === 0;
        out.push({
          x: (left ? 62 : ARENA.width - 62) + jitter(),
          y: 90 + Math.floor(i / 2) * 74 + jitter(),
        });
        break;
      }
      case "column": {
        out.push({ x: cx + jitter(), y: 80 + i * 62 + jitter() });
        break;
      }
      case "corners": {
        const corners: Vec2[] = [
          { x: 70, y: 90 },
          { x: ARENA.width - 70, y: 90 },
          { x: 70, y: 300 },
          { x: ARENA.width - 70, y: 300 },
        ];
        const c = corners[i % corners.length];
        out.push({ x: c.x + jitter(), y: c.y + Math.floor(i / 4) * 56 + jitter() });
        break;
      }
      case "ring": {
        // Surrounds the hero's start, so the opening move is an escape.
        const a = (i / count) * Math.PI * 2;
        out.push({ x: cx + Math.cos(a) * 118 + jitter(), y: 300 + Math.sin(a) * 118 + jitter() });
        break;
      }
    }
  }
  return out.map(clampToRoom);
}

function wardOff(spawns: Vec2[], hero: Vec2): Vec2[] {
  const far = (p: Vec2) => Math.hypot(p.x - hero.x, p.y - hero.y) >= SPAWN_WARD;

  return spawns.map((s) => {
    if (far(s)) return s;

    const dx = s.x - hero.x;
    const dy = s.y - hero.y;
    const d = Math.hypot(dx, dy);
    // Straight up when a spawn lands exactly on the hero.
    const ux = d === 0 ? 0 : dx / d;
    const uy = d === 0 ? -1 : dy / d;

    const pushed = clampToRoom({ x: hero.x + ux * SPAWN_WARD, y: hero.y + uy * SPAWN_WARD });
    if (far(pushed)) return pushed;

    // Clamping dragged it back inside the ward — the hero starts near the
    // bottom wall, so pushing "away" downward has nowhere to go. Fall back to
    // pushing into the room instead, which always has depth.
    return clampToRoom({ x: pushed.x, y: hero.y - SPAWN_WARD });
  });
}

/** Built at most once per level: the layout is deterministic, so cache it. */
const cache = new Map<number, RoomSpec>();

export function levelFor(level: number): RoomSpec {
  const n = asLevel(level);
  const cached = cache.get(n);
  if (cached !== undefined) return cached;

  const params = paramsForLevel(n);
  const room: RoomSpec = {
    level: n,
    arena: ARENA,
    heroStart: { x: ARENA.width / 2, y: ARENA.height - 90 },
    enemyHp: params.enemyHp,
    spawns: wardOff(
      layout(params.pattern, params.enemies, seedForLevel(n)),
      { x: ARENA.width / 2, y: ARENA.height - 90 },
    ),
  };
  cache.set(n, room);
  return room;
}
