"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { LevelSelect } from "@/app/game/_shared/LevelSelect";
import { PixelButton, PixelPanel } from "@/app/game/_shared/pixel-ui";
import { useGameLoop } from "@/app/game/_shared/useGameLoop";
import {
  advanceFlight,
  advanceRebuff,
  isFlightDone,
  isRebuffDone,
  startFlight,
  startRebuff,
  type Flight,
  type Rebuff,
} from "./engine/anim";
import { levelFor, paramsForLevel } from "./engine/level";
import {
  applyMove,
  arrowAt,
  blockerOf,
  cloneBoard,
  coverage,
  exitPath,
  isSolved,
} from "./engine/rules";
import {
  defaultArrowsSave,
  loadArrowsSave,
  writeArrowsSave,
  type ArrowsSave,
} from "./engine/save";
import { hint as solveHint } from "./engine/solve";
import type { Board } from "./engine/types";
import { drawScene, type DrawState } from "./render/draw";
import { cellAt, layoutBoard } from "./render/layout";

const FIXED_DT = 1 / 60;

export default function ArrowsPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [save, setSave] = useState<ArrowsSave>(defaultArrowsSave);
  const [loaded, setLoaded] = useState(false);
  /**
   * Start empty and build the level on mount.
   *
   * Generating during render means it also runs on the server, and the two
   * results have to agree exactly or React tears the tree down and rebuilds it.
   * They did not: the module-level level cache is per-process, so a warm server
   * answered from a cache the fresh client did not have. Nothing about this
   * board needs to exist before the browser does.
   */
  const [board, setBoard] = useState<Board>(() => ({
    size: paramsForLevel(1).size,
    arrows: [],
  }));
  const [cleared, setCleared] = useState(0);
  const [misses, setMisses] = useState(0);
  const [won, setWon] = useState(false);
  const [showLevels, setShowLevels] = useState(false);

  const flightRef = useRef<Flight | null>(null);
  const rebuffRef = useRef<Rebuff | null>(null);
  const clockRef = useRef(0);
  const boardRef = useRef(board);
  boardRef.current = board;
  const loadedRef = useRef(false);

  useEffect(() => {
    const restored = loadArrowsSave(window.localStorage);
    const first = cloneBoard(levelFor(restored.level));

    // The ref goes first: the win check reads it, and a frame that ran between
    // this effect and the re-render would otherwise see the loaded flag against
    // the empty starting board and call it a win.
    boardRef.current = first;
    loadedRef.current = true;

    setSave(restored);
    setBoard(first);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    writeArrowsSave(window.localStorage, save);
  }, [save, loaded]);

  const loadLevel = useCallback((level: number) => {
    flightRef.current = null;
    rebuffRef.current = null;

    // Synchronously, for the same reason as on mount: the board being replaced
    // is usually the empty one just cleared, and a frame reading the old ref
    // against the new level would declare it won before it is drawn.
    const next = cloneBoard(levelFor(level));
    boardRef.current = next;

    setBoard(next);
    setMisses(0);
    setCleared(0);
    setWon(false);
    setSave((s) => ({ ...s, level, best: Math.max(s.best, level) }));
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (flightRef.current !== null || won || showLevels) return;

      const canvas = canvasRef.current;
      if (canvas === null) return;

      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
      const y = ((event.clientY - rect.top) / rect.height) * canvas.height;

      const current = boardRef.current;
      const layout = layoutBoard(current.size, canvas.width, canvas.height);

      const cell = cellAt(layout, x, y);
      if (cell === null) return;

      const arrow = arrowAt(current, cell.row, cell.col);
      if (arrow === null) return;

      const blocker = blockerOf(current, arrow.id);
      if (blocker !== null) {
        // A refused arrow calls out what stopped it. Telling the player only
        // that they were wrong teaches nothing; showing them the blocker is
        // what turns a lost heart into something they learn from.
        rebuffRef.current = startRebuff(arrow.id, blocker.id);
        setMisses((m) => m + 1);
        return;
      }

      // Logic commits now; the flight is presentation catching up.
      flightRef.current = startFlight(arrow, exitPath(current, arrow).length);
      rebuffRef.current = null;
      setBoard(applyMove(current, { id: arrow.id }));
      setCleared((c) => c + 1);
    },
    [showLevels, won],
  );

  const step = useCallback(() => {
    clockRef.current += FIXED_DT;

    const flight = flightRef.current;
    if (flight !== null) {
      const next = advanceFlight(flight, FIXED_DT);
      flightRef.current = isFlightDone(next) ? null : next;
    }

    const rebuff = rebuffRef.current;
    if (rebuff !== null) {
      const next = advanceRebuff(rebuff, FIXED_DT);
      rebuffRef.current = isRebuffDone(next) ? null : next;
    }

    /**
     * A standing condition, not the instant the last flight ends.
     *
     * The board is committed by a state update but read here through a ref
     * written during render, so the frame that finishes a flight can still be
     * looking at the board from before the move. Checked once on that edge, a
     * clear read at the wrong moment lost the win for good — the flight was
     * already discarded, so nothing checked again. Re-asking every frame costs
     * a comparison and at worst resolves a frame late.
     *
     * Gated on the level being loaded: until then the board is deliberately
     * empty, which is indistinguishable from a cleared one.
     */
    if (loadedRef.current && flightRef.current === null && isSolved(boardRef.current)) {
      setWon(true);
    }
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const ctx = canvas.getContext("2d");
    if (ctx === null) return;

    const current = boardRef.current;
    const layout = layoutBoard(current.size, canvas.width, canvas.height);

    const state: DrawState = {
      board: current,
      flight: flightRef.current,
      rebuff: rebuffRef.current,
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

  // Record the run when a level is cleared, keeping the fewest misses.
  useEffect(() => {
    if (!won) return;
    setSave((s) => {
      const previous = s.missesByLevel[s.level];
      if (previous !== undefined && previous <= misses) return s;
      return { ...s, missesByLevel: { ...s.missesByLevel, [s.level]: misses } };
    });
  }, [won, misses]);

  const showHint = useCallback(() => {
    const move = solveHint(boardRef.current);
    if (move === null) return;

    const current = boardRef.current;
    const arrow = current.arrows.find((a) => a.id === move.id);
    if (arrow === undefined) return;

    flightRef.current = startFlight(arrow, exitPath(current, arrow).length);
    rebuffRef.current = null;
    setBoard(applyMove(current, move));
    setCleared((c) => c + 1);
  }, []);

  const total = cleared + board.arrows.length;
  void coverage;

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
          <h1 className="text-sm font-bold uppercase tracking-[0.3em]">Arrow Escape</h1>
          <span className="w-14 text-right text-[10px] uppercase tracking-widest opacity-40">
            {misses === 0 ? "clean" : `${misses} miss`}
          </span>
        </div>

        <PixelPanel className="!p-2">
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            className="block aspect-square w-full touch-none select-none"
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
            <span className="opacity-60">
              {cleared}/{total}
            </span>
            <span className="opacity-60">Best {save.best}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <PixelButton
              onClick={() => loadLevel(save.level)}
              className="!px-1 !py-2 text-[10px]"
            >
              Reset
            </PixelButton>
            <PixelButton
              onClick={showHint}
              disabled={won}
              className="!px-1 !py-2 text-[10px]"
            >
              Hint
            </PixelButton>
          </div>

          <p className="text-center text-[10px] uppercase tracking-widest opacity-40">
            Tap an arrow with a clear path out
          </p>
        </div>

        {showLevels && (
          <LevelSelect
            best={save.best}
            current={save.level}
            scoreByLevel={save.missesByLevel}
            scoreLabel="fewest misses"
            onPick={(level) => {
              setShowLevels(false);
              loadLevel(level);
            }}
            onClose={() => setShowLevels(false)}
          />
        )}

        {won && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 p-4">
            <PixelPanel className="w-full max-w-xs text-center">
              <h2 className="mb-1 text-lg font-bold uppercase tracking-widest">
                Level {save.level} clear
              </h2>
              <p className="mb-4 text-xs uppercase tracking-widest opacity-70">
                {misses === 0 ? "clean run" : `${misses} miss${misses === 1 ? "" : "es"}`}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <PixelButton
                  onClick={() => loadLevel(save.level)}
                  className="!px-2 !py-2 text-[10px]"
                >
                  Replay
                </PixelButton>
                <PixelButton
                  onClick={() => loadLevel(save.level + 1)}
                  className="!px-2 !py-2 text-[10px]"
                >
                  Next
                </PixelButton>
              </div>
            </PixelPanel>
          </div>
        )}
      </div>
    </main>
  );
}
