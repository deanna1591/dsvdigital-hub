"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BingoEvent, BingoSquare, BingoClaim } from "@/lib/types";
import { claimBingoSquare } from "../actions";

function darken(hex: string, percent: number): string {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  let r = (num >> 16) - Math.round(255 * percent / 100);
  let g = ((num >> 8) & 0x00FF) - Math.round(255 * percent / 100);
  let b = (num & 0x0000FF) - Math.round(255 * percent / 100);
  r = Math.max(0, r); g = Math.max(0, g); b = Math.max(0, b);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

// Detect bingo wins (5 in a row, column, or diagonal)
function detectWins(approvedPositions: Set<number>): string[] {
  const wins: string[] = [];
  // Rows
  for (let r = 0; r < 5; r++) {
    let count = 0;
    for (let c = 0; c < 5; c++) if (approvedPositions.has(r * 5 + c)) count++;
    if (count === 5) wins.push(`Row ${r + 1}`);
  }
  // Columns
  for (let c = 0; c < 5; c++) {
    let count = 0;
    for (let r = 0; r < 5; r++) if (approvedPositions.has(r * 5 + c)) count++;
    if (count === 5) wins.push(`Column ${c + 1}`);
  }
  // Diagonals
  let d1 = 0, d2 = 0;
  for (let i = 0; i < 5; i++) {
    if (approvedPositions.has(i * 5 + i)) d1++;
    if (approvedPositions.has(i * 5 + (4 - i))) d2++;
  }
  if (d1 === 5) wins.push("Diagonal ↘");
  if (d2 === 5) wins.push("Diagonal ↙");
  return wins;
}

export default function BingoBoard({
  event,
  squares,
  myClaims,
}: {
  event: BingoEvent;
  squares: BingoSquare[];
  myClaims: BingoClaim[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<BingoSquare | null>(null);
  const [proofUrl, setProofUrl] = useState("");
  const [proofText, setProofText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const claimsBySquare = new Map<string, BingoClaim>();
  for (const c of myClaims) claimsBySquare.set(c.square_id, c);

  const approvedPositions = new Set<number>();
  for (const c of myClaims) {
    if (c.status === "approved") {
      const sq = squares.find((s) => s.id === c.square_id);
      if (sq) approvedPositions.add(sq.position);
    }
  }

  // FREE square auto-marks if labeled "FREE"
  for (const s of squares) {
    if (s.label.toUpperCase() === "FREE" || s.label.toUpperCase() === "FREE!") {
      approvedPositions.add(s.position);
    }
  }

  const wins = detectWins(approvedPositions);
  const isBlackout = approvedPositions.size === 25;
  const gradient = `linear-gradient(135deg, ${event.cover_color} 0%, ${darken(event.cover_color, 25)} 100%)`;

  const sortedSquares = [...squares].sort((a, b) => a.position - b.position);

  function openSquare(sq: BingoSquare) {
    const existing = claimsBySquare.get(sq.id);
    if (existing && existing.status !== "rejected") return; // already claimed/approved
    if (sq.label.toUpperCase().startsWith("FREE")) return; // free square
    setSelected(sq);
    setProofUrl("");
    setProofText("");
    setError(null);
  }

  function submit() {
    if (!selected) return;
    setError(null);
    if (selected.proof_type === "screenshot" && !proofUrl.trim()) {
      setError("Please paste a link to your proof photo");
      return;
    }
    if (selected.proof_type === "text" && !proofText.trim()) {
      setError("Please describe what you did");
      return;
    }
    startTransition(async () => {
      const res = await claimBingoSquare({
        squareId: selected.id,
        proofUrl: proofUrl.trim(),
        proofText: proofText.trim(),
      });
      if (res?.error) setError(res.error);
      else {
        setSelected(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div
        className="rounded-2xl overflow-hidden border-[1.5px] border-ink shadow-[6px_6px_0_#1f2238]"
        style={{ background: gradient }}
      >
        <div className="p-6 sm:p-8 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] tracking-[0.2em] uppercase opacity-80 font-bold mb-2">Bingo Week</div>
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold leading-tight mb-1">{event.title}</h2>
              <p className="text-sm opacity-85">
                {new Date(event.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                {" → "}
                {new Date(event.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            </div>
            <div className="text-5xl drop-shadow-lg">{event.cover_emoji}</div>
          </div>

          {/* Win indicators */}
          {(wins.length > 0 || isBlackout) && (
            <div className="mt-5 bg-white/20 backdrop-blur-sm rounded-lg p-4">
              {isBlackout ? (
                <div className="text-xl font-bold">🏆 BLACKOUT! +{event.bonus_blackout_points} bonus pts</div>
              ) : (
                <div>
                  <div className="font-bold">🎉 BINGO! {wins.length} line{wins.length === 1 ? "" : "s"}</div>
                  <div className="text-sm opacity-90">{wins.join(" · ")} · +{event.bonus_row_points * wins.length} bonus pts</div>
                </div>
              )}
            </div>
          )}

          <div className="mt-5 flex items-center gap-4 text-sm">
            <div>
              <span className="opacity-70">Progress: </span>
              <strong className="text-base">{approvedPositions.size}/25</strong>
            </div>
            <div className="h-2 flex-1 max-w-xs bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all"
                style={{ width: `${(approvedPositions.size / 25) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* The grid */}
      <div className="grid grid-cols-5 gap-2 sm:gap-3 max-w-3xl mx-auto">
        {sortedSquares.map((sq) => {
          const claim = claimsBySquare.get(sq.id);
          const isFree = sq.label.toUpperCase().startsWith("FREE");
          const isApproved = isFree || claim?.status === "approved";
          const isPending = claim?.status === "pending";
          const isRejected = claim?.status === "rejected";
          const isClickable = !isApproved && !isPending && !isFree;

          return (
            <button
              key={sq.id}
              disabled={!isClickable}
              onClick={() => openSquare(sq)}
              className={`aspect-square rounded-lg border-[1.5px] p-2 text-center transition-all flex flex-col items-center justify-center text-[10px] sm:text-xs leading-tight relative ${
                isApproved
                  ? "border-good text-white"
                  : isPending
                  ? "border-accent-2 bg-accent-2/20 text-ink"
                  : isRejected
                  ? "border-warn text-warn bg-warn/10 hover:bg-warn/20 cursor-pointer"
                  : "border-ink bg-paper hover:bg-cream hover:scale-105 cursor-pointer"
              }`}
              style={isApproved ? { background: event.cover_color } : undefined}
            >
              {isApproved && (
                <span className="absolute top-1 right-1 text-base">✓</span>
              )}
              {isPending && (
                <span className="absolute top-1 right-1 text-base">⏳</span>
              )}
              {isRejected && (
                <span className="absolute top-1 right-1 text-base">↻</span>
              )}
              <div className={`font-semibold ${isApproved ? "" : ""}`}>{sq.label}</div>
            </button>
          );
        })}
      </div>

      {/* Submission modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-ink/60 flex items-center justify-center z-[100] p-5"
          onClick={() => !pending && setSelected(null)}
        >
          <div
            className="bg-paper rounded-xl max-w-lg w-full border-[1.5px] border-ink overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-5 pb-4 border-b border-dashed border-line">
              <h3 className="font-serif text-[22px] font-semibold">{selected.label}</h3>
            </div>

            <div className="px-6 py-5 overflow-y-auto space-y-4">
              {selected.prompt && (
                <p className="text-sm text-ink-soft leading-relaxed">{selected.prompt}</p>
              )}

              {selected.proof_type === "screenshot" && (
                <div>
                  <label className="label">Link to your proof photo</label>
                  <input
                    type="url"
                    className="input"
                    value={proofUrl}
                    onChange={(e) => setProofUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                  />
                </div>
              )}

              {selected.proof_type === "text" && (
                <div>
                  <label className="label">What did you do?</label>
                  <textarea
                    className="input min-h-[80px]"
                    value={proofText}
                    onChange={(e) => setProofText(e.target.value)}
                    placeholder="Describe briefly..."
                  />
                </div>
              )}

              {error && (
                <div className="bg-warn/10 border border-warn text-warn text-sm p-3 rounded">{error}</div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-line bg-cream flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => setSelected(null)} disabled={pending}>Cancel</button>
              <button className="btn" onClick={submit} disabled={pending}>
                {pending ? "Marking..." : `Mark Square +${selected.points} pts`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
