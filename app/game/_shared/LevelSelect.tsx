"use client";

import { PixelButton, PixelPanel } from "./pixel-ui";

export interface LevelSelectProps {
  /** Highest level reached; every level up to it is replayable. */
  best: number;
  current: number;
  /** Best score per cleared level, keyed by level. */
  scoreByLevel: Record<number, number>;
  /** What the per-level number means — "moves", "takes". */
  scoreLabel: string;
  onPick: (level: number) => void;
  onClose: () => void;
}

/**
 * Grid of every level the player has reached, with their best score on each.
 *
 * Shared by all three puzzle games: they differ only in what the number under a
 * level means, which is why that is a prop rather than three near-identical
 * components.
 */
export function LevelSelect({
  best,
  current,
  scoreByLevel,
  scoreLabel,
  onPick,
  onClose,
}: LevelSelectProps) {
  const levels = Array.from({ length: Math.max(1, best) }, (_, i) => i + 1);

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 p-4">
      <PixelPanel className="flex max-h-[80vh] w-full max-w-xs flex-col">
        <h2 className="mb-1 text-center text-sm font-bold uppercase tracking-widest">
          Levels
        </h2>
        <p className="mb-3 text-center text-[9px] uppercase tracking-widest opacity-40">
          best {scoreLabel}
        </p>

        <div className="mb-3 grid min-h-0 flex-1 grid-cols-5 gap-1 overflow-y-auto">
          {levels.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => onPick(level)}
              className={`border-2 py-2 text-[10px] font-bold ${
                level === current
                  ? "border-[#f8f0e0] bg-[#2f2447]"
                  : "border-[#f8f0e0]/40"
              }`}
            >
              {level}
              <span className="block text-[8px] font-normal opacity-60">
                {scoreByLevel[level] ?? "–"}
              </span>
            </button>
          ))}
        </div>

        <PixelButton onClick={onClose} className="w-full !px-2 !py-2 text-[10px]">
          Close
        </PixelButton>
      </PixelPanel>
    </div>
  );
}
