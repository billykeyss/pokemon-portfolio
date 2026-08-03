"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useGameLoop } from "@/app/game/_shared/useGameLoop";
import { PixelPanel, PixelButton } from "@/app/game/_shared/pixel-ui";
import { BASE_CRITTERS, getCritter } from "@/app/game/_shared/critters";
import { stepWorld, heroOf, FIXED_DT, type World } from "./engine/world";
import { ARENA } from "./engine/level";
import { statsOf } from "./engine/stats";
import { openShop, purchase, reroll, type ShopState } from "./engine/shop";
import { beginRoom, settleClear, carryForward, freshCarry } from "./engine/run";
import {
  loadSave,
  writeSave,
  recordClear,
  defaultSave,
  type KnightSave,
} from "./engine/save";
import { drawWorld } from "./render/draw";
import { Hud } from "./ui/Hud";
import { Shop } from "./ui/Shop";

const STARTER = BASE_CRITTERS[0].id;

export default function KnightPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [save, setSave] = useState<KnightSave>(defaultSave());
  const [level, setLevel] = useState(1);
  // The world is the only copy of the run's build (mods, purse, hp). There is
  // deliberately no parallel ref for it — see the comment on `Carry` in
  // `./engine/run`, and on `beginRoom`, the sole producer of a room's world.
  const worldRef = useRef<World>(beginRoom(1, freshCarry()));
  const [shop, setShop] = useState<ShopState | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [canvasFailed, setCanvasFailed] = useState(false);
  const [hud, setHud] = useState({ hp: 5, maxHp: 5, purse: 0, over: false, cleared: false });

  const critter = getCritter(STARTER);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!canvasRef.current?.getContext("2d")) setCanvasFailed(true);
  }, []);

  // localStorage does not exist during the static export, so progress loads
  // after mount and the opening room is whatever the save unlocked.
  useEffect(() => {
    const loaded = loadSave(window.localStorage);
    setSave(loaded);
    setLevel(loaded.level);
    setShop(null);
    worldRef.current = beginRoom(loaded.level, freshCarry());
  }, []);

  const step = useCallback(() => {
    stepWorld(worldRef.current);
  }, []);

  const draw = useCallback(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const world = worldRef.current;

    drawWorld(ctx, world, { heroColor: critter.color, reducedMotion });

    const hero = heroOf(world);
    const alive = world.entities.some((e) => e.kind === "enemy" && e.deadAtTick < 0);
    setHud((prev) => {
      const next = {
        hp: hero?.hp ?? 0,
        maxHp: hero?.maxHp ?? 5,
        purse: world.purse,
        over: world.over,
        cleared: !alive,
      };
      return prev.hp === next.hp &&
        prev.maxHp === next.maxHp &&
        prev.purse === next.purse &&
        prev.over === next.over &&
        prev.cleared === next.cleared
        ? prev
        : next;
    });
  }, [critter.color, reducedMotion]);

  const finished = hud.over || hud.cleared;
  useGameLoop({
    step,
    draw,
    fixedDt: FIXED_DT,
    running: !finished && !canvasFailed,
  });

  /**
   * The moment a room clears (and the hero is still standing — a same-tick
   * mutual kill favours the death branch, never a shop for a dead hero),
   * bank every coin left on the floor, mend `BASE_ROOM_HEAL` plus whatever
   * `healOnClear` earns, and open the shop exactly once — that sequencing
   * lives in `settleClear` now, but still fires from here, before the shop
   * opens, so the HUD shows post-heal HP for the whole time the player is
   * browsing. `shop` in the dependency list is what makes this fire only on
   * the transition: once it is non-null the guard below skips every
   * subsequent re-render, including the ones purchases cause.
   */
  useEffect(() => {
    if (!hud.cleared || hud.over || shop) return;

    const world = worldRef.current;
    settleClear(world);
    const hero = heroOf(world);
    setShop(openShop(level));
    // The game loop is paused the instant a room clears, so nothing will
    // redraw to pick up the sweep or the mend — without this, the Hud keeps
    // showing whatever purse/hp it last drew mid-fight while the shop right
    // below it shows the true, post-sweep numbers.
    setHud((h) => ({ ...h, purse: world.purse, hp: hero?.hp ?? h.hp }));
  }, [hud.cleared, hud.over, shop, level]);

  /** Leaving the shop banks the clear and carries the run's build, purse and
   *  health forward into the next room — read fresh from the live world, so
   *  every purchase and reroll made in the shop is included. */
  const nextRoom = useCallback(() => {
    const carry = carryForward(worldRef.current);
    const updated = recordClear(save, level);
    setSave(updated);
    writeSave(window.localStorage, updated);

    const next = level + 1;
    setLevel(next);
    worldRef.current = beginRoom(next, carry);
    setShop(null);
    // maxHp is read from statsOf rather than hardcoded: a "heart" purchase
    // raises it above the base 5, and a stale literal here would show the
    // HUD's old, lower max for the one frame before the next draw() corrects
    // it.
    setHud({
      hp: 5,
      maxHp: statsOf(worldRef.current).maxHp,
      purse: carry.purse,
      over: false,
      cleared: false,
    });
  }, [level, save]);

  /** Falling loses the run: mods and purse reset, and the same room replays
   *  at full health. */
  const retry = useCallback(() => {
    setShop(null);
    worldRef.current = beginRoom(level, freshCarry());
    setHud({ hp: 5, maxHp: statsOf(worldRef.current).maxHp, purse: 0, over: false, cleared: false });
  }, [level]);

  const toArena = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * ARENA.width,
      y: ((e.clientY - rect.top) / rect.height) * ARENA.height,
    };
  };

  return (
    <main className="flex min-h-dvh select-none flex-col bg-[#0d0a15]">
      <Hud
        hp={hud.hp}
        maxHp={hud.maxHp}
        purse={hud.purse}
        critterName={`${critter.name} · lv ${level}`}
      />

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {canvasFailed && (
          <p className="p-6 text-center text-xs uppercase tracking-wider text-[#f8f0e0]">
            This browser cannot draw the game.
          </p>
        )}

        <canvas
          ref={canvasRef}
          width={ARENA.width}
          height={ARENA.height}
          className="h-full max-h-full w-auto touch-none"
          style={{ imageRendering: "pixelated" }}
          onPointerDown={(e) => {
            e.preventDefault();
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              // Capture is a nicety; losing it must not break input.
            }
            worldRef.current.moveTarget = toArena(e);
          }}
          onPointerMove={(e) => {
            if (worldRef.current.moveTarget === null) return;
            e.preventDefault();
            worldRef.current.moveTarget = toArena(e);
          }}
          onPointerUp={(e) => {
            e.preventDefault();
            worldRef.current.moveTarget = null;
          }}
          onPointerCancel={() => {
            worldRef.current.moveTarget = null;
          }}
        />

        {hud.over && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 p-4">
            <PixelPanel className="w-full max-w-sm text-center">
              <h2 className="mb-3 text-lg font-bold uppercase tracking-widest">You fell</h2>
              <p className="mb-4 text-[11px] uppercase tracking-widest opacity-60">
                Coins and upgrades reset
              </p>
              <div className="flex flex-col gap-2">
                <PixelButton onClick={retry}>Try again</PixelButton>
                <Link
                  href="/game"
                  className="text-center text-xs uppercase tracking-widest underline opacity-70"
                >
                  Back to arcade
                </Link>
              </div>
            </PixelPanel>
          </div>
        )}

        {!hud.over && hud.cleared && shop && (
          <Shop
            shop={shop}
            purse={worldRef.current.purse}
            level={level}
            onBuy={(i) => {
              if (purchase(worldRef.current, shop, i)) {
                setShop({ ...shop });
                // Spending coins here bypasses the draw loop (it's paused
                // while the shop is up), so the Hud's purse readout has to be
                // told directly or it goes stale mid-shop.
                setHud((h) => ({ ...h, purse: worldRef.current.purse }));
              }
            }}
            onReroll={() => {
              if (reroll(worldRef.current, shop, level)) {
                setShop({ ...shop });
                setHud((h) => ({ ...h, purse: worldRef.current.purse }));
              }
            }}
            onNext={nextRoom}
          />
        )}
      </div>
    </main>
  );
}
