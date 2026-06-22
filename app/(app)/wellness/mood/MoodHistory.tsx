"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { getMood } from "@/lib/data/moods";
import { deleteMoodCheckin } from "./actions";

type Checkin = {
  id: string;
  mood: string;
  submood: string | null;
  note: string | null;
  share_to_feed: boolean;
  created_at: string;
};

export default function MoodHistory({ checkins }: { checkins: Checkin[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (checkins.length === 0) {
    return (
      <div className="text-center py-12 px-6 text-ink-soft">
        <div className="text-4xl mb-3">🌱</div>
        <p className="text-sm font-medium mb-1">No check-ins yet</p>
        <p className="text-xs text-ink-faint">Your past moods will appear here.</p>
      </div>
    );
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this check-in? Can't be undone.")) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      await deleteMoodCheckin(fd);
      router.refresh();
    });
  }

  return (
    <div>
      <h3 className="font-serif text-lg font-semibold mb-4">Your recent check-ins</h3>
      <ul className="space-y-2">
        {checkins.map((c) => {
          const mood = getMood(c.mood);
          const submood = mood?.submoods.find((s) => s.key === c.submood);
          return (
            <li
              key={c.id}
              className="bg-paper border-[1.5px] border-graphite rounded-y2k p-4 flex gap-3 items-start"
            >
              <span className="text-2xl shrink-0 leading-none mt-0.5">
                {mood?.emoji ?? "🌷"}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <strong className="font-serif font-semibold">
                    {mood?.label ?? c.mood}
                  </strong>
                  {submood && (
                    <span className="text-sm text-ink-soft">
                      · {submood.label}
                    </span>
                  )}
                  {c.share_to_feed && (
                    <span className="pill pill-good text-[10px]">Shared to feed</span>
                  )}
                </div>
                {c.note && (
                  <p className="text-sm text-ink-soft mt-1 leading-relaxed whitespace-pre-wrap">
                    {c.note}
                  </p>
                )}
                <div className="text-[10px] text-ink-faint mt-1.5 font-medium">
                  {formatRelative(c.created_at)}
                </div>
              </div>
              <button
                onClick={() => handleDelete(c.id)}
                disabled={pending}
                className="text-xs text-ink-faint hover:text-error transition-colors px-2 py-1 disabled:opacity-50"
                aria-label="Delete check-in"
              >
                🗑
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
