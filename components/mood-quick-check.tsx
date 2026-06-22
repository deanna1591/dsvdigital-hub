"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MOODS } from "@/lib/data/moods";
import { saveMoodCheckin } from "@/app/(app)/wellness/mood/actions";

/**
 * Compact mood widget for the Today page.
 * Saves a primary mood with one click, no sub-emotion or note needed.
 * For deeper check-ins, links to /wellness/mood.
 */
export default function MoodQuickCheck({ alreadyCheckedIn }: { alreadyCheckedIn: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState<string | null>(null);

  function quickSave(moodKey: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("mood", moodKey);
      const res = await saveMoodCheckin(fd);
      if (!res?.error) {
        setSaved(moodKey);
        setTimeout(() => {
          router.refresh();
        }, 1500);
      }
    });
  }

  if (saved) {
    const m = MOODS.find((x) => x.key === saved);
    return (
      <div className="bg-paper border-[1.5px] border-graphite rounded-y2k shadow-[2px_2px_0_#272727] p-5 text-center mb-8">
        <div className="text-3xl mb-1 animate-bounce">{m?.emoji}</div>
        <p className="text-sm">
          Saved! Feeling <strong>{m?.label.toLowerCase()}</strong>.{" "}
          <Link href="/wellness/mood" className="underline font-semibold">
            Add a note →
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-paper border-[1.5px] border-graphite rounded-y2k shadow-[2px_2px_0_#272727] p-5 mb-8">
      <div className="flex items-baseline justify-between mb-3 gap-3 flex-wrap">
        <h3 className="font-serif text-lg font-semibold">
          {alreadyCheckedIn ? "How are you feeling now?" : "How are you feeling?"}
        </h3>
        <Link href="/wellness/mood" className="text-xs font-bold underline text-graphite">
          Full check-in →
        </Link>
      </div>
      <div className="grid grid-cols-6 gap-2">
        {MOODS.map((m) => (
          <button
            key={m.key}
            onClick={() => quickSave(m.key)}
            disabled={pending}
            className="border-[1.5px] border-graphite rounded-lg p-2.5 text-center hover:-translate-y-0.5 hover:shadow-[2px_2px_0_#272727] transition-all disabled:opacity-50"
            style={{ background: m.color }}
            aria-label={m.label}
            title={m.label}
          >
            <div className="text-2xl leading-none mb-0.5">{m.emoji}</div>
            <div className="text-[10px] font-bold text-graphite">{m.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
