"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { BingoBoardRow } from "@/lib/types";
import { createBoard, publishBoard, archiveBoard, unpublishBoard, deleteBoard } from "./actions";

const STATUS_PILL: Record<string, string> = {
  live: "bg-good text-paper",
  draft: "bg-cream text-graphite",
  past: "bg-line text-ink-soft",
};

export default function BoardsList({ boards }: { boards: BingoBoardRow[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Default new board dates: Monday this week → Sunday this week
  const today = new Date();
  const day = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createBoard(formData);
      if (res.error) {
        setError(res.error);
      } else if (res.ok && res.id) {
        router.push(`/admin/bingo/${res.id}`);
      }
    });
  }

  function handlePublish(id: string) {
    if (!confirm("Publish this board? Any currently-live board will be archived.")) return;
    startTransition(async () => {
      const res = await publishBoard(id);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  function handleArchive(id: string) {
    if (!confirm("Archive this board?")) return;
    startTransition(async () => {
      const res = await archiveBoard(id);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  function handleUnpublish(id: string) {
    if (!confirm("Move back to draft? It will no longer be visible to employees.")) return;
    startTransition(async () => {
      const res = await unpublishBoard(id);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This removes all squares and claims permanently.`)) return;
    startTransition(async () => {
      const res = await deleteBoard(id);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  const liveBoard = boards.find((b) => b.status === "live");
  const draftBoards = boards.filter((b) => b.status === "draft");
  const archivedBoards = boards.filter((b) => b.status === "past");

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setCreating(!creating)} className="btn">
          {creating ? "Cancel" : "+ New board"}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-error/10 border-[1.5px] border-error text-error text-sm rounded-lg">
          {error}
        </div>
      )}

      {creating && (
        <form
          action={handleCreate}
          className="mb-6 bg-paper border-[1.5px] border-graphite rounded-y2k p-5 shadow-[2px_2px_0_#E6ABE1]"
        >
          <h2 className="font-serif text-lg font-semibold mb-3">New bingo board</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="title">Title</label>
              <input
                id="title"
                name="title"
                type="text"
                className="input"
                required
                maxLength={80}
                placeholder="e.g. June 2026 — Hump Day Edition"
                autoFocus
              />
            </div>
            <div>
              <label className="label" htmlFor="theme">Theme emoji</label>
              <input
                id="theme"
                name="theme"
                type="text"
                className="input"
                defaultValue="🎲"
                maxLength={4}
              />
            </div>
            <div />
            <div>
              <label className="label" htmlFor="start_date">Starts</label>
              <input
                id="start_date"
                name="start_date"
                type="date"
                className="input"
                defaultValue={monday.toISOString().slice(0, 10)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="end_date">Ends</label>
              <input
                id="end_date"
                name="end_date"
                type="date"
                className="input"
                defaultValue={sunday.toISOString().slice(0, 10)}
                required
              />
            </div>
          </div>
          <p className="text-xs text-ink-soft mt-3 italic">
            Creates a draft board with 25 blank squares. You'll be taken to the editor to fill them in.
          </p>
          <button type="submit" disabled={pending} className="btn mt-3 w-full">
            {pending ? "Creating…" : "Create and edit →"}
          </button>
        </form>
      )}

      {/* Live board section */}
      <section className="mb-8">
        <h2 className="font-serif text-xl font-semibold mb-3">Live now</h2>
        {liveBoard ? (
          <BoardCard
            board={liveBoard}
            pending={pending}
            onArchive={() => handleArchive(liveBoard.id)}
            onUnpublish={() => handleUnpublish(liveBoard.id)}
            onDelete={() => handleDelete(liveBoard.id, liveBoard.title)}
          />
        ) : (
          <div className="bg-paper border-[1.5px] border-dashed border-line rounded-y2k p-6 text-center text-ink-soft">
            <p className="text-sm">
              No live board. Publish a draft to show it to the team.
            </p>
          </div>
        )}
      </section>

      {/* Drafts */}
      <section className="mb-8">
        <h2 className="font-serif text-xl font-semibold mb-3">Drafts ({draftBoards.length})</h2>
        {draftBoards.length === 0 ? (
          <p className="text-sm text-ink-soft italic">No drafts yet.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {draftBoards.map((b) => (
              <BoardCard
                key={b.id}
                board={b}
                pending={pending}
                onPublish={() => handlePublish(b.id)}
                onDelete={() => handleDelete(b.id, b.title)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Archived */}
      {archivedBoards.length > 0 && (
        <section>
          <h2 className="font-serif text-xl font-semibold mb-3">
            Archived ({archivedBoards.length})
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {archivedBoards.map((b) => (
              <BoardCard
                key={b.id}
                board={b}
                pending={pending}
                onPublish={() => handlePublish(b.id)}
                onDelete={() => handleDelete(b.id, b.title)}
                compact
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function BoardCard({
  board,
  pending,
  onPublish,
  onArchive,
  onUnpublish,
  onDelete,
  compact = false,
}: {
  board: BingoBoardRow;
  pending: boolean;
  onPublish?: () => void;
  onArchive?: () => void;
  onUnpublish?: () => void;
  onDelete?: () => void;
  compact?: boolean;
}) {
  const start = new Date(board.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const end = new Date(board.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div
      className={`bg-paper border-[1.5px] border-graphite rounded-y2k shadow-[2px_2px_0_#272727] p-4 ${
        compact ? "opacity-75" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="text-3xl shrink-0">{board.theme}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap">
            <strong className="font-serif font-semibold text-base">{board.title}</strong>
            <span
              className={`text-[10px] tracking-[0.1em] uppercase font-bold px-2 py-0.5 rounded-full border-[1.5px] border-graphite ${
                STATUS_PILL[board.status]
              }`}
            >
              {board.status}
            </span>
          </div>
          <p className="text-xs text-ink-soft mt-0.5">
            {start} → {end}
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-3 flex-wrap">
        <Link
          href={`/admin/bingo/${board.id}`}
          className="text-xs font-bold text-graphite underline-offset-2 hover:underline"
        >
          ✏️ Edit squares
        </Link>
        {onPublish && (
          <button
            onClick={onPublish}
            disabled={pending}
            className="text-xs font-bold text-good underline-offset-2 hover:underline"
          >
            ▶ Publish
          </button>
        )}
        {onUnpublish && (
          <button
            onClick={onUnpublish}
            disabled={pending}
            className="text-xs font-bold text-bronze underline-offset-2 hover:underline"
          >
            ⏸ Move to draft
          </button>
        )}
        {onArchive && (
          <button
            onClick={onArchive}
            disabled={pending}
            className="text-xs font-bold text-ink-soft underline-offset-2 hover:underline"
          >
            📦 Archive
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            disabled={pending}
            className="text-xs font-bold text-error underline-offset-2 hover:underline ml-auto"
          >
            🗑 Delete
          </button>
        )}
      </div>
    </div>
  );
}
