"use client";

import { hasDigit, type Mask } from "../engine/candidates";
import type { Digit } from "../engine/types";

const DIGITS: Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function Keypad({
  remaining,
  armed,
  markMode,
  struckAtSelected,
  onArm,
  onErase,
  onToggleMarkMode,
}: {
  /** How many of each digit are still unplaced, indexed 1..9. */
  remaining: Record<Digit, number>;
  armed: Digit | null;
  /** Pencil mode: a digit tap strikes it in the selected cell instead of placing it. */
  markMode: boolean;
  /** Digits already struck in the selected cell — zero when nothing is selected. */
  struckAtSelected: Mask;
  onArm: (d: Digit | null) => void;
  onErase: () => void;
  onToggleMarkMode: () => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className={`grid grid-cols-5 gap-2 border-4 p-1 transition-colors ${
          markMode ? "border-[#F0A44C]" : "border-transparent"
        }`}
      >
        {DIGITS.map((d) => {
          const left = remaining[d];
          const struck = markMode && hasDigit(struckAtSelected, d);
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
              <span
                className={`text-lg font-bold text-[#f8f0e0] ${struck ? "opacity-50 line-through" : ""}`}
              >
                {d}
              </span>
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

      {/* A player who forgets which mode they are in and places digits by
          accident is the failure this button exists to prevent, so its own
          state has to be legible at a glance — border colour and fill both
          flip, not just one, and the label says outright what will happen
          next. */}
      <button
        type="button"
        onClick={onToggleMarkMode}
        aria-pressed={markMode}
        className={`border-4 px-2 py-2 text-[10px] font-bold uppercase tracking-widest shadow-[3px_3px_0_0_#000] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none ${
          markMode
            ? "border-[#F0A44C] bg-[#F0A44C] text-[#241d38]"
            : "border-[#f8f0e0] bg-[#2f2447] text-[#f8f0e0]"
        }`}
      >
        {markMode ? "Marking candidates — tap to place instead" : "Mark candidates"}
      </button>
    </div>
  );
}
