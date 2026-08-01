import type { PixelSprite } from "@/app/game/_shared/pixelGrid";

/**
 * A pixel librarian who paces the floor and shelves the occasional book.
 *
 * Purely decorative — she never touches the board and the board never touches
 * her. She exists to give the shop something living in it while the player
 * thinks, so her whole cycle is slow and never demands attention.
 *
 *   K outline  S skin  H hair  D dress  A apron  B book  E eye
 */
const PALETTE: Record<string, string> = {
  K: "#241826",
  S: "#F0C29B",
  H: "#6B4226",
  D: "#7A5EA8",
  A: "#E8DCC8",
  B: "#C4553F",
  E: "#241826",
};

/** Standing, arms down. */
const IDLE: readonly string[] = [
  "...KKKK...",
  "..KHHHHK..",
  "..KSSSSK..",
  "..KESSEK..",
  "..KSSSSK..",
  ".KDDDDDDK.",
  "KDDAAAADDK",
  "KDDAAAADDK",
  ".KDDDDDDK.",
  "..KD..DK..",
  "..KD..DK..",
  "..KK..KK..",
];

/** Mid-stride, one leg forward. */
const WALK: readonly string[] = [
  "...KKKK...",
  "..KHHHHK..",
  "..KSSSSK..",
  "..KESSEK..",
  "..KSSSSK..",
  ".KDDDDDDK.",
  "KDDAAAADDK",
  "KDDAAAADDK",
  ".KDDDDDDK.",
  "..KDD.DK..",
  ".KD...DDK.",
  ".KK...KKK.",
];

/** Reaching up, holding a book above her head. */
const SHELVE: readonly string[] = [
  "..KBBBBK..",
  "..KBBBBK..",
  ".KSKKKKSK.",
  "..KHHHHK..",
  "..KSSSSK..",
  "..KESSEK..",
  ".KDDDDDDK.",
  "KDDAAAADDK",
  ".KDDDDDDK.",
  "..KD..DK..",
  "..KD..DK..",
  "..KK..KK..",
];

export type Pose = "idle" | "walk" | "shelve";

const GRIDS: Record<Pose, readonly string[]> = {
  idle: IDLE,
  walk: WALK,
  shelve: SHELVE,
};

export function librarianSprite(pose: Pose): PixelSprite {
  return { grid: GRIDS[pose], palette: PALETTE };
}

/** Seconds for one full there-and-back patrol, including the pauses. */
const CYCLE = 26;
/** Share of the cycle spent standing at a shelf, putting a book away. */
const SHELVING = 0.16;

export interface LibrarianPose {
  pose: Pose;
  /** Position across the floor, 0..1. */
  x: number;
  /** True when she is walking left, so the sprite is mirrored. */
  flipped: boolean;
  /** Small vertical bob while walking. */
  bob: number;
}

/**
 * Where the librarian is and what she is doing at time `clock`.
 *
 * Pure, so the whole routine can be asserted on without a canvas — and so it
 * is driven by the same clock as everything else rather than by its own timer,
 * which would drift out of step whenever the loop is paused.
 */
export function librarianAt(clock: number): LibrarianPose {
  const t = ((clock % CYCLE) + CYCLE) % CYCLE;
  const half = CYCLE / 2;

  // Each half is one traverse: walk across, pause near the end to shelve.
  const leg = t < half ? t / half : (t - half) / half;
  const goingRight = t < half;

  const walkSpan = 1 - SHELVING;
  if (leg < walkSpan) {
    const progress = leg / walkSpan;
    return {
      pose: "walk",
      x: goingRight ? progress : 1 - progress,
      flipped: !goingRight,
      // Two bobs per stride; small enough to read as gait, not a jump.
      bob: Math.abs(Math.sin(progress * Math.PI * 18)) * 0.5,
    };
  }

  // Arrived: put a book away, then turn around.
  const pauseProgress = (leg - walkSpan) / SHELVING;
  return {
    pose: pauseProgress < 0.75 ? "shelve" : "idle",
    x: goingRight ? 1 : 0,
    flipped: !goingRight,
    bob: 0,
  };
}
