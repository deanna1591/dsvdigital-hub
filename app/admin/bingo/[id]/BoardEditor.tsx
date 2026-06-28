"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BingoBoardRow, BingoBoardSquareRow } from "@/lib/types";
import { updateBoardMeta, updateSquare, publishBoard } from "../actions";

// Mirror server-side validation so we show readiness inline.
function findIssues(squares: BingoBoardSquareRow[]): string[] {
  const issues: string[] = [];
  if (squares.length !== 25) {
    issues.push(`Board has ${squares.length} squares (needs exactly 25)`);
    return issues;
  }
  for (const s of squares) {
    const label = `(${s.col + 1},${s.row + 1})`;
    if (!s.name || s.name.trim() === "" || s.name === "New square") {
      issues.push(`${label} needs a name`);
      continue;
    }
    if (s.is_free) continue; // FREE squares are auto-marked, prompts/points optional
    if (!s.prompt || s.prompt.trim() === "" || s.prompt === "Describe what to do") {
      issues.push(`"${s.name}" needs a prompt`);
    }
    if (s.points == null || s.points < 1) {
      issues.push(`"${s.name}" needs at least 1 point`);
    }
  }
  return issues;
}

export default function BoardEditor({
  board,
  squares,
}: {
  board: BingoBoardRow;
  squares: BingoBoardSquareRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingSquare, setEditingSquare] = useState<BingoBoardSquareRow | null>(null);
  const [editingMeta, setEditingMeta] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build a 5x5 lookup of squares by [row][col]
  const grid: (BingoBoardSquareRow | null)[][] = [];
  for (let r = 0; r < 5; r++) {
    const row: (BingoBoardSquareRow | null)[] = [];
    for (let c = 0; c < 5; c++) {
      row.push(squares.find((s) => s.row === r && s.col === c) ?? null);
    }
    grid.push(row);
  }

  function handleSaveMeta(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await updateBoardMeta(board.id, formData);
      if (res.error) setError(res.error);
      else {
        setEditingMeta(false);
        router.refresh();
      }
    });
  }

  function handleSaveSquare(formData: FormData) {
    setError(null);
    formData.set("id", editingSquare!.id);
    startTransition(async () => {
      const res = await updateSquare(formData);
      if (res.error) setError(res.error);
      else {
        setEditingSquare(null);
        router.refresh();
      }
    });
  }

  return (
    <div>
      {/* Board meta */}
      <div className="bg-paper border-[1.5px] border-graphite rounded-y2k p-5 shadow-[2px_2px_0_#272727] mb-6">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="text-4xl">{board.theme}</div>
          <div className="flex-1 min-w-0">
            <span
              className={`text-[10px] tracking-[0.1em] uppercase font-bold px-2 py-0.5 rounded-full border-[1.5px] border-graphite ${
                board.status === "live"
                  ? "bg-good text-paper"
                  : board.status === "draft"
                  ? "bg-cream"
                  : "bg-line text-ink-soft"
              }`}
            >
              {board.status}
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold mt-1">{board.title}</h1>
            <p className="text-sm text-ink-soft mt-0.5">
              {new Date(board.start_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              {" → "}
              {new Date(board.end_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <button
            onClick={() => setEditingMeta(!editingMeta)}
            className="btn btn-ghost text-xs"
          >
            {editingMeta ? "Cancel" : "✏️ Edit details"}
          </button>
        </div>

        {editingMeta && (
          <form action={handleSaveMeta} className="mt-4 pt-4 border-t border-line">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="title">Title</label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  className="input"
                  defaultValue={board.title}
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="theme">Theme emoji</label>
                <input id="theme" name="theme" type="text" className="input" defaultValue={board.theme} />
              </div>
              <div />
              <div>
                <label className="label" htmlFor="start_date">Starts</label>
                <input id="start_date" name="start_date" type="date" className="input" defaultValue={board.start_date} required />
              </div>
              <div>
                <label className="label" htmlFor="end_date">Ends</label>
                <input id="end_date" name="end_date" type="date" className="input" defaultValue={board.end_date} required />
              </div>
            </div>
            <button type="submit" disabled={pending} className="btn mt-3">
              {pending ? "Saving…" : "Save details"}
            </button>
          </form>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-error/10 border-[1.5px] border-error text-error text-sm rounded-lg">
          {error}
        </div>
      )}

      {/* 5x5 grid editor */}
      <div className="bg-paper border-[1.5px] border-graphite rounded-y2k p-4 shadow-[3px_3px_0_#272727]">
        {/* Readiness banner — only shown for draft boards */}
        {board.status === "draft" && (
          <ReadinessBanner squares={squares} boardId={board.id} />
        )}

        <p className="text-xs text-ink-soft mb-3">Click any square to edit its name, emoji, and prompt. Mark a square as FREE or as the LUCKY square.</p>
        <div className="grid grid-cols-5 gap-2 max-w-2xl mx-auto">
          {grid.flatMap((row, r) =>
            row.map((sq, c) => (
              <button
                key={`${r}-${c}`}
                onClick={() => sq && setEditingSquare(sq)}
                disabled={!sq}
                className={`aspect-square rounded-lg border-[1.5px] p-1.5 text-center transition-all flex flex-col items-center justify-center text-[10px] sm:text-xs leading-tight relative ${
                  !sq
                    ? "border-dashed border-line bg-cream/50 text-ink-faint"
                    : sq.is_free
                    ? "border-graphite bg-goldrush hover:bg-goldrush/80 cursor-pointer"
                    : sq.is_lucky
                    ? "border-graphite bg-lavender hover:bg-lavender/80 cursor-pointer"
                    : "border-graphite bg-paper hover:bg-cream cursor-pointer"
                }`}
              >
                {sq?.is_lucky && !sq.is_free && (
                  <span className="absolute top-0.5 left-0.5 text-[10px]">⭐</span>
                )}
                {sq ? (
                  <>
                    <div className="text-lg sm:text-xl leading-none mb-0.5">{sq.emoji}</div>
                    <div className="font-semibold line-clamp-2">{sq.name}</div>
                  </>
                ) : (
                  <span>—</span>
                )}
              </button>
            )),
          )}
        </div>
      </div>

      {/* Square edit modal */}
      {editingSquare && (
        <div
          className="fixed inset-0 bg-graphite/60 flex items-center justify-center z-[100] p-5"
          onClick={() => !pending && setEditingSquare(null)}
        >
          <div
            className="bg-paper rounded-y2k max-w-md w-full border-[1.5px] border-graphite overflow-hidden shadow-[4px_4px_0_#272727]"
            onClick={(e) => e.stopPropagation()}
          >
            <form action={handleSaveSquare}>
              <div className="px-5 pt-4 pb-3 border-b-[1.5px] border-graphite bg-cream">
                <h3 className="font-serif text-lg font-semibold">
                  Edit square ({editingSquare.col + 1}, {editingSquare.row + 1})
                </h3>
                <p className="text-xs text-ink-soft mt-0.5">
                  Column {editingSquare.col + 1}, Row {editingSquare.row + 1}
                </p>
              </div>

              <div className="px-5 py-4 space-y-3">
                <div className="grid grid-cols-[80px_1fr] gap-3">
                  <div>
                    <label className="label" htmlFor="sq-emoji">Emoji</label>
                    <input
                      id="sq-emoji"
                      name="emoji"
                      type="text"
                      className="input text-center text-xl"
                      defaultValue={editingSquare.emoji}
                      maxLength={4}
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="sq-name">Name</label>
                    <input
                      id="sq-name"
                      name="name"
                      type="text"
                      className="input"
                      defaultValue={editingSquare.name}
                      maxLength={40}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="label" htmlFor="sq-prompt">Prompt / instructions</label>
                  <textarea
                    id="sq-prompt"
                    name="prompt"
                    rows={3}
                    className="textarea"
                    defaultValue={editingSquare.prompt ?? ""}
                    maxLength={300}
                    placeholder="What does the employee need to do to claim this square?"
                  />
                </div>

                <div>
                  <label className="label" htmlFor="sq-points">Points earned for this square</label>
                  <input
                    id="sq-points"
                    name="points"
                    type="number"
                    className="input"
                    defaultValue={editingSquare.points ?? 5}
                    min={0}
                    max={500}
                    step={1}
                  />
                  <p className="text-[10px] text-ink-soft mt-1 italic">
                    Lucky squares get an additional +10 bonus on top of this.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 p-2.5 bg-cream border-[1.5px] border-line rounded-lg cursor-pointer hover:border-graphite transition-colors">
                    <input
                      type="checkbox"
                      name="is_free"
                      defaultChecked={editingSquare.is_free}
                      className="w-4 h-4 accent-goldrush"
                    />
                    <span className="text-xs">
                      <strong className="block">★ FREE square</strong>
                      <span className="text-ink-soft text-[10px]">Auto-marked for everyone</span>
                    </span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 bg-cream border-[1.5px] border-line rounded-lg cursor-pointer hover:border-graphite transition-colors">
                    <input
                      type="checkbox"
                      name="is_lucky"
                      defaultChecked={editingSquare.is_lucky}
                      className="w-4 h-4 accent-lavender"
                    />
                    <span className="text-xs">
                      <strong className="block">⭐ Lucky square</strong>
                      <span className="text-ink-soft text-[10px]">+10 bonus pts</span>
                    </span>
                  </label>
                </div>

                <p className="text-[10px] text-ink-faint italic">
                  Only one FREE and one LUCKY square per board. Setting these here will unset others.
                </p>
              </div>

              <div className="px-5 py-3 border-t border-line bg-cream flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingSquare(null)}
                  disabled={pending}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
                <button type="submit" disabled={pending} className="btn">
                  {pending ? "Saving…" : "Save square"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ReadinessBanner ─────────────────────────────────────────
/**
 * Sticky banner above the grid for draft boards. Shows the user
 * what (if anything) needs to be filled in before they can publish.
 * When the board is fully filled out, the publish button appears.
 */
function ReadinessBanner({
  squares,
  boardId,
}: {
  squares: BingoBoardSquareRow[];
  boardId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const issues = findIssues(squares);
  const ready = issues.length === 0;

  function handlePublish() {
    if (!ready) return;
    if (!confirm("Publish this board? Any currently-live board will be archived.")) return;
    setError(null);
    startTransition(async () => {
      const res = await publishBoard(boardId);
      if (res?.error) setError(res.error);
      else {
        router.push("/admin/bingo");
        router.refresh();
      }
    });
  }

  if (ready) {
    return (
      <div className="mb-4 p-3 bg-good/10 border-[1.5px] border-good rounded-y2k flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl">✓</span>
          <div>
            <strong className="text-sm">Board is ready</strong>
            <p className="text-xs text-ink-soft">All 25 squares filled in. You can publish.</p>
          </div>
        </div>
        <button
          onClick={handlePublish}
          disabled={pending}
          className="btn text-xs px-4 py-1.5 bg-good text-paper border-graphite"
        >
          {pending ? "Publishing…" : "▶ Publish board"}
        </button>
        {error && (
          <div className="w-full mt-2 p-2 text-xs bg-error/10 border border-error text-error rounded">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mb-4 p-3 bg-bubblegum/30 border-[1.5px] border-graphite rounded-y2k">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">⚠️</span>
        <div className="flex-1">
          <strong className="text-sm">Not ready to publish yet</strong>
          <p className="text-xs text-ink-soft">
            {issues.length} thing{issues.length === 1 ? "" : "s"} need attention before this board can go live.
          </p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-bold underline-offset-2 hover:underline"
        >
          {expanded ? "Hide" : "Show"} list
        </button>
      </div>
      {expanded && (
        <ul className="mt-2 ml-7 space-y-1 max-h-40 overflow-y-auto">
          {issues.map((issue, i) => (
            <li key={i} className="text-xs text-ink-soft">
              • {issue}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
