"use client";

export function Hud({
  hp,
  maxHp,
  purse,
  critterName,
}: {
  hp: number;
  maxHp: number;
  purse: number;
  critterName: string;
}) {
  return (
    <div className="flex items-center justify-between border-b-4 border-[#f8f0e0] bg-[#1b1428] px-3 py-2 text-sm font-bold uppercase tracking-wider text-[#f8f0e0]">
      <span>{critterName}</span>
      <span className="flex items-center gap-3">
        <span aria-label={`${purse} coins`} className="text-[#F8D030]">
          {purse}c
        </span>
        <span aria-label={`${hp} of ${maxHp} health`}>
          {"♥".repeat(Math.max(0, hp))}
          <span className="opacity-30">{"♥".repeat(Math.max(0, maxHp - hp))}</span>
        </span>
      </span>
    </div>
  );
}
