"use client";

import { PixelButton, PixelPanel } from "@/app/game/_shared/pixel-ui";
import type { TierStats } from "../engine/save";
import { TIERS, type Tier } from "../engine/types";

const clock = (ms: number | null): string => {
  if (ms === null) return "—";
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

export function TierSelect({
  stats,
  current,
  onPick,
  onClose,
}: {
  stats: Record<Tier, TierStats>;
  current: Tier;
  onPick: (tier: Tier) => void;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 p-4">
      <PixelPanel className="w-full max-w-xs">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest">Difficulty</h2>
        <div className="mb-4 space-y-2">
          {TIERS.map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => onPick(tier)}
              className={`flex w-full items-center justify-between border-2 px-3 py-2 text-left ${
                tier === current ? "border-[#f8f0e0] bg-[#3d2f5c]" : "border-[#4a3d6a]"
              }`}
            >
              <span className="text-xs font-bold uppercase tracking-widest">{tier}</span>
              <span className="text-[10px] uppercase tracking-widest opacity-60">
                {stats[tier].solved} solved · {clock(stats[tier].bestMs)}
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
