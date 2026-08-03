"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PixelButton, PixelPanel } from "@/app/game/_shared/pixel-ui";
import { allCandidates, mergedGrid, valueAt } from "./engine/candidates";
import { explain, type Explanation } from "./engine/explain";
import { CELLS } from "./engine/grid";
import { emptyHistory, record, redo, undo, type Change, type History } from "./engine/history";
import { puzzleFor } from "./engine/generate";
import { clearStrikesAt, emptyMarks, setStrike, toggleStrike, visibleMarks, type Marks } from "./engine/marks";
import {
  decodeGrid,
  decodeMarks,
  defaultSudokuSave,
  encodeGrid,
  encodeMarks,
  loadSudokuSave,
  recordSolve,
  writeSudokuSave,
  type SudokuSave,
} from "./engine/save";
import { nextDeduction, placementOf, type Deduction } from "./engine/techniques";
import type { Board, Cell, Digit, Idx, Puzzle, Tier } from "./engine/types";
import { SudokuBoard } from "./ui/Board";
import { HintPanel } from "./ui/HintPanel";
import { Keypad } from "./ui/Keypad";
import { TierSelect } from "./ui/TierSelect";
import { highlightMap } from "./ui/highlight";
import { actionForKey, keypadAction, movedIndex } from "./ui/keys";

