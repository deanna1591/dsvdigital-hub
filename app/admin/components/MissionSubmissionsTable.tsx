"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MissionSubmission, Mission } from "@/lib/types";
import { approveSubmission, rejectSubmission } from "../actions";

type Enriched = MissionSubmission & {
  employee_name: string;
  mission: Mission;
};

export default function MissionSubmissionsTable({ submissions }: { submissions: Enriched[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reviewing, setReviewing] = useState<Enriched | null>(null);
  const [note, setNote] = useState("");

  function approve(id: string) {
    startTransition(async () => {
      const res = await approveSubmission(id, note);
      if (res?.error) alert(res.error);
      else {
        setReviewing(null);
        setNote("");
        router.refresh();
      }
    });
  }

  function reject(id: string) {
    if (!note.trim() && !confirm("Reject without a note? Leaving a reason helps the employee resubmit correctly.")) return;
    startTransition(async () => {
      const res = await rejectSubmission(id, note);
      if (res?.error) alert(res.error);
      else {
        setReviewing(null);
        setNote("");
        router.refresh();
      }
    });
  }

  if (submissions.length === 0) {
    return <div className="p-10 text-center text-ink-faint text-sm">No pending submissions ✨</div>;
  }

  return (
    <>
      <table className="w-full">
        <thead>
          <tr className="border-b border-line">
            <Th>Employee</Th>
            <Th>Mission</Th>
            <Th>Points</Th>
            <Th>Submitted</Th>
            <Th className="text-right pr-5">Action</Th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((s, i) => (
            <tr key={s.id} className={i > 0 ? "border-t border-line" : ""}>
              <Td><strong>{s.employee_name}</strong></Td>
              <Td>
                <span className="text-lg mr-1">{s.mission.cover_emoji}</span>
                <span className="text-sm">{s.mission.title}</span>
              </Td>
              <Td><strong>{s.mission.points} pts</strong></Td>
              <Td className="text-ink-soft">{fmtDate(s.created_at)}</Td>
              <Td className="text-right pr-5">
                <button className="btn btn-sm" onClick={() => { setReviewing(s); setNote(""); }}>
                  Review
                </button>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>

      {reviewing && (
        <div className="fixed inset-0 bg-ink/60 flex items-center justify-center z-[100] p-5" onClick={() => !pending && setReviewing(null)}>
          <div
            className="bg-paper rounded-xl max-w-lg w-full border-[1.5px] border-ink overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-5 pb-4 border-b border-dashed border-line">
              <h3 className="font-serif text-[22px] font-semibold mb-1">Review submission</h3>
              <p className="text-xs text-ink-soft">
                {reviewing.employee_name} · {fmtDate(reviewing.created_at)}
              </p>
            </div>

            <div className="px-6 py-5 overflow-y-auto space-y-4">
              <div className="bg-cream rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">{reviewing.mission.cover_emoji}</span>
                  <div>
                    <h4 className="font-serif text-base font-semibold leading-tight">{reviewing.mission.title}</h4>
                    <p className="text-xs text-ink-soft mt-0.5">Worth {reviewing.mission.points} points</p>
                  </div>
                </div>
                <p className="text-xs text-ink-soft mt-2">{reviewing.mission.description}</p>
              </div>

              <div>
                <div className="label">Submitted Proof</div>
                {reviewing.proof_url && (
                  <div className="bg-paper border border-line rounded p-3 break-all">
                    <a href={reviewing.proof_url} target="_blank" rel="noopener noreferrer" className="text-accent text-sm hover:underline">
                      ↗ {reviewing.proof_url}
                    </a>
                  </div>
                )}
                {reviewing.proof_text && (
                  <div className="bg-paper border border-line rounded p-3 text-sm whitespace-pre-wrap">
                    {reviewing.proof_text}
                  </div>
                )}
                {!reviewing.proof_url && !reviewing.proof_text && (
                  <div className="text-xs text-ink-faint italic">No proof submitted (mission did not require one)</div>
                )}
              </div>

              <div>
                <label className="label">Note <span className="text-ink-faint normal-case font-normal tracking-normal">(optional — visible to employee)</span></label>
                <textarea
                  className="input min-h-[60px]"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. Great post! / Couldn't see your review — please make it public and resubmit."
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-line bg-cream flex justify-between gap-2">
              <button className="btn btn-warn" onClick={() => reject(reviewing.id)} disabled={pending}>
                Reject
              </button>
              <div className="flex gap-2">
                <button className="btn btn-ghost" onClick={() => setReviewing(null)} disabled={pending}>Cancel</button>
                <button className="btn btn-good" onClick={() => approve(reviewing.id)} disabled={pending}>
                  {pending ? "Approving..." : `Approve & Award ${reviewing.mission.points} pts`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`text-left px-4 py-3 text-[10px] tracking-[0.15em] uppercase font-bold text-ink-soft ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3.5 text-sm align-middle ${className}`}>{children}</td>;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
