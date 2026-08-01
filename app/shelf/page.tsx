"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { LevelSelect } from "@/app/game/_shared/LevelSelect";
import { PixelButton, PixelPanel } from "@/app/game/_shared/pixel-ui";
import { useGameLoop } from "@/app/game/_shared/useGameLoop";
import {
  advanceFly,
  isFlyDone,
  POP_DURATION,
  startFly,
  type Fly,
} from "./engine/anim";
import { levelFor, paramsForLevel } from "./engine/level";
import {
  applyMove,
  canTake,
  cloneShelf,
  frontOf,
  isSolved,
  isStuck,
} from "./engine/rules";
import {
  defaultShelfSave,
  loadShelfSave,
  writeShelfSave,
  type ShelfSave,
} from "./engine/save";
import { hint as solveHint } from "./engine/solve";
import { MATCH, type Shelf } from "./engine/types";
import { drawScene, type DrawState, type Pop } from "./render/draw";
import { columnAt, layoutShelf } from "./render/layout";

const FIXED_DT = 1 / 60;
const HINT_DURATION = 2.2;

export default function ShelfPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [save, setSave] = useState<ShelfSave>(defaultShelfSave);
  const [loaded, setLoaded] = useState(false);
  const [shelf, setShelf] = useState<Shelf>(() => cloneShelf(levelFor(1)));
  const [history, setHistory] = useState<Shelf[]>([]);
  const [moves, setMoves] = useState(0);
  const [won, setWon] = useState(false);
  const [stuck, setStuck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showLevels, setShowLevels] = useState(false);

  const flyRef = useRef<Fly | null>(null);
  const beforeRef = useRef<Shelf | null>(null);
  const popRef = useRef<Pop | null>(null);
  const hintRef = useRef<{ column: number; t: number } | null>(null);
  const clockRef = useRef(0);

  const shelfRef = useRef(shelf);
  shelfRef.current = shelf;

  useEffect(() => {
    const restored = loadShelfSave(window.localStorage);
    setSave(restored);
    setShelf(cloneShelf(levelFor(restored.level)));
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    writeShelfSave(window.localStorage, save);
  }, [save, loaded]);

  const loadLevel = useCallback((level: number) => {
    flyRef.current = null;
    beforeRef.current = null;
    popRef.current = null;
    hintRef.current = null;

    setBusy(false);
    setShelf(cloneShelf(levelFor(level)));
    setHistory([]);
    setMoves(0);
    setWon(false);
    setStuck(false);
    setSave((s) => ({ ...s, level, best: Math.max(s.best, level) }));
  }, []);

  const take = useCallback((column: number) => {
    const current = shelfRef.current;
    if (!canTake(current, column)) return;

    const type = frontOf(current.columns[column]);
    if (type === null) return;

    const before = cloneShelf(current);
    const after = applyMove(current, { column });

    // The item lands in the first free slot of the tray it left behind.
    const slot = before.tray.length;

    // A set clearing is visible in the tray shrinking rather than growing.
    if (after.tray.length < before.tray.length + 1) {
      const slots: number[] = [];
      for (let i = 0; i < before.tray.length; i++) {
        if (before.tray[i] === type) slots.push(i);
      }
      slots.push(slot);
      popRef.current = { type, slots: slots.slice(0, MATCH), t: -0 };
    }

    beforeRef.current = before;
    flyRef.current = startFly(type, column, slot);
    hintRef.current = null;

    setBusy(true);
    setHistory((h) => [...h, before]);
    setShelf(after);
    setMoves((m) => m + 1);
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (flyRef.current !== null || won || stuck || showLevels) return;

      const canvas = canvasRef.current;
      if (canvas === null) return;

      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
      const y = ((event.clientY - rect.top) / rect.height) * canvas.height;

      const current = shelfRef.current;
      const layout = layoutShelf(
        current.columns.length,
        Math.max(1, ...current.columns.map((c) => c.length)),
        current.traySize,
        canvas.width,
        canvas.height,
      );

      const column = columnAt(layout, x, y);
      if (column !== null) take(column);
    },
    [showLevels, stuck, take, won],
  );

  const step = useCallback(() => {
    clockRef.current += FIXED_DT;

    const fly = flyRef.current;
    if (fly !== null) {
      const next = advanceFly(fly, FIXED_DT);
      if (isFlyDone(next)) {
        flyRef.current = null;
        beforeRef.current = null;
        setBusy(false);

        const current = shelfRef.current;
        if (isSolved(current)) setWon(true);
        else if (isStuck(current)) setStuck(true);
      } else {
        flyRef.current = next;
      }
    }

    const pop = popRef.current;
    if (pop !== null && flyRef.current === null) {
      const t = pop.t + FIXED_DT;
      popRef.current = t > POP_DURATION ? null : { ...pop, t };
    }

    const hinted = hintRef.current;
    if (hinted !== null) {
      const t = hinted.t + FIXED_DT;
      hintRef.current = t > HINT_DURATION ? null : { ...hinted, t };
    }
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return;

    const current = shelfRef.current;
    const before = beforeRef.current;
    const depth = Math.max(
      1,
      ...current.columns.map((c) => c.length),
      ...(before?.columns.map((c) => c.length) ?? [1]),
    );

    const layout = layoutShelf(
      current.columns.length,
      depth,
      current.traySize,
      canvas.width,
      canvas.height,
    );

    const state: DrawState = {
      shelf: current,
      before,
      fly: flyRef.current,
      pop: popRef.current,
      hinted: hintRef.current?.column ?? null,
      clock: clockRef.current,
    };

    drawScene(ctx, layout, state, canvas.width, canvas.height);
  }, []);

  useGameLoop({ step, draw, fixedDt: FIXED_DT, running: true });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    if (!won) return;
    setSave((s) => {
      const previous = s.movesByLevel[s.level];
      if (previous !== undefined && previous <= moves) return s;
      return { ...s, movesByLevel: { ...s.movesByLevel, [s.level]: moves } };
    });
  }, [won, moves]);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      popRef.current = null;
      setShelf(cloneShelf(h[h.length - 1]));
      setMoves((m) => Math.max(0, m - 1));
      setWon(false);
      setStuck(false);
      return h.slice(0, -1);
    });
  }, []);

  const showHint = useCallback(() => {
    const move = solveHint(shelfRef.current);
    hintRef.current = move === null ? null : { column: move.column, t: 0 };
  }, []);

  const params = paramsForLevel(save.level);

  return (
    <main className="min-h-dvh bg-[#0d0a15] px-4 py-5 text-[#f8f0e0]">
      <div className="relative mx-auto flex max-w-md flex-col gap-4">
        <div className="flex items-center justify-between">
          <Link
            href="/game"
            className="text-[10px] uppercase tracking-widest opacity-60"
          >
            &larr; Arcade
          </Link>
          <h1 className="text-sm font-bold uppercase tracking-[0.3em]">Shelf Sort</h1>
          <span className="w-14 text-right text-[10px] uppercase tracking-widest opacity-40">
            {params.traySize} slots
          </span>
        </div>

        <PixelPanel className="!p-2">
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            className="block h-[62vh] w-full touch-none select-none"
          />
        </PixelPanel>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs uppercase tracking-widest">
            <button
              type="button"
              onClick={() => setShowLevels(true)}
              className="underline decoration-dotted underline-offset-4"
            >
              Level {save.level}
            </button>
            <span className="opacity-60">Takes {moves}</span>
            <span className="opacity-60">Best {save.best}</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <PixelButton
              onClick={undo}
              disabled={history.length === 0 || busy}
              className="!px-1 !py-2 text-[10px]"
            >
              Undo
            </PixelButton>
            <PixelButton
              onClick={() => loadLevel(save.level)}
              disabled={busy}
              className="!px-1 !py-2 text-[10px]"
            >
              Reset
            </PixelButton>
            <PixelButton
              onClick={showHint}
              disabled={busy || stuck}
              className="!px-1 !py-2 text-[10px]"
            >
              Hint
            </PixelButton>
          </div>

          <p className="text-center text-[10px] uppercase tracking-widest opacity-40">
            Tap a shelf to bag its front item &middot; three match to clear
          </p>
        </div>

        {showLevels && (
          <LevelSelect
            best={save.best}
            current={save.level}
            scoreByLevel={save.movesByLevel}
            scoreLabel="takes"
            onPick={(level) => {
              setShowLevels(false);
              loadLevel(level);
            }}
            onClose={() => setShowLevels(false)}
          />
        )}

        {(won || stuck) && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 p-4">
            <PixelPanel className="w-full max-w-xs text-center">
              <h2 className="mb-1 text-lg font-bold uppercase tracking-widest">
                {won ? `Level ${save.level} clear` : "Bag is full"}
              </h2>
              <p className="mb-4 text-xs uppercase tracking-widest opacity-70">
                {won ? `${moves} takes` : "Nothing left to match"}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <PixelButton
                  onClick={won ? () => loadLevel(save.level) : undo}
                  className="!px-2 !py-2 text-[10px]"
                >
                  {won ? "Replay" : "Undo"}
                </PixelButton>
                <PixelButton
                  onClick={
                    won ? () => loadLevel(save.level + 1) : () => loadLevel(save.level)
                  }
                  className="!px-2 !py-2 text-[10px]"
                >
                  {won ? "Next" : "Restart"}
                </PixelButton>
              </div>
            </PixelPanel>
          </div>
        )}
      </div>
    </main>
  );
}
