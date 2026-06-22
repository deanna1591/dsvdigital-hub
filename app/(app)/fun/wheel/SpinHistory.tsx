"use client";

import { useState } from "react";

type Spin = {
  id: string;
  activity_day: number;
  activity_title: string;
  activity_instr: string;
  reflection_prompt: string | null;
  reflection_notice: string | null;
  reflection_feel: string | null;
  reflection_else: string | null;
  reflected_at: string | null;
  created_at: string;
};

export default function SpinHistory({ spins }: { spins: Spin[] }) {
  if (spins.length === 0) {
    return (
      <div className="text-center py-10 px-6 text-ink-soft">
        <div className="text-4xl mb-3">🌱</div>
        <p className="text-sm font-medium mb-1">No spins yet</p>
        <p className="text-xs text-ink-faint">Your past picks and reflections will appear here.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-serif text-lg font-semibold mb-4">Your recent spins</h3>
      <ul className="space-y-2.5">
        {spins.map((s) => (
          <SpinRow key={s.id} spin={s} />
        ))}
      </ul>
    </div>
  );
}

function SpinRow({ spin }: { spin: Spin }) {
  const [expanded, setExpanded] = useState(false);
  const hasReflection = !!spin.reflected_at;

  return (
    <li className="bg-paper border-[1.5px] border-graphite rounded-y2k p-4 shadow-[2px_2px_0_#272727]">
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0 leading-none mt-0.5">🪩</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 flex-wrap mb-1">
            <span className="text-[10px] tracking-[0.1em] uppercase font-bold px-2 py-0.5 rounded-full border-[1.5px] border-graphite bg-cream">
              Day {spin.activity_day}
            </span>
            {hasReflection && (
              <span className="text-[10px] tracking-[0.1em] uppercase font-bold px-2 py-0.5 rounded-full border-[1.5px] border-graphite bg-lavender">
                ✏️ Reflected
              </span>
            )}
            <span className="text-[10px] text-ink-faint font-medium">
              {formatRelative(spin.created_at)}
            </span>
          </div>
          <p className="font-serif font-semibold text-sm leading-snug text-graphite">
            {titleCase(spin.activity_title)}
          </p>
          {!expanded && (
            <p className="text-xs text-ink-soft mt-1 line-clamp-2">{spin.activity_instr}</p>
          )}

          {expanded && (
            <div className="mt-3 pt-3 border-t border-line space-y-3">
              <p className="text-xs text-ink-soft leading-relaxed whitespace-pre-wrap">
                {spin.activity_instr}
              </p>

              {hasReflection && (
                <div className="bg-cream border-[1.5px] border-line rounded-lg p-3 space-y-2">
                  {spin.reflection_prompt && (
                    <p className="text-[11px] italic text-ink-soft">{spin.reflection_prompt}</p>
                  )}
                  {spin.reflection_notice && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-ink-faint font-bold">What you noticed</div>
                      <p className="text-xs text-graphite whitespace-pre-wrap mt-0.5">{spin.reflection_notice}</p>
                    </div>
                  )}
                  {spin.reflection_feel && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-ink-faint font-bold">What you felt</div>
                      <p className="text-xs text-graphite whitespace-pre-wrap mt-0.5">{spin.reflection_feel}</p>
                    </div>
                  )}
                  {spin.reflection_else && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-ink-faint font-bold">Anything else</div>
                      <p className="text-xs text-graphite whitespace-pre-wrap mt-0.5">{spin.reflection_else}</p>
                    </div>
                  )}
                </div>
              )}

              {!hasReflection && (
                <p className="text-[11px] italic text-ink-faint">No reflection saved for this spin.</p>
              )}
            </div>
          )}

          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[11px] font-bold text-graphite underline-offset-2 hover:underline mt-2"
          >
            {expanded ? "▲ Hide" : "▼ Show details"}
          </button>
        </div>
      </div>
    </li>
  );
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => (w.length === 0 ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
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
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}
