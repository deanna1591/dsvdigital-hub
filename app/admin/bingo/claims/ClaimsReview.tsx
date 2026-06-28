"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveClaim, rejectClaim } from "./actions";
import type { ReviewClaim } from "./page";

const LUCKY_BONUS = 10;

export default function ClaimsReview({
  pending,
  approved,
  rejected,
}: {
  pending: ReviewClaim[];
  approved: ReviewClaim[];
  rejected: ReviewClaim[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [pendingTransition, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const list = tab === "pending" ? pending : tab === "approved" ? approved : rejected;

  function handleApprove(claim: ReviewClaim) {
    const total = claim.square_points + (claim.square_is_lucky ? LUCKY_BONUS : 0);
    if (!confirm(`Approve "${claim.square_name}" by ${claim.employee_name ?? "unknown"}? Awards ${total} pts.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await approveClaim(claim.id);
      if ("error" in res) setError(res.error);
      else {
        setToast(`✓ Approved · +${res.pointsAwarded} pts awarded`);
        setTimeout(() => setToast(null), 3000);
        router.refresh();
      }
    });
  }

  function openRejection(claimId: string) {
    setRejectingId(claimId);
    setRejectionNote("");
    setError(null);
  }

  function confirmReject() {
    if (!rejectingId) return;
    setError(null);
    startTransition(async () => {
      const res = await rejectClaim(rejectingId, rejectionNote);
      if ("error" in res) setError(res.error);
      else {
        setToast("✗ Rejected");
        setTimeout(() => setToast(null), 2500);
        setRejectingId(null);
        setRejectionNote("");
        router.refresh();
      }
    });
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 mb-5 border-b-[1.5px] border-graphite">
        {[
          { id: "pending" as const, label: "Pending", count: pending.length, color: "bg-bubblegum" },
          { id: "approved" as const, label: "Approved", count: approved.length, color: "bg-good text-paper" },
          { id: "rejected" as const, label: "Rejected", count: rejected.length, color: "bg-error/20" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-bold transition-colors -mb-[1.5px] ${
              tab === t.id
                ? "border-[1.5px] border-graphite border-b-paper bg-paper rounded-t-y2k"
                : "text-ink-soft hover:text-graphite"
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span
                className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full border-[1.5px] border-graphite ${t.color}`}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-error/10 border-[1.5px] border-error text-error text-sm rounded-lg">
          {error}
        </div>
      )}

      {toast && (
        <div className="fixed top-4 right-4 z-[200] bg-graphite text-paper px-4 py-2 rounded-y2k shadow-[3px_3px_0_#E6ABE1] font-bold text-sm">
          {toast}
        </div>
      )}

      {/* List */}
      {list.length === 0 ? (
        <div className="bg-paper border-[1.5px] border-dashed border-line rounded-y2k p-8 text-center text-ink-soft">
          <div className="text-4xl mb-2">{tab === "pending" ? "🎉" : "—"}</div>
          <p className="text-sm">
            {tab === "pending"
              ? "No pending claims. You're all caught up."
              : `No ${tab} claims yet.`}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((c) => (
            <li
              key={c.id}
              className="bg-paper border-[1.5px] border-graphite rounded-y2k shadow-[2px_2px_0_#272727] overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row">
                {/* Photo or placeholder */}
                <button
                  onClick={() => c.photo_url && setLightbox(c.photo_url)}
                  disabled={!c.photo_url}
                  className="shrink-0 sm:w-40 aspect-square bg-cream flex items-center justify-center"
                >
                  {c.photo_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={c.photo_url}
                      alt={`${c.square_name} proof`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-3xl text-ink-faint">📝</span>
                  )}
                </button>

                {/* Details */}
                <div className="p-4 flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-2xl">{c.square_emoji}</span>
                        <strong className="font-serif font-semibold text-base">
                          {c.square_name}
                        </strong>
                        {c.square_is_lucky && (
                          <span className="text-[10px] tracking-wider uppercase font-bold px-2 py-0.5 rounded-full bg-goldrush border-[1.5px] border-graphite">
                            ⭐ Lucky
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink-soft mt-0.5">
                        {c.board_theme} {c.board_title}
                      </p>
                    </div>
                    <div className="text-xs text-ink-soft font-bold whitespace-nowrap">
                      +{c.square_points + (c.square_is_lucky ? LUCKY_BONUS : 0)} pts
                    </div>
                  </div>

                  <div className="text-xs text-ink-soft mb-2">
                    <strong className="text-graphite">{c.employee_name ?? "Unknown"}</strong>
                    {" · "}
                    {formatRelative(c.created_at)}
                  </div>

                  {c.proof_text && (
                    <div className="text-sm bg-cream border-[1.5px] border-line rounded p-2 mb-2 italic">
                      "{c.proof_text}"
                    </div>
                  )}

                  {c.rejection_note && c.status === "rejected" && (
                    <div className="text-sm bg-error/10 border-[1.5px] border-error rounded p-2 mb-2">
                      <strong>Rejected:</strong> {c.rejection_note}
                    </div>
                  )}

                  {c.status === "pending" && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <button
                        onClick={() => handleApprove(c)}
                        disabled={pendingTransition}
                        className="btn text-xs px-3 py-1.5 bg-good text-paper border-graphite"
                      >
                        ✓ Approve & award
                      </button>
                      <button
                        onClick={() => openRejection(c.id)}
                        disabled={pendingTransition}
                        className="btn btn-ghost text-xs px-3 py-1.5"
                      >
                        ✗ Reject
                      </button>
                    </div>
                  )}

                  {(c.status === "approved" || c.status === "rejected") && c.reviewed_at && (
                    <div className="text-[10px] text-ink-faint italic mt-2">
                      Reviewed {formatRelative(c.reviewed_at)}
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Rejection note modal */}
      {rejectingId && (
        <div
          className="fixed inset-0 z-[150] bg-graphite/60 flex items-center justify-center p-5"
          onClick={() => !pendingTransition && setRejectingId(null)}
        >
          <div
            className="bg-paper rounded-y2k max-w-md w-full border-[1.5px] border-graphite overflow-hidden shadow-[4px_4px_0_#272727]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-4 pb-3 border-b-[1.5px] border-graphite bg-cream">
              <h3 className="font-serif text-lg font-semibold">Reject this claim?</h3>
              <p className="text-xs text-ink-soft mt-0.5">
                Tell the employee why (they'll see this and can re-submit).
              </p>
            </div>
            <div className="px-5 py-4">
              <label className="label" htmlFor="rejection-note">Reason (optional)</label>
              <textarea
                id="rejection-note"
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                rows={3}
                className="textarea"
                placeholder="e.g. The photo doesn't clearly show the activity — try again with a closer shot."
                autoFocus
              />
            </div>
            <div className="px-5 py-3 border-t border-line bg-cream flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingId(null)}
                disabled={pendingTransition}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmReject}
                disabled={pendingTransition}
                className="btn"
              >
                {pendingTransition ? "Rejecting…" : "Reject claim"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[200] bg-graphite/85 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Proof"
            className="max-h-[90vh] max-w-full border-[3px] border-paper shadow-[6px_6px_0_#E6ABE1]"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 1000 / 60);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
