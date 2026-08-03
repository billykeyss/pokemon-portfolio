"use client";

import type { Digit } from "../engine/types";

const DIGITS: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function Keypad({
  remaining,
  armed,
  onArm,
  onErase,
}: {
  /** How many of each digit are still unplaced, indexed 1..9. */
  remaining: Record<Digit, number>;
  armed: Digit | null;
  onArm: (d: Digit | null) => void;
  onErase: () => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {DIGITS.map((d) => {
        const left = remaining[d];
        return (
          <button
            key={d}
            type="button"
            disabled={left === 0}
            onClick={() => onArm(armed === d ? null : d)}
            className={`flex flex-col items-center border-4 border-[#f8f0e0] px-1 py-2 shadow-[3px_3px_0_0_#000] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-30 ${
              armed === d ? "bg-[#5a4590]" : "bg-[#2f2447]"
            }`}
          >
            <span className="text-lg font-bold text-[#f8f0e0]">{d}</span>
            <span className="text-[9px] uppercase tracking-widest text-[#f8f0e0] opacity-50">
              {left}
            </span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={onErase}
        className="flex flex-col items-center border-4 border-[#f8f0e0] bg-[#2f2447] px-1 py-2 shadow-[3px_3px_0_0_#000] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
      >
        <span className="text-lg font-bold text-[#f8f0e0]">⌫</span>
        <span className="text-[9px] uppercase tracking-widest text-[#f8f0e0] opacity-50">
          clear
        </span>
      </button>
    </div>
  );
}
