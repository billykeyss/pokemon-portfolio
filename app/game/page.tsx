"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GAMES, type ArcadeGame } from "./_shared/registry";
import { GameIcon } from "./_shared/GameIcon";
import { readProgress } from "./_shared/progress";

/** Does this cabinet live somewhere other than this app? */
const isExternal = (href: string) => /^https?:\/\//.test(href);

/** Zero-padded entry number. The resume numbers itself No. 0151; this rhymes. */
const dexNo = (i: number) => String(i + 1).padStart(3, "0");

export default function ArcadePage() {
  // Progress is read after mount: localStorage does not exist during the static
  // export, and reading it during render would break hydration.
  const [status, setStatus] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const next: Record<string, string | null> = {};
    for (const game of GAMES) {
      next[game.slug] = readProgress(window.localStorage, game.progress);
    }
    setStatus(next);
  }, []);

  return (
    <main className="relative min-h-dvh overflow-hidden bg-[#0b0910] text-[#ede6d6]">
      {/* Atmosphere only, so it is hidden from assistive tech. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 motion-safe:opacity-60 motion-reduce:hidden"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0 1px, transparent 1px 3px)",
        }}
      />

      <div className="mx-auto max-w-md px-4 py-6 font-mono">
        <header className="mb-4 flex items-center justify-between border border-[#2e2647] px-3 py-2">
          <h1 className="text-[15px] font-bold uppercase tracking-[0.3em]">Arcade</h1>
          <span className="text-[10px] uppercase tracking-[0.18em] text-[#6d6188]">
            {GAMES.length} cabinets
          </span>
        </header>

        <ul>
          {GAMES.map((game, i) => (
            <li key={game.slug}>
              <Cabinet game={game} no={dexNo(i)} status={status[game.slug] ?? null} />
            </li>
          ))}
        </ul>

        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.2em] text-[#4b4266]">
          Every cabinet plays with no connection
        </p>
      </div>
    </main>
  );
}

function Cabinet({
  game,
  no,
  status,
}: {
  game: ArcadeGame;
  no: string;
  status: string | null;
}) {
  const external = isExternal(game.href);

  const body = (
    <>
      <span className="w-7 shrink-0 text-[10px] tabular-nums text-[#574d75]">{no}</span>

      <GameIcon slug={game.slug} accent={game.accent} />

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-bold uppercase tracking-[0.04em]">
          {game.title}
        </span>
        <span className="mt-[2px] block truncate text-[10px] text-[#6d6188]">
          {game.tagline}
        </span>
      </span>

      {/* Status earns its place: where you left off, or what to do next. */}
      <span
        className="flex shrink-0 items-center gap-[5px] text-[9px] uppercase tracking-[0.12em]"
        style={{ color: game.accent }}
      >
        <span
          aria-hidden="true"
          className="inline-block h-[6px] w-[6px]"
          style={{ background: game.accent }}
        />
        {status ?? (external ? "open" : "play")}
      </span>
    </>
  );

  const shared =
    "flex items-center gap-[10px] border-b border-[#1d1730] px-1 py-3 transition-colors hover:bg-[#130f1e] focus-visible:bg-[#130f1e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]";

  if (!game.available) {
    return (
      <div className={`${shared} opacity-40`} aria-disabled="true">
        {body}
      </div>
    );
  }

  // A cabinet on another origin. Next's Link is for routes inside this app;
  // handing it a full URL makes it fall back to an anchor anyway, with a
  // prefetch it cannot use.
  return external ? (
    <a
      href={game.href}
      className={shared}
      style={{ outlineColor: game.accent }}
      target="_blank"
      rel="noreferrer"
    >
      {body}
    </a>
  ) : (
    <Link href={game.href} className={shared} style={{ outlineColor: game.accent }}>
      {body}
    </Link>
  );
}
