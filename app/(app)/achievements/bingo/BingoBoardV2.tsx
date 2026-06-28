"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BingoBoardRow, BingoBoardSquareRow, BingoBoardClaimRow } from "@/lib/types";
import { claimBingoSquare } from "./actions";

const LUCKY_BONUS = 10;
const ROW_BONUS = 25;
const BLACKOUT_BONUS = 100;
const COVER_COLOR = "#E8B044"; // goldrush
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [proofText, setProofText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  function closeModal() {
    setSelected(null);
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    setProofText("");
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function openSquare(sq: BingoBoardSquareRow) {
    const existing = claimsBySquare.get(sq.id);
    if (existing && existing.status !== "rejected") return;
    if (sq.is_free) return;
    setSelected(sq);
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    setProofText(existing?.proof_text ?? "");
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setPhotoFile(null);
      setPhotoPreview(null);
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setError("Photo is over 5 MB. Pick a smaller one.");
      e.target.value = "";
      return;
    }
    setError(null);
    setPhotoFile(file);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function clearPhoto() {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function submit() {
    if (!selected) return;
    setError(null);

    if (!photoFile && !proofText.trim()) {
      setError("Add a photo or describe what you did");
      return;
    }

    const fd = new FormData();
    fd.set("squareId", selected.id);
    if (proofText.trim()) fd.set("proofText", proofText.trim());
    if (photoFile) fd.set("photo", photoFile);

    startTransition(async () => {
      const res = await claimBingoSquare(fd);
      if ("error" in res) setError(res.error);
      else {
        closeModal();
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
          onClick={() => !pending && closeModal()}
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

              {/* Photo upload */}
              <div>
                <label className="label">Upload a photo (optional, 5 MB max)</label>
                {!photoFile ? (
                  <label className="block border-[1.5px] border-dashed border-graphite rounded-lg p-4 text-center cursor-pointer hover:bg-cream transition-colors">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/heic"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <div className="text-2xl mb-1">📷</div>
                    <div className="text-sm font-semibold text-graphite">Tap to pick a photo</div>
                    <div className="text-xs text-ink-soft mt-0.5">PNG, JPG, or WebP · up to 5 MB</div>
                  </label>
                ) : (
                  <div className="border-[1.5px] border-graphite rounded-lg p-3 flex items-start gap-3">
                    {photoPreview && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-20 h-20 object-cover rounded border border-graphite shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate">{photoFile.name}</div>
                      <div className="text-[10px] text-ink-soft">
                        {(photoFile.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                      <button
                        type="button"
                        onClick={clearPhoto}
                        className="text-xs text-error font-bold underline-offset-2 hover:underline mt-1"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="label" htmlFor="proof-text">
                  Describe what you did (optional)
                </label>
                <textarea
                  id="proof-text"
                  className="textarea"
                  value={proofText}
                  onChange={(e) => setProofText(e.target.value)}
                  placeholder="Briefly tell us what happened..."
                  rows={3}
                />
              </div>

              <p className="text-xs text-ink-faint italic">
                A photo OR a description is required (at least one).
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
                onClick={closeModal}
                disabled={pending}
              >
                Cancel
              </button>
              <button className="btn" onClick={submit} disabled={pending}>
                {pending
                  ? "Submitting…"
                  : `Mark Square +${selected.points + (selected.is_lucky ? LUCKY_BONUS : 0)} pts`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
