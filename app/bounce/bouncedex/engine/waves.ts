import type { Rng } from "@/app/game/_shared/rng";

export const LANES = 5;

export type EnemyKind = "basic" | "armored" | "fast" | "splitter" | "boss";

export interface EnemySpawn {
  kind: EnemyKind;
  hp: number;
  radius: number;
  lane: number;
  /**
   * Vertical stagger above the arena, in pixels. Without it a whole wave
   * enters a lane at the same point and collision resolution stacks them into
   * a rigid vertical train instead of a loose horde.
   */
  yOffset: number;
  /** Small horizontal jitter so a lane does not read as a single file. */
  xJitter: number;
}

const BASE_HP = 45;

export function isBossWave(waveIndex: number): boolean {
  return waveIndex > 0 && waveIndex % 10 === 0;
}

/** Centre x of a lane, inset so enemies never clip the arena walls. */
export function laneX(lane: number, arenaWidth: number): number {
  const usable = arenaWidth * 0.86;
  const margin = (arenaWidth - usable) / 2;
  return margin + (usable / LANES) * (lane + 0.5);
}

/** Enemy kinds unlocked by a given wave, in the order they are introduced. */
function availableKinds(waveIndex: number): EnemyKind[] {
  const kinds: EnemyKind[] = ["basic"];
  if (waveIndex >= 4) kinds.push("armored");
  if (waveIndex >= 6) kinds.push("fast");
  if (waveIndex >= 8) kinds.push("splitter");
  return kinds;
}

function statsFor(
  kind: EnemyKind,
  waveIndex: number,
): { hp: number; radius: number } {
  // Board DPS plateaus once the bumper cap is reached, so linear HP growth
  // would mean a run that never ends. The quadratic term is what eventually
  // overwhelms a full board and closes the run out.
  const scale = 1 + waveIndex * 0.15 + (waveIndex / 13) ** 2;
  switch (kind) {
    case "basic":
      return { hp: Math.round(BASE_HP * scale), radius: 14 };
    case "armored":
      return { hp: Math.round(BASE_HP * 2.4 * scale), radius: 16 };
    case "fast":
      return { hp: Math.round(BASE_HP * 0.6 * scale), radius: 11 };
    case "splitter":
      return { hp: Math.round(BASE_HP * 1.4 * scale), radius: 15 };
    case "boss":
      return { hp: Math.round(BASE_HP * 14 * scale), radius: 30 };
  }
}

export function buildWave(waveIndex: number, rng: Rng): EnemySpawn[] {
  if (isBossWave(waveIndex)) {
    const { hp, radius } = statsFor("boss", waveIndex);
    return [{ kind: "boss", hp, radius, lane: 2, yOffset: 0, xJitter: 0 }];
  }

  const count = Math.min(7 + Math.floor(waveIndex * 0.8), 24);
  const kinds = availableKinds(waveIndex);

  return Array.from({ length: count }, (_, i) => {
    const kind = rng.pick(kinds);
    const { hp, radius } = statsFor(kind, waveIndex);
    return {
      kind,
      hp,
      radius,
      lane: rng.int(LANES),
      yOffset: i * 34 + rng.int(20),
      xJitter: rng.int(19) - 9,
    };
  });
}
