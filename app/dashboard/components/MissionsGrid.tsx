"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Mission, MissionSubmission } from "@/lib/types";
import { submitMission } from "../actions";

const TYPE_LABELS = {
  "social-post": "Social Post",
  "review": "Review",
  "survey": "Survey",
  "video": "Video Testimonial",
  "referral": "Referral",
  "custom": "Custom Mission",
};

const PLATFORM_EMOJI: Record<string, string> = {
  instagram: "📷",
  linkedin: "💼",
  glassdoor: "🚪",
  trustpilot: "⭐",
  tiktok: "🎵",
  x: "𝕏",
  facebook: "👍",
  google: "🔍",
};

export default function MissionsGrid({
  missions,
  mySubmissions,
}: {
  missions: Mission[];
  mySubmissions: MissionSubmission[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Mission | null>(null);
  const [proofUrl, setProofUrl] = useState("");
  const [proofText, setProofText] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Group submissions by mission id
  const subsByMission = new Map<string, MissionSubmission[]>();
  for (const s of mySubmissions) {
    const list = subsByMission.get(s.mission_id) || [];
    list.push(s);
    subsByMission.set(s.mission_id, list);
  }

  function open(m: Mission) {
    setSelected(m);
    setProofUrl("");
    setProofText("");
    setError(null);
  }

  function close() {
    if (pending) return;
    setSelected(null);
  }

  function submit() {
    if (!selected) return;
    setError(null);
    if (selected.proof_type === "url" && !proofUrl.trim()) {
      setError("Please paste the URL of your completed task.");
      return;
    }
    if (selected.proof_type === "text" && !proofText.trim()) {
      setError("Please describe what you did.");
      return;
    }
    if (selected.proof_type === "screenshot" && !proofUrl.trim()) {
      setError("Please paste a link to your screenshot (e.g. Google Drive link).");
      return;
    }
    startTransition(async () => {
      const res = await submitMission({
        missionId: selected.id,
        proofUrl: proofUrl.trim(),
        proofText: proofText.trim(),
      });
      if (res?.error) setError(res.error);
      else {
        close();
        router.refresh();
      }
    });
  }

  if (missions.length === 0) {
    return (
      <div className="bg-paper border border-line rounded-xl p-12 text-center">
        <div className="text-5xl mb-3">🎯</div>
        <p className="text-ink-soft">No missions available right now. Check back soon!</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {missions.map((m) => {
          const subs = subsByMission.get(m.id) || [];
          const approved = subs.filter((s) => s.status === "approved").length;
          const pendingSub = subs.find((s) => s.status === "pending");
          const lastRejected = subs.find((s) => s.status === "rejected");
          const atLimit = m.max_per_user > 0 && approved >= m.max_per_user;
          return (
            <MissionCard
              key={m.id}
              mission={m}
              pendingSubmission={pendingSub}
              lastRejected={lastRejected}
              atLimit={atLimit}
              onClick={() => !pendingSub && !atLimit && open(m)}
            />
          );
        })}
      </div>

      {selected && (
        <SubmissionModal
          mission={selected}
          proofUrl={proofUrl}
          setProofUrl={setProofUrl}
          proofText={proofText}
          setProofText={setProofText}
          pending={pending}
          error={error}
          onSubmit={submit}
          onClose={close}
        />
      )}
    </>
  );
}

function MissionCard({
  mission: m,
  pendingSubmission,
  lastRejected,
  atLimit,
  onClick,
}: {
  mission: Mission;
  pendingSubmission?: MissionSubmission;
  lastRejected?: MissionSubmission;
  atLimit: boolean;
  onClick: () => void;
}) {
  const gradient = `linear-gradient(135deg, ${m.cover_color} 0%, ${darken(m.cover_color, 25)} 100%)`;
  const expiresSoon = m.expires_at && (new Date(m.expires_at).getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000;
  const daysLeft = m.expires_at ? Math.ceil((new Date(m.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <button
      onClick={onClick}
      disabled={!!pendingSubmission || atLimit}
      className={`text-left rounded-xl overflow-hidden border-[1.5px] border-ink shadow-[4px_4px_0_#1f2238] transition-all ${
        pendingSubmission || atLimit ? "opacity-70 cursor-not-allowed" : "hover:-translate-y-1 hover:shadow-[6px_6px_0_#1f2238] cursor-pointer"
      }`}
    >
      <div className="relative h-44 p-5 text-white flex flex-col justify-between" style={{ background: gradient }}>
        <div className="flex justify-between items-start gap-2">
          <div className="flex gap-1.5 flex-wrap">
            {m.is_pinned && (
              <span className="bg-amber-500/90 text-white text-[10px] px-2 py-0.5 rounded-md font-bold tracking-wider uppercase">
                📌 Pinned
              </span>
            )}
            <span className="bg-black/30 text-white text-[10px] px-2 py-0.5 rounded-md font-bold tracking-wider uppercase">
              Ongoing
            </span>
            {expiresSoon && daysLeft !== null && daysLeft >= 0 && (
              <span className="bg-warn text-white text-[10px] px-2 py-0.5 rounded-md font-bold tracking-wider uppercase">
                ⏳ {daysLeft} day{daysLeft === 1 ? "" : "s"} left
              </span>
            )}
            {pendingSubmission && (
              <span className="bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-md font-bold tracking-wider uppercase">
                ⏳ Pending review
              </span>
            )}
            {atLimit && !pendingSubmission && (
              <span className="bg-good text-white text-[10px] px-2 py-0.5 rounded-md font-bold tracking-wider uppercase">
                ✓ Completed
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {m.platform && (
              <span className="text-base bg-black/30 px-1.5 py-0.5 rounded">{PLATFORM_EMOJI[m.platform] || m.platform}</span>
            )}
            <span className="text-3xl drop-shadow-lg">{m.cover_emoji}</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] tracking-[0.2em] uppercase opacity-80 font-bold mb-1">Mission</div>
          <h3 className="font-serif text-lg font-semibold leading-tight drop-shadow-sm line-clamp-2">{m.title}</h3>
        </div>
      </div>
      <div className="bg-paper border-t-[1.5px] border-ink p-4 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-serif font-bold text-base text-ink">{m.points} Points</span>
          <span className="text-[10px] text-ink-soft uppercase tracking-wider font-bold">{TYPE_LABELS[m.mission_type]}</span>
        </div>
        {lastRejected && !pendingSubmission && !atLimit && (
          <span className="text-[10px] text-warn font-semibold">Try again</span>
        )}
      </div>
    </button>
  );
}

function SubmissionModal({
  mission: m,
  proofUrl,
  setProofUrl,
  proofText,
  setProofText,
  pending,
  error,
  onSubmit,
  onClose,
}: {
  mission: Mission;
  proofUrl: string;
  setProofUrl: (v: string) => void;
  proofText: string;
  setProofText: (v: string) => void;
  pending: boolean;
  error: string | null;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const gradient = `linear-gradient(135deg, ${m.cover_color} 0%, ${darken(m.cover_color, 25)} 100%)`;
  return (
    <div className="fixed inset-0 bg-ink/60 flex items-center justify-center z-[100] p-5" onClick={onClose}>
      <div
        className="bg-paper rounded-xl max-w-lg w-full border-[1.5px] border-ink overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-32 p-5 text-white flex flex-col justify-end" style={{ background: gradient }}>
          <div className="text-3xl mb-2">{m.cover_emoji}</div>
          <h3 className="font-serif text-xl font-semibold leading-tight drop-shadow-sm">{m.title}</h3>
        </div>

        <div className="px-6 py-5 overflow-y-auto space-y-4">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-serif font-bold text-lg">{m.points} pts</span>
            <span className="text-ink-soft">·</span>
            <span className="text-ink-soft">{TYPE_LABELS[m.mission_type]}</span>
          </div>

          <p className="text-sm text-ink-soft leading-relaxed">{m.description}</p>

          {m.instructions && (
            <div className="bg-cream rounded-lg p-4">
              <div className="label mb-2">How to complete</div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.instructions}</p>
            </div>
          )}

          {m.external_link && (
            <a href={m.external_link} target="_blank" rel="noopener noreferrer" className="btn btn-ghost w-full">
              Open {m.platform ? m.platform : "task"} ↗
            </a>
          )}

          {m.proof_type !== "none" && (
            <div className="border-t border-dashed border-line pt-4 space-y-3">
              <div className="label">Submit your proof</div>
              {(m.proof_type === "url" || m.proof_type === "screenshot") && (
                <input
                  type="url"
                  className="input"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  placeholder={m.proof_type === "screenshot" ? "Link to screenshot (Google Drive, Imgur, etc.)" : "Paste the URL of your post/review"}
                />
              )}
              {m.proof_type === "text" && (
                <textarea
                  className="input min-h-[80px]"
                  value={proofText}
                  onChange={(e) => setProofText(e.target.value)}
                  placeholder="Describe what you did (e.g. name of person you referred)"
                />
              )}
            </div>
          )}

          {error && (
            <div className="bg-warn/10 border border-warn text-warn text-sm p-3 rounded">{error}</div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-line bg-cream flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose} disabled={pending}>Cancel</button>
          <button className="btn" onClick={onSubmit} disabled={pending}>
            {pending ? "Submitting..." : "Submit for review"}
          </button>
        </div>
      </div>
    </div>
  );
}

function darken(hex: string, percent: number): string {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  let r = (num >> 16) - Math.round(255 * percent / 100);
  let g = ((num >> 8) & 0x00FF) - Math.round(255 * percent / 100);
  let b = (num & 0x0000FF) - Math.round(255 * percent / 100);
  r = Math.max(0, r);
  g = Math.max(0, g);
  b = Math.max(0, b);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
