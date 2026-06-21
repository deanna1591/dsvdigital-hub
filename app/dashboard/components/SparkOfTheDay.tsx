"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DailySpark, DailySparkClaim } from "@/lib/types";
import { claimTodaysSpark } from "../actions";

function darken(hex: string, percent: number): string {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  let r = (num >> 16) - Math.round(255 * percent / 100);
  let g = ((num >> 8) & 0x00FF) - Math.round(255 * percent / 100);
  let b = (num & 0x0000FF) - Math.round(255 * percent / 100);
  r = Math.max(0, r); g = Math.max(0, g); b = Math.max(0, b);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export default function SparkOfTheDay({
  todaysSpark,
  todaysClaim,
  recentClaims,
  totalClaimed,
  daysActive,
}: {
  todaysSpark: DailySpark | null;
  todaysClaim: DailySparkClaim | null;
  recentClaims: DailySparkClaim[];
  totalClaimed: number;
  daysActive: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [proofUrl, setProofUrl] = useState("");
  const [proofText, setProofText] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!todaysSpark) {
    return (
      <div className="bg-paper border-[1.5px] border-graphite rounded-y2k shadow-[3px_3px_0_#272727] p-12 text-center mb-8">
        <div className="text-5xl mb-3">🌙</div>
        <p className="font-serif text-xl font-semibold mb-1">No Spark today</p>
        <p className="text-ink-soft text-sm">Today's a rest day — see you tomorrow!</p>
      </div>
    );
  }

  const gradient = `linear-gradient(135deg, ${todaysSpark.color} 0%, ${darken(todaysSpark.color, 25)} 100%)`;
  const isClaimed = !!todaysClaim;
  const isPending = todaysClaim?.status === "pending";
  const isApproved = todaysClaim?.status === "approved";
  const isRejected = todaysClaim?.status === "rejected";

  function submit() {
    setError(null);
    if (todaysSpark!.proof_type === "screenshot" && !proofUrl.trim()) {
      setError("Please paste a link to your photo (Google Drive, Imgur, etc.)");
      return;
    }
    if (todaysSpark!.proof_type === "text" && !proofText.trim()) {
      setError("Please type your answer");
      return;
    }
    startTransition(async () => {
      const res = await claimTodaysSpark({
        sparkId: todaysSpark!.id,
        proofUrl: proofUrl.trim(),
        proofText: proofText.trim(),
      });
      if (res?.error) setError(res.error);
      else {
        setOpen(false);
        setProofUrl("");
        setProofText("");
        router.refresh();
      }
    });
  }

  return (
    <>
      {/* Header strip */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div>
          <div className="text-[11px] tracking-[0.2em] uppercase text-ink-soft font-bold mb-1">Daily Spark</div>
          <h2 className="font-serif text-2xl font-semibold leading-tight">
            Today's activity ✨
          </h2>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <div className="text-[10px] tracking-[0.15em] uppercase text-ink-soft font-bold">Streak</div>
            <div className="font-serif text-xl font-bold">{daysActive} 🔥</div>
          </div>
          <div>
            <div className="text-[10px] tracking-[0.15em] uppercase text-ink-soft font-bold">Total</div>
            <div className="font-serif text-xl font-bold">{totalClaimed}</div>
          </div>
        </div>
      </div>

      {/* The main card */}
      <div
        className="relative rounded-2xl overflow-hidden border-[1.5px] border-ink shadow-[6px_6px_0_#272727] mb-8"
        style={{ background: gradient }}
      >
        <div className="p-6 sm:p-8 text-white">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <div className="text-[10px] tracking-[0.2em] uppercase opacity-80 font-bold mb-2">
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
              </div>
              <h3 className="font-serif text-3xl sm:text-4xl font-semibold leading-tight drop-shadow-sm">
                {todaysSpark.title}
              </h3>
            </div>
            <div className="text-5xl sm:text-6xl drop-shadow-lg">{todaysSpark.emoji}</div>
          </div>

          <p className="text-lg sm:text-xl opacity-95 leading-relaxed mb-6 max-w-2xl">
            {todaysSpark.prompt}
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            {isClaimed ? (
              <div className="flex items-center gap-3">
                {isPending && (
                  <span className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg font-semibold text-sm">
                    ⏳ Waiting for review
                  </span>
                )}
                {isApproved && (
                  <span className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg font-semibold text-sm">
                    ✓ Claimed! +{todaysSpark.points} pts
                  </span>
                )}
                {isRejected && (
                  <button
                    className="bg-white text-ink px-5 py-2.5 rounded-lg font-bold hover:scale-105 transition-transform"
                    onClick={() => setOpen(true)}
                  >
                    Try again →
                  </button>
                )}
              </div>
            ) : (
              <button
                className="bg-white text-ink px-6 py-3 rounded-lg font-bold text-base hover:scale-105 transition-transform shadow-lg"
                onClick={() => setOpen(true)}
              >
                I did it! +{todaysSpark.points} pts →
              </button>
            )}
            <span className="text-xs opacity-80">
              One spark per day · resets at midnight
            </span>
          </div>
        </div>
      </div>

      {/* Recent claims preview */}
      {recentClaims.length > 0 && (
        <div className="bg-paper border-[1.5px] border-graphite rounded-y2k shadow-[3px_3px_0_#272727] p-4 mb-8">
          <div className="text-[10px] tracking-[0.15em] uppercase text-ink-soft font-bold mb-3">Your recent sparks</div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {recentClaims.slice(0, 14).map((c) => {
              const date = new Date(c.claim_date);
              const dayLabel = date.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
              return (
                <div
                  key={c.id}
                  className={`shrink-0 w-16 rounded-lg p-2 text-center text-xs border ${
                    c.status === "approved" ? "bg-good/10 border-good/30" :
                    c.status === "rejected" ? "bg-warn/10 border-warn/30" :
                    "bg-cream border-line"
                  }`}
                  title={dayLabel + " · " + c.status}
                >
                  <div className="text-lg">
                    {c.status === "approved" ? "✓" : c.status === "rejected" ? "✗" : "⏳"}
                  </div>
                  <div className="text-[10px] text-ink-soft font-medium mt-1">{dayLabel.split(" ")[1]}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Submission modal */}
      {open && todaysSpark && (
        <div
          className="fixed inset-0 bg-ink/60 flex items-center justify-center z-[100] p-5"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="bg-paper rounded-xl max-w-lg w-full border-[1.5px] border-ink overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-5 pb-4 border-b border-dashed border-line">
              <h3 className="font-serif text-[22px] font-semibold flex items-center gap-2">
                <span className="text-2xl">{todaysSpark.emoji}</span>
                {todaysSpark.title}
              </h3>
            </div>

            <div className="px-6 py-5 overflow-y-auto space-y-4">
              <p className="text-sm text-ink-soft leading-relaxed">{todaysSpark.prompt}</p>

              {todaysSpark.proof_type === "screenshot" && (
                <div>
                  <label className="label">Link to your photo</label>
                  <input
                    type="url"
                    className="input"
                    value={proofUrl}
                    onChange={(e) => setProofUrl(e.target.value)}
                    placeholder="https://drive.google.com/... or any image URL"
                  />
                  <p className="text-[10px] text-ink-faint mt-1">
                    Upload to Google Drive (sharing: anyone with link) and paste the URL here.
                  </p>
                </div>
              )}

              {todaysSpark.proof_type === "text" && (
                <div>
                  <label className="label">Your answer</label>
                  <textarea
                    className="input min-h-[100px]"
                    value={proofText}
                    onChange={(e) => setProofText(e.target.value)}
                    placeholder="Type your answer here..."
                  />
                </div>
              )}

              {error && (
                <div className="bg-warn/10 border border-warn text-warn text-sm p-3 rounded">{error}</div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-line bg-cream flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => setOpen(false)} disabled={pending}>Cancel</button>
              <button className="btn" onClick={submit} disabled={pending}>
                {pending ? "Claiming..." : `Claim +${todaysSpark.points} pts`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
