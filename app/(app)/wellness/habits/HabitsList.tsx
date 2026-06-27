"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createHabit, toggleCompletion, deleteHabit, saveReflection } from "./actions";

type Habit = {
  id: string;
  name: string;
  emoji: string;
  created_at: string;
};

type Completion = {
  habit_id: string;
  completed_on: string;
};

type Reflection = {
  habit_id: string;
  streak_count: number;
  what_works: string | null;
  what_is_hard: string | null;
};

const EMOJI_CHOICES = ["🌱", "💧", "🚶", "📚", "🧘", "💪", "✍️", "🎨", "🎵", "☕", "🌅", "🌙"];

export default function HabitsList({
  habits,
  completions,
  reflections,
}: {
  habits: Habit[];
  completions: Completion[];
  reflections: Reflection[];
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createHabit(formData);
      if (res?.error) setError(res.error);
      else {
        setCreating(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-paper border-[1.5px] border-graphite rounded-y2k shadow-[4px_4px_0_#E6ABE1] p-6 mb-6">
        <div className="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
          <div>
            <span className="text-[10px] tracking-[0.2em] uppercase text-ink-soft font-bold">Habits</span>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold mt-1">Build small, repeat</h2>
            <p className="text-sm text-ink-soft mt-1">Tap to mark done today. Reflect every 7 days.</p>
          </div>
          <button onClick={() => setCreating(!creating)} className="btn text-sm">
            {creating ? "Cancel" : "+ Add"}
          </button>
        </div>

        {creating && (
          <form action={handleCreate} className="bg-cream border-[1.5px] border-line rounded-lg p-4 mb-4">
            <label htmlFor="habit-name" className="label">Habit name</label>
            <input
              id="habit-name"
              name="name"
              type="text"
              className="input"
              required
              maxLength={60}
              placeholder="e.g. Drink water, Walk 15 min, Journal"
              autoFocus
            />
            <label className="label mt-3">Emoji</label>
            <EmojiPicker name="emoji" defaultValue="🌱" />
            {error && (
              <div className="mt-3 p-2 bg-error/10 border-[1.5px] border-error text-error text-xs rounded">
                {error}
              </div>
            )}
            <button type="submit" disabled={pending} className="btn mt-3 w-full">
              {pending ? "Adding…" : "Add habit"}
            </button>
          </form>
        )}

        {habits.length === 0 && !creating && (
          <div className="text-center py-8 text-ink-soft">
            <div className="text-4xl mb-2">🌱</div>
            <p className="text-sm">No habits yet. Start with one — small and specific.</p>
          </div>
        )}

        <ul className="space-y-3">
          {habits.map((h) => (
            <HabitRow
              key={h.id}
              habit={h}
              completions={completions.filter((c) => c.habit_id === h.id)}
              reflections={reflections.filter((r) => r.habit_id === h.id)}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

function HabitRow({
  habit,
  completions,
  reflections,
}: {
  habit: Habit;
  completions: Completion[];
  reflections: Reflection[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reflecting, setReflecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build set of dates completed
  const completedDates = new Set(completions.map((c) => c.completed_on));

  // Today + last 7 days
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const isDoneToday = completedDates.has(todayISO);

  // Generate last 7 days (oldest → newest, today last)
  const last7: { iso: string; label: string; done: boolean }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    last7.push({
      iso,
      label: d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1),
      done: completedDates.has(iso),
    });
  }

  // Current streak = consecutive done days back from today (or yesterday if today not done)
  const currentStreak = computeStreak(completedDates);
  const totalCompletions = completions.length;

  // Reflection logic — show reflection prompt at every multiple of 7 in current streak
  const nextReflectionStreak = currentStreak > 0 && currentStreak % 7 === 0 ? currentStreak : null;
  const hasReflectionForStreak =
    nextReflectionStreak != null &&
    reflections.some((r) => r.streak_count === nextReflectionStreak);
  const showReflectionPrompt = nextReflectionStreak != null && !hasReflectionForStreak;

  function handleToggle() {
    setError(null);
    startTransition(async () => {
      const res = await toggleCompletion(habit.id, todayISO);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm(`Delete "${habit.name}"? Streak history will be lost.`)) return;
    startTransition(async () => {
      const res = await deleteHabit(habit.id);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  function handleReflection(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await saveReflection(formData);
      if (res?.error) setError(res.error);
      else {
        setReflecting(false);
        router.refresh();
      }
    });
  }

  return (
    <li className="bg-cream border-[1.5px] border-graphite rounded-y2k p-4">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-paper border-[1.5px] border-graphite flex items-center justify-center text-2xl shrink-0">
          {habit.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap mb-2">
            <strong className="font-serif font-semibold text-base">{habit.name}</strong>
            {currentStreak > 0 && (
              <span className="text-[10px] tracking-[0.1em] uppercase font-bold px-2 py-0.5 rounded-full border-[1.5px] border-graphite bg-lavender">
                🔥 {currentStreak}-day streak
              </span>
            )}
            <span className="text-[10px] text-ink-faint font-medium ml-auto">
              {totalCompletions} total
            </span>
          </div>

          {/* 7-day dots */}
          <div className="flex gap-1.5 mb-3">
            {last7.map((d, i) => {
              const isToday = i === 6;
              return (
                <div
                  key={d.iso}
                  className={`flex flex-col items-center gap-0.5 ${isToday ? "" : ""}`}
                  title={d.iso}
                >
                  <div
                    className={`w-6 h-6 rounded-full border-[1.5px] border-graphite ${
                      d.done ? "bg-lavender" : "bg-paper"
                    } ${isToday ? "shadow-[0_0_0_2px_var(--goldrush)]" : ""}`}
                  />
                  <span className="text-[9px] text-ink-faint font-bold">{d.label}</span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleToggle}
              disabled={pending}
              className={`btn text-xs px-4 py-1.5 ${
                isDoneToday ? "bg-lavender" : ""
              }`}
            >
              {pending ? "…" : isDoneToday ? "✓ Done today" : "Mark done today"}
            </button>
            <button
              onClick={handleDelete}
              disabled={pending}
              className="text-xs text-ink-faint hover:text-error font-semibold"
              aria-label="Delete habit"
            >
              🗑 Delete
            </button>
          </div>

          {showReflectionPrompt && !reflecting && (
            <div className="mt-3 p-3 bg-bubblegum/50 border-[1.5px] border-graphite rounded-lg">
              <p className="text-sm font-semibold mb-1">🎉 {currentStreak} days in a row!</p>
              <p className="text-xs text-ink-soft mb-2">Take a moment to reflect on this stretch.</p>
              <button onClick={() => setReflecting(true)} className="text-xs font-bold underline">
                Reflect now →
              </button>
            </div>
          )}

          {reflecting && nextReflectionStreak != null && (
            <form action={handleReflection} className="mt-3 p-3 bg-paper border-[1.5px] border-graphite rounded-lg">
              <input type="hidden" name="habit_id" value={habit.id} />
              <input type="hidden" name="streak_count" value={nextReflectionStreak} />
              <p className="text-xs font-semibold mb-2">Day {nextReflectionStreak} reflection</p>
              <label className="label" htmlFor={`works-${habit.id}`}>What's working?</label>
              <textarea
                id={`works-${habit.id}`}
                name="what_works"
                rows={2}
                className="textarea"
                placeholder="Anything that's helped the habit stick…"
              />
              <label className="label mt-2" htmlFor={`hard-${habit.id}`}>What's been hard?</label>
              <textarea
                id={`hard-${habit.id}`}
                name="what_is_hard"
                rows={2}
                className="textarea"
                placeholder="Anything getting in the way…"
              />
              <div className="flex gap-2 mt-2">
                <button type="submit" disabled={pending} className="btn flex-1 text-xs">
                  {pending ? "Saving…" : "Save reflection"}
                </button>
                <button
                  type="button"
                  onClick={() => setReflecting(false)}
                  className="btn btn-ghost flex-1 text-xs"
                >
                  Later
                </button>
              </div>
            </form>
          )}

          {error && (
            <div className="mt-2 p-2 bg-error/10 border-[1.5px] border-error text-error text-xs rounded">
              {error}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function EmojiPicker({ name, defaultValue }: { name: string; defaultValue: string }) {
  const [selected, setSelected] = useState(defaultValue);
  return (
    <>
      <input type="hidden" name={name} value={selected} />
      <div className="grid grid-cols-6 gap-1.5">
        {EMOJI_CHOICES.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setSelected(e)}
            className={`text-xl py-2 rounded-lg border-[1.5px] transition-all ${
              selected === e
                ? "border-graphite bg-lavender shadow-[2px_2px_0_#272727]"
                : "border-line hover:border-graphite bg-paper"
            }`}
          >
            {e}
          </button>
        ))}
      </div>
    </>
  );
}

function computeStreak(completedDates: Set<string>): number {
  let streak = 0;
  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  let startDay = new Date(today);
  // If today isn't done, start counting from yesterday (streak isn't broken yet)
  if (!completedDates.has(todayISO)) {
    startDay.setDate(startDay.getDate() - 1);
  }
  // Walk backward until we hit a non-done day
  for (let i = 0; i < 365; i++) {
    const iso = startDay.toISOString().slice(0, 10);
    if (completedDates.has(iso)) {
      streak++;
      startDay.setDate(startDay.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