const clock = (ms: number): string => {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

export default function SudokuPage() {
  const [save, setSave] = useState<SudokuSave>(defaultSudokuSave);
  const [loaded, setLoaded] = useState(false);
  const [board, setBoard] = useState<Board | null>(null);
  const [history, setHistory] = useState<History>(emptyHistory);
  const [selected, setSelected] = useState<Idx | null>(null);
  const [armed, setArmed] = useState<Digit | null>(null);
  // A per-cell bitmask of digits the player has struck by hand — a display
  // annotation layer, never fed to the engine. Nothing under app/sudoku/engine
  // besides marks.ts and save.ts even has a parameter a Marks value could
  // travel through, so "the engine never sees a strike" is structural here,
  // not a discipline this file has to remember to keep.
  const [marks, setMarks] = useState<Marks>(emptyMarks);
  const [markMode, setMarkMode] = useState(false);
  const [mistakes, setMistakes] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [running, setRunning] = useState(true);
  const [hint, setHint] = useState<{ deduction: Deduction; explanation: Explanation } | null>(null);
  const [showTiers, setShowTiers] = useState(false);
  const [busy, setBusy] = useState(false);
  // Whether the player has committed a digit to this board. Gates the prefetch
  // — see the effect below for why. Reset on every deal, not derived from
  // `entries`, so undoing back to an empty board does not un-commit them.
  const [engaged, setEngaged] = useState(false);

  const seedRef = useRef(1);
  // Which dealt puzzle the stats effect has already recorded a solve for, so
  // undoing the winning move and redoing it cannot count the same win twice.
  // Compared by reference: a fresh deal (or a restore) always produces a new
  // `Puzzle` object, so the guard clears itself for free on the next puzzle.
  const recordedPuzzleRef = useRef<Puzzle | null>(null);
  // The next puzzle for the current tier, built during play. Tagged with what
  // it is a puzzle *of*, so a tier change or a seed skip falls through to a
  // fresh generation instead of dealing the wrong board.
  const prefetchRef = useRef<{ tier: Tier; seed: number; puzzle: Puzzle } | null>(null);
  const scheduleRef = useRef<{ frame: number | null; timer: number | null }>({
    frame: null,
    timer: null,
  });

  const cancelSchedule = useCallback(() => {
    const s = scheduleRef.current;
    if (s.frame !== null) cancelAnimationFrame(s.frame);
    if (s.timer !== null) window.clearTimeout(s.timer);
    s.frame = null;
    s.timer = null;
  }, []);

  const deal = useCallback((puzzle: Puzzle, seed: number) => {
    seedRef.current = seed;
    setBoard({ puzzle, entries: new Array(CELLS).fill(0) as Cell[] });
    setHistory(emptyHistory());
    setSelected(null);
    setArmed(null);
    setMarks(emptyMarks());
    setMarkMode(false);
    setMistakes(0);
    setElapsedMs(0);
    setRunning(true);
    setHint(null);
    setBusy(false);
    setEngaged(false);
  }, []);

  const startPuzzle = useCallback(
    (tier: Tier, seed: number) => {
      const ready = prefetchRef.current;
      prefetchRef.current = null;
      if (ready !== null && ready.tier === tier && ready.seed === seed) {
        deal(ready.puzzle, seed);
        return;
      }

      // Nothing prefetched for this tier and seed — a difficulty change, or a
      // click that outran the background build. Generation is up to 1.3s of
      // straight-line main-thread work, so the click that starts it must not
      // also be the thing that runs it: the button would never repaint and the
      // press would read as lost. Paint the disabled state first, then take the
      // thread.
      setBusy(true);
      cancelSchedule();

      // `finally`, not just the setBusy inside deal: if generation throws, the
      // deal never happens and busy would latch on, leaving every control
      // disabled with no way back. Nothing throws there today, but this same
      // wave added an exhaustiveness guard that does — reachable from grading,
      // which generation runs on every candidate board. A failed deal should
      // cost the player a puzzle, not the page.
      const run = () => {
        cancelSchedule();
        try {
          deal(puzzleFor(tier, seed), seed);
        } finally {
          setBusy(false);
        }
      };

      // Two frames deep, because a rAF callback runs *before* the paint of the
      // frame it was scheduled on — the second one is the first moment the busy
      // state is actually on screen. The timer is not a duplicate: a hidden tab
      // stops servicing rAF entirely, so on its own that chain would leave the
      // deal stranded until the player came back. Whichever fires first deals,
      // and cancels the other.
      scheduleRef.current.frame = requestAnimationFrame(() => {
        scheduleRef.current.frame = requestAnimationFrame(run);
      });
      scheduleRef.current.timer = window.setTimeout(run, 300);
    },
    [cancelSchedule, deal],
  );

  useEffect(() => cancelSchedule, [cancelSchedule]);

  // Restore a board if one was left mid-solve, otherwise deal a fresh one.
  useEffect(() => {
    const restored = loadSudokuSave(window.localStorage);
    setSave(restored);

    const p = restored.inProgress;
    if (p !== null) {
      seedRef.current = p.seed;
      setBoard({
        puzzle: {
          givens: decodeGrid(p.givens),
          solution: decodeGrid(p.solution),
          tier: p.tier,
          seed: p.seed,
        },
        entries: decodeGrid(p.entries),
      });
      setMarks(decodeMarks(p.marks));
      setElapsedMs(p.elapsedMs);
      setMistakes(p.mistakes);
    } else {
      startPuzzle(restored.tier, Date.now() % 100_000);
    }
    setLoaded(true);
  }, [startPuzzle]);

  const solved = useMemo(
    () => board !== null && mergedGrid(board).every((c, i) => c === board.puzzle.solution[i]),
    [board],
  );

  const puzzle = board?.puzzle ?? null;

  /**
   * Build the next puzzle for this tier while the player is working on the
   * current one — the same trick Traffic Jam uses for its next level, which
   * took that game from 8.5s a level to 1.2s.
   *
   * The seed arithmetic is exactly what New and Next puzzle use, so this is a
   * prefetch of the board that click would have produced, never a different
   * one: a seed still reproduces its puzzle. Keyed on the dealt `Puzzle` object
   * rather than on `board`, so a placement does not keep rescheduling it.
   *
   * Two things keep it out of the player's way, because generation is still
   * 0.7-1.2s of unbreakable main-thread work wherever it lands:
   *
   * Not until the first placement. A fixed timer after every deal freezes the
   * page while the player is still reading a board they have not decided to
   * keep — the worst possible moment, and one nothing covers the way `busy`
   * covers a click. Placing a digit is the point where they have committed to
   * this board, and from there they are far more likely to finish it and press
   * Next than to skip it. Someone who deals and immediately presses New gets no
   * prefetch and takes the busy path, which is exactly what that path is for.
   *
   * Then idle time, not a deadline. `requestIdleCallback` will not start the
   * work while the browser has input or rendering to do, so it slots into a gap
   * between keystrokes rather than landing in the middle of one. The timeout is
   * the backstop for when idle never arrives — a hidden tab services no idle
   * callbacks at all — and the setTimeout branch is for Safari, which still has
   * no rIC.
   */
  useEffect(() => {
    if (puzzle === null || busy || !engaged) return;
    const tier = puzzle.tier;
    const seed = seedRef.current + 1;

    const ready = prefetchRef.current;
    if (ready !== null && ready.tier === tier && ready.seed === seed) return;

    const build = () => {
      prefetchRef.current = { tier, seed, puzzle: puzzleFor(tier, seed) };
    };

    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(build, { timeout: 2000 });
      return () => window.cancelIdleCallback(handle);
    }
    const timer = window.setTimeout(build, 400);
    return () => window.clearTimeout(timer);
  }, [puzzle, busy, engaged]);

  // The timer stops when the tab is hidden. A player who alt-tabs away has not
  // spent that time on the puzzle, and a best time that says otherwise is a lie.
  useEffect(() => {
    const onVisibility = () => setRunning(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (!running || solved) return;
    const id = window.setInterval(() => setElapsedMs((ms) => ms + 1000), 1000);
    return () => window.clearInterval(id);
  }, [running, solved]);

  // Persist after every change, so closing the tab loses nothing.
  useEffect(() => {
    if (!loaded || board === null) return;
    const next: SudokuSave = {
      ...save,
      tier: board.puzzle.tier,
      inProgress: solved
        ? null
        : {
            tier: board.puzzle.tier,
            seed: seedRef.current,
            givens: encodeGrid(board.puzzle.givens),
            solution: encodeGrid(board.puzzle.solution),
            entries: encodeGrid(board.entries),
            marks: encodeMarks(marks),
            elapsedMs,
            mistakes,
          },
    };
    writeSudokuSave(window.localStorage, next);
    // `save` must be a dependency: the stats effect below updates it in
    // reaction to the same `solved` transition this effect cares about, but
    // that update lands on the next render. Without `save` here, that render
    // never re-runs this effect and the solve it just recorded is never
    // written to storage. This does not create a write loop — the body only
    // calls `writeSudokuSave`, never `setSave`.
  }, [board, elapsedMs, mistakes, solved, loaded, save, marks]);

  // Record the solve exactly once, on the transition into solved. `solved` is
  // not a terminal state — undoing the winning placement and redoing it flips
  // it false then true again while this listener is still live underneath the
  // win overlay — so a boolean transition alone is not a safe idempotency
  // check. The ref above, keyed on the puzzle instance, is.
  useEffect(() => {
    if (!solved || board === null) return;
    if (recordedPuzzleRef.current === board.puzzle) return;
    recordedPuzzleRef.current = board.puzzle;
    setSave((s) => recordSolve(s, board.puzzle.tier, elapsedMs));
  }, [solved]); // eslint-disable-line react-hooks/exhaustive-deps

  const candidates = useMemo(() => (board === null ? [] : allCandidates(board)), [board]);

  // What actually gets drawn: a stored strike on a digit the board no longer
  // offers is moot rather than deleted (see marks.ts), so this filters once
  // here rather than asking Cell to know that rule.
  const struck = useMemo(
    () => (board === null ? [] : marks.map((m, i) => visibleMarks(m, candidates[i]))),
    [board, marks, candidates],
  );

  const highlights = useMemo(
    () =>
      board === null
        ? []
        : highlightMap({
            board,
            candidates,
            selected,
            armed,
            hint: hint?.explanation.highlight ?? null,
          }),
    [board, candidates, selected, armed, hint],
  );

  const remaining = useMemo(() => {
    const counts = { 1: 9, 2: 9, 3: 9, 4: 9, 5: 9, 6: 9, 7: 9, 8: 9, 9: 9 } as Record<Digit, number>;
    if (board === null) return counts;
    for (const c of mergedGrid(board)) if (c !== 0) counts[c] -= 1;
    return counts;
  }, [board]);

  // Keypad disables a digit once its count hits zero but has no way to know
  // whether that digit is also the armed one — it would render armed *and*
  // disabled, and the player would have no way to un-arm it from the keypad.
  // Clearing here (rather than unconditionally after every placement) keeps
  // digit-first play intact: arming a digit still lets you place it in every
  // cell it still fits, and only drops once none are left.
  useEffect(() => {
    if (armed !== null && remaining[armed] === 0) setArmed(null);
  }, [armed, remaining]);

  const place = useCallback(
    (index: Idx, digit: Cell) => {
      if (board === null) return;
      if (board.puzzle.givens[index] !== 0) return;

      const before = board.entries[index];
      if (before === digit) return;

      const entries = [...board.entries] as Cell[];
      entries[index] = digit;
      setBoard({ ...board, entries });
      // Filling a cell — with a digit, or back to empty — retires whatever
      // was struck there. A strike is an opinion about which digits *could*
      // still go here; once the cell holds an answer (right or wrong) or is
      // cleared back to blank, that opinion has nothing left to be about.
      // This is not itself an undo step, the same way the mistake count below
      // is not: undoing the placement brings the digit back to `before`, not
      // the marks back to what they were — one asymmetry the codebase already
      // accepts elsewhere rather than a new one.
      setMarks((m) => clearStrikesAt(m, index));
      setHistory((h) => record(h, { kind: "place", index, before, after: digit }));
      setEngaged(true);
      if (digit !== 0 && digit !== board.puzzle.solution[index]) {
        setMistakes((m) => m + 1);
      }
    },
    [board],
  );

  const strike = useCallback(
    (index: Idx, digit: Digit) => {
      if (board === null) return;
      // valueAt covers both "given" and "already filled" in one check: a
      // filled cell shows no candidate grid, so there is nothing on screen
      // here to strike either way.
      if (valueAt(board, index) !== 0) return;

      const result = toggleStrike(marks, index, digit, candidates[index]);
      if (result === null) return; // not a live candidate — nothing to toggle
      setMarks(result.marks);
      setHistory((h) =>
        record(h, { kind: "strike", index, digit, before: result.before, after: result.after }),
      );
      setEngaged(true);
    },
    [board, marks, candidates],
  );

  const onPick = useCallback(
    (index: Idx) => {
      setHint(null);
      if (armed !== null) {
        place(index, armed);
        return;
      }
      setSelected(index);
    },
    [armed, place],
  );

  // Replays one Change in either direction. Undo and redo differ only in
  // which side of the Change they read, so both funnel through here rather
  // than duplicating the place/strike dispatch twice.
  const applyChange = useCallback((change: Change, dir: "before" | "after") => {
    if (change.kind === "place") {
      const value = dir === "before" ? change.before : change.after;
      setBoard((b) => {
        if (b === null) return b;
        const entries = [...b.entries] as Cell[];
        entries[change.index] = value;
        return { ...b, entries };
      });
      // A placement always retires that cell's strikes on the live path
      // (see `place` above); replaying one has to match, or a redo could
      // leave a struck mark stranded under a digit that was filled in a
      // different session's undo/redo dance than the one that struck it.
      setMarks((m) => clearStrikesAt(m, change.index));
      return;
    }
    const on = dir === "before" ? change.before : change.after;
    setMarks((m) => setStrike(m, change.index, change.digit, on));
  }, []);

  const doUndo = useCallback(() => {
    setHistory((h) => {
      const step = undo(h);
      if (step === null) return h;
      applyChange(step.change, "before");
      return step.history;
    });
  }, [applyChange]);

  const doRedo = useCallback(() => {
    setHistory((h) => {
      const step = redo(h);
      if (step === null) return h;
      applyChange(step.change, "after");
      return step.history;
    });
  }, [applyChange]);

  const showHint = useCallback(() => {
    if (board === null) return;

    // The engine reasons over the merged grid, which by design still carries
    // the player's wrong entries — they stay on the board in red rather than
    // being rejected. Placements, though, are graded against puzzle.solution,
    // so a deduction derived from a typo can recommend a digit the game then
    // paints red and counts as a mistake. The engine has no access to the
    // solution and should not have; this page does, so the reconciliation
    // belongs here. Drop the entries that disagree and reason from the truth
    // the player is working toward.
    const truthful = board.entries.map((c, i) =>
      c !== 0 && c !== board.puzzle.solution[i] ? 0 : c,
    ) as Cell[];

    const deduction = nextDeduction({ puzzle: board.puzzle, entries: truthful });
    if (deduction === null) return;
    setHint({ deduction, explanation: explain(deduction) });
  }, [board]);

  // A hint is a snapshot of one position, and every path that changes the
  // board invalidates it: the keypad, the keyboard, Apply, undo, redo. Clearing
  // it here rather than in each of them is the difference between a rule and a
  // habit — the keyboard, undo and redo paths were all missed the first time,
  // leaving a panel offering Apply on a board that no longer existed.
  useEffect(() => {
    setHint(null);
  }, [board]);

  const applyHint = useCallback(() => {
    if (hint === null) return;
    const move = placementOf(hint.deduction);
    if (move !== null) place(move.cell, move.digit);
    setHint(null);
  }, [hint, place]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // A deal in flight is about to replace the board; a keypress landing in
      // that window would be applied to a position on its way out.
      if (board === null || busy) return;

      const action = actionForKey(event.key, event.shiftKey);
      if (action === null) return;

      switch (action.kind) {
        case "digit":
          // Plain digit keys follow whichever mode the keypad is in — a
          // player who has turned mark mode on should not have it silently
          // stop applying just because they reached for the keyboard instead
          // of tapping. Shift+digit (the "strike" case below) is the
          // separate shortcut that works regardless of mode.
          if (selected !== null) {
            if (markMode) strike(selected, action.digit);
            else place(selected, action.digit);
          } else if (!markMode) {
            setArmed(action.digit);
          }
          return;
        case "strike":
          if (selected !== null) strike(selected, action.digit);
          return;
        case "erase":
          if (selected !== null) place(selected, 0);
          return;
        case "undo":
          doUndo();
          return;
        case "redo":
          doRedo();
          return;
        case "dismiss":
          // Every dismissible thing on screen, not just the two it used to
          // close: the difficulty modal offers only a Close button, so leaving
          // it open on Escape is the one case where the key visibly does
          // nothing.
          setArmed(null);
          setHint(null);
          setShowTiers(false);
          return;
        case "move":
          event.preventDefault();
          // Arrow navigation is cell-first, same as tapping a cell — keep it
          // exclusive with an armed digit the way onPick and onArm already do.
          setArmed(null);
          setSelected((s) => movedIndex(s ?? 0, action.delta) ?? s);
          return;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [board, busy, selected, markMode, place, strike, doUndo, doRedo]);

  if (board === null) {
    return (
      <main className="min-h-dvh bg-[#0d0a15] px-4 py-5 text-[#f8f0e0]">
        <p className="mx-auto max-w-md text-center text-[10px] uppercase tracking-widest opacity-40">
          Dealing…
        </p>
      </main>
    );
  }

  return (
    <main
      className="min-h-dvh bg-[#0d0a15] px-4 py-5 text-[#f8f0e0]"
      // Scroll room beneath the board while the hint panel is up. The panel is
      // fixed to the bottom of the viewport, so it can never hide below the
      // fold — but on a short window a long explanation can still reach up over
      // the board's last rows. This makes the page scrollable by more than the
      // panel is tall, so every row can be brought clear of it. An inline style
      // rather than a class because it has to beat py-5's padding-bottom, and
      // which of two Tailwind utilities wins depends on stylesheet order, not
      // on the order they are written here.
      style={hint !== null ? { paddingBottom: 280 } : undefined}
    >
      <div className="relative mx-auto flex max-w-md flex-col gap-4">
        <div className="flex items-center justify-between">
          <Link href="/game" className="text-[10px] uppercase tracking-widest opacity-60">
            &larr; Arcade
          </Link>
          <h1 className="text-sm font-bold uppercase tracking-[0.3em]">Sudoku</h1>
          <span className="w-14 text-right text-[10px] uppercase tracking-widest opacity-40">
            {clock(elapsedMs)}
          </span>
        </div>

        <SudokuBoard
          board={board}
          candidates={candidates}
          struck={struck}
          highlights={highlights}
          onPick={onPick}
        />

        <Keypad
          remaining={remaining}
          armed={armed}
          markMode={markMode}
          struckAtSelected={selected !== null ? struck[selected] : 0}
          onArm={(d) => {
            const action = keypadAction(d, selected, markMode);
            if (action.kind === "place") {
              place(action.cell, action.digit);
              return;
            }
            if (action.kind === "strike") {
              // Keep the selection: striking is meant to repeat on one cell
              // for several digits in a row, the way place already does for
              // the same reason.
              strike(action.cell, action.digit);
              return;
            }
            setArmed(action.kind === "arm" ? action.digit : null);
            setSelected(null);
          }}
          onErase={() => selected !== null && place(selected, 0)}
          onToggleMarkMode={() => {
            setMarkMode((m) => !m);
            // Digit-first arming and pencil marking are two different
            // gestures for the same keypad tap; leaving a digit armed across
            // the switch would let one bleed into the other.
            setArmed(null);
          }}
        />

        <div className="flex items-center justify-between text-xs uppercase tracking-widest">
          <button
            type="button"
            onClick={() => setShowTiers(true)}
            disabled={busy}
            className="underline decoration-dotted underline-offset-4 disabled:no-underline disabled:opacity-40"
          >
            {board.puzzle.tier}
          </button>
          <span className="opacity-60">
            {busy ? "Dealing…" : `Mistakes ${mistakes}`}
          </span>
        </div>

        {/* Everything here acts on the board about to be replaced, so all four
            go down together while a puzzle is being built. */}
        <div className="grid grid-cols-4 gap-2">
          <PixelButton onClick={doUndo} disabled={busy} className="!px-1 !py-2 text-[10px]">
            Undo
          </PixelButton>
          <PixelButton onClick={doRedo} disabled={busy} className="!px-1 !py-2 text-[10px]">
            Redo
          </PixelButton>
          <PixelButton onClick={showHint} disabled={busy} className="!px-1 !py-2 text-[10px]">
            Hint
          </PixelButton>
          <PixelButton
            onClick={() => startPuzzle(board.puzzle.tier, seedRef.current + 1)}
            disabled={busy}
            className="!px-1 !py-2 text-[10px]"
          >
            {busy ? "…" : "New"}
          </PixelButton>
        </div>

        {hint !== null && (
          <HintPanel
            explanation={hint.explanation}
            canApply={placementOf(hint.deduction) !== null}
            onApply={applyHint}
            onClose={() => setHint(null)}
          />
        )}

        {showTiers && (
          <TierSelect
            stats={save.stats}
            current={board.puzzle.tier}
            onPick={(tier) => {
              setShowTiers(false);
              startPuzzle(tier, seedRef.current + 1);
            }}
            onClose={() => setShowTiers(false)}
          />
        )}

        {solved && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 p-4">
            <PixelPanel className="w-full max-w-xs text-center">
              <h2 className="mb-1 text-lg font-bold uppercase tracking-widest">Solved</h2>
              <p className="mb-4 text-xs uppercase tracking-widest opacity-70">
                {clock(elapsedMs)} · {mistakes} mistakes
              </p>
              <PixelButton
                onClick={() => startPuzzle(board.puzzle.tier, seedRef.current + 1)}
                disabled={busy}
                className="w-full !px-2 !py-2 text-[10px]"
              >
                {busy ? "Dealing…" : "Next puzzle"}
              </PixelButton>
            </PixelPanel>
          </div>
        )}
      </div>
    </main>
  );
}
