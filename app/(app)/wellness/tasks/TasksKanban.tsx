"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTask, moveTask, toggleTaskDone, deleteTask, type Bucket } from "./actions";

type Task = {
  id: string;
  text: string;
  bucket: Bucket;
  position: number;
  completed_at: string | null;
  created_at: string;
};

const COLUMNS: { id: Bucket; label: string; emoji: string; color: string; description: string }[] = [
  { id: "today",       label: "Today",       emoji: "🌅", color: "var(--goldrush)",  description: "Doing now" },
  { id: "tomorrow",    label: "Tomorrow",    emoji: "🌙", color: "var(--lavender)",  description: "Next up" },
  { id: "someday",     label: "Someday",     emoji: "✨", color: "var(--bubblegum)", description: "Eventually" },
  { id: "brain_dump",  label: "Brain Dump",  emoji: "💭", color: "var(--frost)",     description: "Just noting it" },
];

export default function TasksKanban({ tasks }: { tasks: Task[] }) {
  return (
    <div>
      <div className="mb-6">
        <span className="text-[10px] tracking-[0.2em] uppercase text-ink-soft font-bold">Tasks</span>
        <h2 className="font-serif text-2xl sm:text-3xl font-semibold mt-1">Your brain on paper</h2>
        <p className="text-sm text-ink-soft mt-1">
          Capture what's swirling. Move it between columns as things shift. Private to you.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map((col) => (
          <TaskColumn
            key={col.id}
            column={col}
            tasks={tasks
              .filter((t) => t.bucket === col.id)
              .sort((a, b) => a.position - b.position)}
          />
        ))}
      </div>
    </div>
  );
}

function TaskColumn({
  column,
  tasks,
}: {
  column: { id: Bucket; label: string; emoji: string; color: string; description: string };
  tasks: Task[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleCreate(formData: FormData) {
    setError(null);
    formData.set("bucket", column.id);
    startTransition(async () => {
      const res = await createTask(formData);
      if (res?.error) setError(res.error);
      else {
        setAdding(false);
        router.refresh();
      }
    });
  }

  const activeCount = tasks.filter((t) => !t.completed_at).length;

  return (
    <div
      className="border-[1.5px] border-graphite rounded-y2k shadow-[3px_3px_0_#272727] overflow-hidden flex flex-col min-h-[240px]"
      style={{ background: "var(--paper)" }}
    >
      {/* Header */}
      <div
        className="px-3 py-2.5 border-b-[1.5px] border-graphite flex items-center justify-between gap-2"
        style={{ background: column.color }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg shrink-0">{column.emoji}</span>
          <div className="min-w-0">
            <div className="font-serif font-semibold text-sm leading-tight">{column.label}</div>
            <div className="text-[10px] tracking-wider uppercase font-bold text-ink-soft truncate">
              {column.description}
            </div>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border-[1.5px] border-graphite bg-paper">
          {activeCount}
        </span>
      </div>

      {/* Task list */}
      <ul className="flex-1 p-2.5 space-y-1.5">
        {tasks.length === 0 && !adding && (
          <li className="text-[11px] text-ink-faint italic text-center py-4">Empty — add one below</li>
        )}
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </ul>

      {/* Add input */}
      <div className="p-2.5 border-t border-line">
        {adding ? (
          <form action={handleCreate}>
            <input
              type="text"
              name="text"
              className="input text-sm py-1.5"
              placeholder="What's on your mind?"
              required
              maxLength={200}
              autoFocus
              disabled={pending}
            />
            {error && <div className="text-[10px] text-error mt-1">{error}</div>}
            <div className="flex gap-1 mt-1.5">
              <button type="submit" disabled={pending} className="btn text-[11px] py-1 px-2 flex-1">
                {pending ? "…" : "Add"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setError(null);
                }}
                className="btn btn-ghost text-[11px] py-1 px-2"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full text-xs text-ink-soft hover:text-graphite font-semibold py-1.5 hover:bg-cream rounded border-[1.5px] border-dashed border-line hover:border-graphite transition-colors"
          >
            + Add
          </button>
        )}
      </div>
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const isDone = !!task.completed_at;

  function handleToggleDone() {
    startTransition(async () => {
      await toggleTaskDone(task.id, isDone);
      router.refresh();
    });
  }
  function handleMove(bucket: Bucket) {
    setMenuOpen(false);
    startTransition(async () => {
      await moveTask(task.id, bucket);
      router.refresh();
    });
  }
  function handleDelete() {
    setMenuOpen(false);
    startTransition(async () => {
      await deleteTask(task.id);
      router.refresh();
    });
  }

  return (
    <li className="relative">
      <div
        className={`border-[1.5px] border-graphite rounded-lg p-2 bg-paper text-xs flex items-start gap-2 ${
          isDone ? "opacity-50" : ""
        } ${pending ? "opacity-60" : ""}`}
      >
        <button
          onClick={handleToggleDone}
          disabled={pending}
          className={`mt-0.5 w-4 h-4 shrink-0 rounded border-[1.5px] border-graphite flex items-center justify-center text-[10px] font-bold transition-colors ${
            isDone ? "bg-lavender text-graphite" : "bg-paper"
          }`}
          aria-label={isDone ? "Mark not done" : "Mark done"}
        >
          {isDone ? "✓" : ""}
        </button>
        <span className={`flex-1 leading-snug ${isDone ? "line-through" : ""}`}>{task.text}</span>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          disabled={pending}
          className="shrink-0 text-ink-faint hover:text-graphite text-base leading-none px-1"
          aria-label="More actions"
        >
          ⋯
        </button>
      </div>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-40 bg-paper border-[1.5px] border-graphite rounded-lg shadow-[3px_3px_0_#272727] py-1 min-w-[140px]">
            <div className="px-2 py-1 text-[10px] tracking-wider uppercase font-bold text-ink-faint border-b border-line">
              Move to
            </div>
            {(["today", "tomorrow", "someday", "brain_dump"] as Bucket[])
              .filter((b) => b !== task.bucket)
              .map((b) => (
                <button
                  key={b}
                  onClick={() => handleMove(b)}
                  className="block w-full text-left px-3 py-1.5 text-xs hover:bg-cream font-medium"
                >
                  {labelFor(b)}
                </button>
              ))}
            <div className="border-t border-line my-1" />
            <button
              onClick={handleDelete}
              className="block w-full text-left px-3 py-1.5 text-xs hover:bg-error/10 text-error font-medium"
            >
              🗑 Delete
            </button>
          </div>
        </>
      )}
    </li>
  );
}

function labelFor(b: Bucket): string {
  const c = COLUMNS.find((x) => x.id === b);
  return c ? `${c.emoji} ${c.label}` : b;
}
