"use client";

import { PixelPanel, PixelButton } from "@/app/game/_shared/pixel-ui";
import { rerollCost, type ShopState } from "../engine/shop";

export function Shop({
  shop,
  purse,
  level,
  onBuy,
  onReroll,
  onNext,
}: {
  shop: ShopState;
  purse: number;
  level: number;
  onBuy(index: number): void;
  onReroll(): void;
  onNext(): void;
}) {
  const cost = rerollCost(shop.rerolls);

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 p-4">
      <PixelPanel className="w-full max-w-sm">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest">
            Level {level} cleared
          </h2>
          <span className="text-[11px] uppercase tracking-widest text-[#F8D030]">
            {purse} coins
          </span>
        </div>

        <ul className="mb-3">
          {shop.offers.map((offer, i) => {
            // Holes are bought slots. They stay holes so the remaining cards do
            // not slide sideways under a thumb that is already moving.
            if (!offer) return null;
            const affordable = purse >= offer.price;
            return (
              <li key={offer.upgrade.id}>
                <button
                  type="button"
                  disabled={!affordable}
                  aria-disabled={!affordable}
                  onClick={() => affordable && onBuy(i)}
                  className={`flex w-full items-center gap-2 border-b border-[#1d1730] px-1 py-2 text-left ${
                    affordable ? "hover:bg-[#130f1e]" : "opacity-40"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-bold uppercase tracking-wide">
                      {offer.upgrade.name}
                    </span>
                    <span className="block text-[10px] text-[#6d6188]">
                      {offer.upgrade.description}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-[#F8D030]">
                    {offer.price}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-col gap-2">
          <PixelButton onClick={onReroll} disabled={purse < cost}>
            {`Reroll · ${cost}`}
          </PixelButton>
          <PixelButton onClick={onNext}>Next room</PixelButton>
        </div>
      </PixelPanel>
    </div>
  );
}
