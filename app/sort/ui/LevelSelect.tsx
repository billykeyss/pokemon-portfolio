"use client";

import { PixelButton, PixelPanel } from "@/app/game/_shared/pixel-ui";

export function LevelSelect({
  best,
  current,
  movesByLevel,
  onPick,
  onClose,
}: {
  best: number;
  current: number;
  movesByLevel: Record<number, number>;
  onPick: (level: number) => void;
  onClose: () => void;
}) {
  const levels = Array.from({ length: best }, (_, i) => i + 1);

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 p-4">
      <PixelPanel className="flex max-h-[80vh] w-full max-w-xs flex-col">
        <h2 className="mb-3 text-center text-sm font-bold uppercase tracking-widest">
          Levels
        </h2>

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
              {movesByLevel[level] !== undefined && (
                <span className="block text-[8px] font-normal opacity-60">
                  {movesByLevel[level]}
                </span>
              )}
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
