"use client";

import Link from "next/link";
import { useEffect } from "react";
import { GAMES, type ArcadeGame } from "./_shared/registry";
import { GameIcon } from "./_shared/GameIcon";
import { PixelPanel } from "./_shared/pixel-ui";

export default function ArcadePage() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline caching is a bonus; failing to register must not break the page.
    });
  }, []);

  return (
    <main className="min-h-dvh bg-[#0d0a15] px-4 py-8 text-[#f8f0e0]">
      <div className="mx-auto max-w-md">
        <h1 className="mb-1 text-center text-2xl font-bold uppercase tracking-[0.3em]">
          Arcade
        </h1>
        <p className="mb-8 text-center text-xs uppercase tracking-widest opacity-50">
          Insert coin
        </p>

        <ul className="space-y-4">
          {GAMES.map((game) => (
            <li key={game.slug}>
              {game.available ? (
                <Link href={game.href} className="block">
                  <Cabinet game={game} />
                </Link>
              ) : (
                <div className="opacity-40">
                  <Cabinet game={game} />
                </div>
              )}
            </li>
          ))}
        </ul>

        <p className="mt-8 text-center text-[10px] uppercase tracking-widest opacity-40">
          More cabinets arriving
        </p>
      </div>
    </main>
  );
}

function Cabinet({ game }: { game: ArcadeGame }) {
  return (
    <PixelPanel className="transition-transform active:translate-x-[2px] active:translate-y-[2px]">
      <div className="flex items-center gap-3">
        <GameIcon slug={game.slug} accent={game.accent} />
        <div className="min-w-0">
          <h2 className="text-base font-bold uppercase tracking-widest">
            {game.title}
          </h2>
          <p className="truncate text-xs opacity-70">{game.tagline}</p>
        </div>
        {!game.available && (
          <span className="ml-auto shrink-0 text-[10px] uppercase tracking-widest opacity-60">
            Soon
          </span>
        )}
      </div>
    </PixelPanel>
  );
}
