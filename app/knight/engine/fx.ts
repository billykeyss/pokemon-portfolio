import type { World } from "./world";

export type FxKind = "slash" | "impact" | "death";

export interface Fx {
  kind: FxKind;
  x: number;
  y: number;
  /** Radians. Used by slashes to orient the arc. */
  angle: number;
  tick: number;
}

/** How long an effect lives. */
export const FX_TICKS = 30;
/** Hard cap so a crowded room cannot flood the renderer. */
export const MAX_FX = 48;

/**
 * The simulation owns effects rather than the renderer because several
 * simulation steps run between render frames — an effect queued and cleared
 * within one step would never be drawn.
 */
export function pushFx(world: World, fx: Fx): void {
  if (world.fx.length >= MAX_FX) world.fx.shift();
  world.fx.push(fx);
}

export function expireFx(world: World): void {
  if (world.fx.length === 0) return;
  world.fx = world.fx.filter((f) => world.tick - f.tick < FX_TICKS);
}
