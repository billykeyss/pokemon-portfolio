"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { GAMES, type ArcadeGame } from "./_shared/registry";
import { GameIcon } from "./_shared/GameIcon";
import { readProgress } from "./_shared/progress";
import "./arcade.css";

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

      <div className="mx-auto max-w-md px-4 py-6 font-mono sm:max-w-2xl">
        <header className="mb-5 flex items-center justify-between border border-[#2e2647] px-3 py-2">
          <h1 className="text-[15px] font-bold uppercase tracking-[0.3em]">Arcade</h1>
          <span className="text-[10px] uppercase tracking-[0.18em] text-[#8f84ad]">
            {GAMES.length} cabinets
          </span>
        </header>

        <ul className="grid grid-cols-2 gap-x-5 gap-y-7 px-1 sm:grid-cols-3">
          {GAMES.map((game, i) => (
            <li key={game.slug}>
              <Cabinet game={game} no={dexNo(i)} status={status[game.slug] ?? null} />
            </li>
          ))}
        </ul>

        <p className="mt-8 text-center text-[10px] uppercase tracking-[0.2em] text-[#6d6188]">
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
      <span className="cab-marquee">
        <span className="cab-title">{game.title}</span>
      </span>

      <span className="cab-body">
        <span className="cab-bezel">
          <span className="cab-screen">
            <span className="cab-number">{no}</span>
            <span className="cab-art">
              <GameIcon slug={game.slug} accent={game.accent} size={52} framed={false} />
            </span>
          </span>
        </span>

        <span className="cab-deck" aria-hidden="true">
          <span className="cab-stick" />
          <span className="cab-buttons">
            <span />
            <span />
            <span />
          </span>
        </span>

        <span className="cab-lower">
          <span className="cab-tagline">{game.tagline}</span>
          {/* Status earns its place: where you left off, or what to do next. */}
          <span className="cab-door">
            <span className="cab-status">{status ?? (external ? "open" : "play")}</span>
            <span className="cab-slots" aria-hidden="true">
              <span />
              <span />
            </span>
          </span>
        </span>
      </span>

      <span className="cab-kick" aria-hidden="true" />
    </>
  );

  const style = { "--cab": game.accent } as CSSProperties;

  if (!game.available) {
    return (
      <div className="cab" style={style} aria-disabled="true">
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
      className="cab"
      style={style}
      target="_blank"
      rel="noreferrer"
    >
      {body}
    </a>
  ) : (
    <Link href={game.href} className="cab" style={style}>
      {body}
    </Link>
  );
}
