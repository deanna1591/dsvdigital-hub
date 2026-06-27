"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BingoBoardRow, BingoBoardSquareRow, BingoBoardClaimRow } from "@/lib/types";
import { claimBingoSquare } from "./actions";

const POINTS_PER_SQUARE = 5;
const LUCKY_BONUS = 10;
const ROW_BONUS = 25;
const BLACKOUT_BONUS = 100;
const COVER_COLOR = "#E8B044"; // goldrush

function darken(hex: string, percent: number): string {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  let r = (num >> 16) - Math.round((255 * percent) / 100);
  let g = ((num >> 8) & 0xff) - Math.round((255 * percent) / 100);
  let b = (num & 0xff) - Math.round((255 * percent) / 100);
  r = Math.max(0, r);
  g = Math.max(0, g);
  b = Math.max(0, b);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

// Square coordinate to flat position (0-24)
const posOf = (sq: { col: number; row: number }) => sq.row * 5 + sq.col;

// Detect bingo wins
function detectWins(approved: Set<number>): string[] {
  const wins: string[] = [];
  for (let r = 0; r < 5; r++) {
    let count = 0;
    for (let c = 0; c < 5; c++) if (approved.has(r * 5 + c)) count++;
    if (count === 5) wins.push(`Row ${r + 1}`);
  }
  for (let c = 0; c < 5; c++) {
    let count = 0;
    for (let r = 0; r < 5; r++) if (approved.has(r * 5 + c)) count++;
    if (count === 5) wins.push(`Column ${c + 1}`);
  }
  let d1 = 0, d2 = 0;
  for (let i = 0; i < 5; i++) {
    if (approved.has(i * 5 + i)) d1++;
    if (approved.has(i * 5 + (4 - i))) d2++;
  }
  if (d1 === 5) wins.push("Diagonal ↘");
  if (d2 === 5) wins.push("Diagonal ↙");
  return wins;
}

export default function BingoBoardV2({
  board,
  squares,
  myClaims,
}: {
  board: BingoBoardRow;
  squares: BingoBoardSquareRow[];
  myClaims: BingoBoardClaimRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<BingoBoardSquareRow | null>(null);
  const [proofUrl, setProofUrl] = useState("");
  const [proofText, setProofText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const claimsBySquare = new Map<string, BingoBoardClaimRow>();
  for (const c of myClaims) claimsBySquare.set(c.square_id, c);

  // Calculate approved positions (free squares always count)
  const approvedPositions = new Set<number>();
  for (const sq of squares) {
    if (sq.is_free) approvedPositions.add(posOf(sq));
  }
  for (const c of myClaims) {
    if (c.status === "approved") {
      const sq = squares.find((s) => s.id === c.square_id);
      if (sq) approvedPositions.add(posOf(sq));
    }
  }

  const wins = detectWins(approvedPositions);
  const isBlackout = approvedPositions.size === 25;
  const gradient = `linear-gradient(135deg, ${COVER_COLOR} 0%, ${darken(COVER_COLOR, 25)} 100%)`;
  const sortedSquares = [...squares].sort((a, b) => posOf(a) - posOf(b));

  function openSquare(sq: BingoBoardSquareRow) {
    const existing = claimsBySquare.get(sq.id);
    if (existing && existing.status !== "rejected") return;
    if (sq.is_free) return;
    setSelected(sq);
    setProofUrl(existing?.photo_url ?? "");
    setProofText(existing?.proof_text ?? "");
    setError(null);
  }

  function submit() {
    if (!selected) return;
    setError(null);
    if (!proofUrl.trim() && !proofText.trim()) {
      setError("Add a photo URL or a description of what you did");
      return;
    }
    startTransition(async () => {
      const res = await claimBingoSquare({
        squareId: selected.id,
        proofUrl: proofUrl.trim(),
        proofText: proofText.trim(),
      });
      if ("error" in res) setError(res.error);
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
        className="rounded-y2k overflow-hidden border-[1.5px] border-graphite shadow-[6px_6px_0_#272727]"
        style={{ background: gradient }}
      >
        <div className="p-6 sm:p-8 text-paper">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] tracking-[0.2em] uppercase opacity-90 font-bold mb-2">
                Bingo Week
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold leading-tight mb-1">
                {board.title}
              </h2>
              <p className="text-sm opacity-90">
                {new Date(board.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                {" → "}
                {new Date(board.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </p>
            </div>
            <div className="text-5xl drop-shadow-lg">{board.theme}</div>
          </div>

          {(wins.length > 0 || isBlackout) && (
            <div className="mt-5 bg-paper/25 backdrop-blur-sm rounded-lg p-4 border border-paper/40">
              {isBlackout ? (
                <div className="text-xl font-bold">🏆 BLACKOUT! +{BLACKOUT_BONUS} bonus pts</div>
              ) : (
                <div>
                  <div className="font-bold">🎉 BINGO! {wins.length} line{wins.length === 1 ? "" : "s"}</div>
                  <div className="text-sm opacity-95">
                    {wins.join(" · ")} · +{ROW_BONUS * wins.length} bonus pts
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-5 flex items-center gap-4 text-sm">
            <div>
              <span className="opacity-80">Progress: </span>
              <strong className="text-base">{approvedPositions.size}/25</strong>
            </div>
            <div className="h-2 flex-1 max-w-xs bg-paper/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-paper transition-all"
                style={{ width: `${(approvedPositions.size / 25) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 5×5 grid */}
      <div className="grid grid-cols-5 gap-2 sm:gap-3 max-w-3xl mx-auto">
        {sortedSquares.map((sq) => {
          const claim = claimsBySquare.get(sq.id);
          const isApproved = sq.is_free || claim?.status === "approved";
          const isPending = claim?.status === "pending";
          const isRejected = claim?.status === "rejected";
          const isClickable = !isApproved && !isPending && !sq.is_free;

          return (
            <button
              key={sq.id}
              disabled={!isClickable}
              onClick={() => openSquare(sq)}
              className={`aspect-square rounded-lg border-[1.5px] p-2 text-center transition-all flex flex-col items-center justify-center text-[10px] sm:text-xs leading-tight relative ${
                isApproved
                  ? "border-graphite text-graphite"
                  : isPending
                  ? "border-bubblegum bg-bubblegum/30 text-graphite"
                  : isRejected
                  ? "border-error text-error bg-error/10 hover:bg-error/20 cursor-pointer"
                  : sq.is_lucky
                  ? "border-graphite bg-goldrush/20 hover:bg-goldrush/40 hover:scale-105 cursor-pointer"
                  : "border-graphite bg-paper hover:bg-cream hover:scale-105 cursor-pointer"
              }`}
              style={isApproved ? { background: COVER_COLOR } : undefined}
              title={sq.prompt || sq.name}
            >
              {sq.is_lucky && !isApproved && (
                <span className="absolute top-0.5 left-0.5 text-[10px]">⭐</span>
              )}
              {isApproved && <span className="absolute top-1 right-1 text-base">✓</span>}
              {isPending && <span className="absolute top-1 right-1 text-base">⏳</span>}
              {isRejected && <span className="absolute top-1 right-1 text-base">↻</span>}
              <div className="text-lg sm:text-xl leading-none mb-0.5">{sq.emoji}</div>
              <div className="font-semibold">{sq.name}</div>
            </button>
          );
        })}
      </div>

      {/* Submission modal */}
      {selected && (
        <div
          className="fixed inset-0 bg-graphite/60 flex items-center justify-center z-[100] p-5"
          onClick={() => !pending && setSelected(null)}
        >
          <div
            className="bg-paper rounded-y2k max-w-lg w-full border-[1.5px] border-graphite overflow-hidden max-h-[90vh] flex flex-col shadow-[4px_4px_0_#272727]"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="px-6 pt-5 pb-4 border-b-[1.5px] border-graphite flex items-center gap-3"
              style={{ background: selected.is_lucky ? "var(--goldrush)" : "var(--cream)" }}
            >
              <span className="text-3xl">{selected.emoji}</span>
              <div>
                <h3 className="font-serif text-[22px] font-semibold leading-tight">
                  {selected.name}
                </h3>
                {selected.is_lucky && (
                  <span className="text-[10px] tracking-wider uppercase font-bold">
                    ⭐ Lucky square · +{LUCKY_BONUS} bonus
                  </span>
                )}
              </div>
            </div>

            <div className="px-6 py-5 overflow-y-auto space-y-4">
              {selected.prompt && (
                <p className="text-sm text-ink-soft leading-relaxed">{selected.prompt}</p>
              )}

              <div>
                <label className="label" htmlFor="proof-url">Link to your proof (photo, drive link, etc.) — optional</label>
                <input
                  id="proof-url"
                  type="url"
                  className="input"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                />
              </div>

              <div>
                <label className="label" htmlFor="proof-text">Or describe what you did — optional</label>
                <textarea
                  id="proof-text"
                  className="textarea"
                  value={proofText}
                  onChange={(e) => setProofText(e.target.value)}
                  placeholder="Describe briefly..."
                  rows={3}
                />
              </div>

              <p className="text-xs text-ink-faint italic">
                You can provide either a link OR a text description (at least one required).
              </p>

              {error && (
                <div className="bg-error/10 border-[1.5px] border-error text-error text-sm p-3 rounded">
                  {error}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-line bg-cream flex justify-end gap-2">
              <button
                className="btn btn-ghost"
                onClick={() => setSelected(null)}
                disabled={pending}
              >
                Cancel
              </button>
              <button className="btn" onClick={submit} disabled={pending}>
                {pending
                  ? "Submitting…"
                  : `Mark Square +${POINTS_PER_SQUARE + (selected.is_lucky ? LUCKY_BONUS : 0)} pts`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
