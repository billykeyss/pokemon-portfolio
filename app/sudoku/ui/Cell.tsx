"use client";

import { hasDigit, type Mask } from "../engine/candidates";
import type { Cell, Digit } from "../engine/types";
import type { CellHighlight } from "./highlight";

// Module-level so the candidate grid isn't a fresh array literal per cell per
// render — this runs for all nine digits in every one of the 81 cells.
const CANDIDATE_DIGITS: readonly Digit[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function SudokuCell({
  value,
  given,
  candidates,
  struck,
  highlight,
  onPick,
}: {
  value: Cell;
  given: boolean;
  candidates: Mask;
  /**
   * Digits the player has crossed off by hand, already filtered to the ones
   * still offered as real candidates — a struck digit that has fallen out of
   * the candidate set entirely (a peer claimed it) renders as nothing at all
   * here, same as any other digit the board no longer offers.
   */
  struck: Mask;
  highlight: CellHighlight;
  onPick: () => void;
}) {
  const tone = highlight.wrong
    ? "text-[#F06060]"
    : given
      ? "text-[#f8f0e0]"
      : "text-[#8FB8F0]";

  // Layered backgrounds, weakest first, so a cell that is several things at
  // once still reads as the most specific of them.
  //
  // A hint's premise cells win outright: that is the sentence the player is
  // reading. `selected` keeps the rung directly beneath it, as the spec orders
  // it — the unit tint marks a whole region, and most regions contain the
  // selected cell, so letting it outrank `selected` would steal the marker for
  // "where I am" almost every time a hint opened.
  const background = highlight.hint
    ? "bg-[#4a3a20]"
    : highlight.selected
      ? "bg-[#3d2f5c]"
      : highlight.hintUnit
        ? "bg-[#2b2418]"
        : highlight.sameDigit
          ? "bg-[#2f3d5c]"
          : highlight.armedCandidate
            ? "bg-[#23324a]"
            : highlight.peer
              ? "bg-[#241d38]"
              : "bg-[#1b1428]";

  return (
    <button
      type="button"
      onClick={onPick}
      // w-full is load-bearing, not decorative: a <button> is a form control,
      // so width: auto shrinks to fit its content instead of stretching to
      // its container even when the wrapper is a plain block div. Without an
      // explicit width, aspect-square has nothing to derive the height from
      // and the cell collapses to a sliver.
      className={`relative flex aspect-square w-full items-center justify-center border border-[#3a2f52] ${background} ${tone} transition-colors`}
    >
      {value !== 0 ? (
        <span className={`text-[clamp(14px,4.2vw,26px)] ${given ? "font-bold" : ""}`}>
          {value}
        </span>
      ) : (
        <span className="grid h-full w-full grid-cols-3 grid-rows-3 p-[6%] text-[clamp(5px,1.5vw,10px)] leading-none text-[#7f74a0]">
          {CANDIDATE_DIGITS.map((d) => {
            // A hint that eliminates this mark strikes it out where it sits.
            // Tinting the whole cell would say "something here changes"; the
            // argument is about specific digits, so the board says which.
            const hintStruck = hasDigit(highlight.eliminated, d);
            // The player's own strike reads differently on purpose — dimmed
            // rather than lit, so it never competes with an open hint's
            // amber for attention. Whichever hint eliminations are showing
            // win outright: that panel is talking about specific digits
            // right now, and a hand-struck mark under it can wait.
            const playerStruck = !hintStruck && hasDigit(struck, d);
            return (
              <span
                key={d}
                className={`flex items-center justify-center ${
                  hintStruck
                    ? "font-bold text-[#F0A44C] line-through decoration-[#F0A44C]"
                    : playerStruck
                      ? "text-[#5c5480] line-through decoration-[#5c5480]"
                      : ""
                }`}
              >
                {hasDigit(candidates, d) ? d : ""}
              </span>
            );
          })}
        </span>
      )}
    </button>
  );
}
