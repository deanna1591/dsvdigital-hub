"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleSparkActive, updateSpark, createSpark } from "./actions";

type Spark = {
  id: string;
  day_of_year: number;
  title: string;
  prompt: string;
  emoji: string;
  color: string;
  points: number;
  proof_type: string;
  is_active: boolean;
};

export default function SparksList({ sparks, todayDayOfYear }: { sparks: Spark[]; todayDayOfYear: number }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle(spark: Spark) {
    startTransition(async () => {
      await toggleSparkActive(spark.id, spark.is_active);
      router.refresh();
    });
  }

  function handleUpdate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await updateSpark(formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setEditingId(null);
        router.refresh();
      }
    });
  }

  function handleCreate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createSpark(formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setCreating(false);
        router.refresh();
      }
    });
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-serif text-xl font-semibold">All sparks ({sparks.length})</h2>
        <button
          onClick={() => setCreating(!creating)}
          className="btn text-sm"
        >
          {creating ? "Cancel" : "+ New spark"}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-error/10 border-[1.5px] border-error text-error text-sm rounded-lg">
          {error}
        </div>
      )}

      {creating && (
        <form action={handleCreate} className="bg-paper border-[1.5px] border-graphite rounded-y2k p-5 mb-4 shadow-[2px_2px_0_#E6ABE1]">
          <h3 className="font-serif text-lg font-semibold mb-3">New spark</h3>
          <SparkFields defaultDay={todayDayOfYear} />
          <div className="flex gap-3 mt-3">
            <button type="submit" disabled={pending} className="btn flex-1">
              {pending ? "Creating…" : "Create"}
            </button>
            <button type="button" onClick={() => setCreating(false)} className="btn btn-ghost flex-1">
              Cancel
            </button>
          </div>
        </form>
      )}

      <ul className="space-y-2">
        {sparks.map((spark) => {
          const isEditing = editingId === spark.id;
          const isToday = spark.day_of_year === todayDayOfYear;

          if (isEditing) {
            return (
              <li key={spark.id}>
                <form
                  action={handleUpdate}
                  className="bg-paper border-[1.5px] border-graphite rounded-y2k p-5 shadow-[2px_2px_0_#E6ABE1]"
                >
                  <input type="hidden" name="id" value={spark.id} />
                  <div className="flex justify-between items-baseline mb-3">
                    <h3 className="font-serif font-semibold">Edit Day {spark.day_of_year}</h3>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-xs text-ink-soft hover:text-graphite underline"
                    >
                      Cancel
                    </button>
                  </div>
                  <SparkFields spark={spark} />
                  <div className="flex gap-3 mt-3">
                    <button type="submit" disabled={pending} className="btn flex-1">
                      {pending ? "Saving…" : "Save"}
                    </button>
                  </div>
                </form>
              </li>
            );
          }

          return (
            <li
              key={spark.id}
              className={`flex items-center gap-3 bg-paper border-[1.5px] rounded-y2k p-3 transition-all ${
                spark.is_active ? "border-graphite" : "border-line opacity-60"
              } ${isToday ? "shadow-[2px_2px_0_#E8B044]" : ""}`}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-xl border-[1.5px] border-graphite shrink-0"
                style={{ background: spark.color }}
              >
                {spark.emoji}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-[10px] tracking-[0.1em] uppercase font-bold px-2 py-0.5 rounded-full bg-cream border border-graphite shrink-0">
                    Day {spark.day_of_year}
                  </span>
                  <strong className="font-serif text-sm">{spark.title}</strong>
                  {isToday && (
                    <span className="text-[10px] tracking-[0.1em] uppercase font-bold px-2 py-0.5 rounded-full bg-goldrush border border-graphite shrink-0">
                      Today
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-soft mt-0.5 line-clamp-1">{spark.prompt}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-mono text-ink-soft">{spark.points}p</span>
                <button
                  onClick={() => handleToggle(spark)}
                  disabled={pending}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold border-[1.5px] border-graphite transition-colors ${
                    spark.is_active ? "bg-lavender text-graphite" : "bg-paper text-ink-soft"
                  }`}
                >
                  {spark.is_active ? "Active" : "Paused"}
                </button>
                <button
                  onClick={() => setEditingId(spark.id)}
                  className="text-xs text-graphite hover:text-bronze font-semibold underline"
                >
                  Edit
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function SparkFields({ spark, defaultDay }: { spark?: Spark; defaultDay?: number }) {
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="label" htmlFor="day_of_year">Day of year</label>
          <input
            type="number"
            id="day_of_year"
            name="day_of_year"
            min={1}
            max={366}
            defaultValue={spark?.day_of_year ?? defaultDay ?? 1}
            className="input"
            required
            disabled={!!spark}
          />
        </div>
        <div>
          <label className="label" htmlFor="emoji">Emoji</label>
          <input type="text" id="emoji" name="emoji" defaultValue={spark?.emoji ?? "✨"} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="color">Color</label>
          <select id="color" name="color" defaultValue={spark?.color ?? "#E6ABE1"} className="input">
            <option value="#E6ABE1">Lavender</option>
            <option value="#E8B044">Goldrush</option>
            <option value="#F8D5F3">Bubblegum</option>
            <option value="#5C8C5A">Green</option>
            <option value="#925F3A">Bronze</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="title">Title</label>
        <input type="text" id="title" name="title" defaultValue={spark?.title} className="input" required />
      </div>

      <div>
        <label className="label" htmlFor="prompt">Prompt</label>
        <textarea id="prompt" name="prompt" rows={2} defaultValue={spark?.prompt} className="textarea" required />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label" htmlFor="points">Points</label>
          <input type="number" id="points" name="points" defaultValue={spark?.points ?? 10} className="input" min={1} />
        </div>
        <div>
          <label className="label" htmlFor="proof_type">Proof type</label>
          <select id="proof_type" name="proof_type" defaultValue={spark?.proof_type ?? "text"} className="input">
            <option value="text">Text</option>
            <option value="screenshot">Screenshot</option>
          </select>
        </div>
      </div>
    </div>
  );
}
