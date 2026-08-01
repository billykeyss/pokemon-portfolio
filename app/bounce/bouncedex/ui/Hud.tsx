"use client";

import { CritterIcon } from "./CritterIcon";

export function Hud({
  wave,
  nestHp,
  maxNestHp,
  combo,
  queue,
  reload,
  charge,
  autoMode,
  speed,
  onToggleAuto,
  onCycleSpeed,
  onOpenDex,
}: {
  wave: number;
  nestHp: number;
  maxNestHp: number;
  combo: number;
  queue: string[];
  /** Reload progress, 0..1. */
  reload: number;
  /** Charge held on the current shot, 0..1. */
  charge: number;
  autoMode: boolean;
  speed: number;
  onToggleAuto: () => void;
  onCycleSpeed: () => void;
  onOpenDex: () => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between border-b-4 border-[#f8f0e0] bg-[#1b1428] px-3 py-2 text-sm font-bold uppercase tracking-wider text-[#f8f0e0]">
        <span>Wave {wave}</span>

        {/* A bar, not a row of hearts: FORTIFY can push the nest past 30 hp,
            and 30 glyphs wrapped onto a second line and broke the layout. */}
        <span
          className="flex items-center gap-1.5"
          aria-label={`${nestHp} of ${maxNestHp} nest health`}
        >
          <span className="text-[#F8D030]">&hearts;</span>
          <span className="h-2.5 w-20 border-2 border-[#f8f0e0] bg-[#2a2140]">
            <span
              className="block h-full bg-[#F8D030]"
              style={{
                width: `${maxNestHp === 0 ? 0 : Math.max(0, Math.min(100, (nestHp / maxNestHp) * 100))}%`,
              }}
            />
          </span>
          <span className="tabular-nums text-xs">{nestHp}</span>
        </span>
        <span className={combo > 1 ? "text-[#F8D030]" : "opacity-40"}>&times;{combo}</span>
      </div>

      <div className="relative h-1.5 w-full bg-[#2a2140]">
        <div
          className="h-full bg-[#F8D030] transition-none"
          style={{ width: `${Math.min(100, Math.max(0, reload * 100))}%` }}
          aria-label="Launcher reload"
        />
        {/* Charge rides on top of reload so one strip shows both. */}
        {charge > 0 && (
          <div
            className="absolute inset-y-0 left-0 bg-[#ff5f5f]"
            style={{ width: `${Math.min(100, charge * 100)}%` }}
            aria-label="Shot charge"
          />
        )}
      </div>

      <div className="flex items-center justify-between border-t-4 border-[#f8f0e0] bg-[#1b1428] px-3 py-2 text-[#f8f0e0]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider opacity-60">
            Next
          </span>
          {queue.map((id, i) => (
            <CritterIcon key={`${id}-${i}`} id={id} size={24} />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCycleSpeed}
            aria-label={`Game speed ${speed} times, tap to change`}
            className={`border-2 px-2 py-1 text-xs font-bold uppercase tracking-wider ${
              speed > 1
                ? "border-[#F8D030] text-[#F8D030]"
                : "border-[#f8f0e0] text-[#f8f0e0]"
            }`}
          >
            {speed}&times;
          </button>
          <button
            type="button"
            onClick={onOpenDex}
            className="border-2 border-[#f8f0e0] px-2 py-1 text-xs font-bold uppercase tracking-wider"
          >
            Dex
          </button>
          <button
            type="button"
            onClick={onToggleAuto}
            className="border-2 border-[#f8f0e0] px-2 py-1 text-xs font-bold uppercase tracking-wider"
          >
            Auto {autoMode ? "●" : "○"}
          </button>
        </div>
      </div>
    </>
  );
}
