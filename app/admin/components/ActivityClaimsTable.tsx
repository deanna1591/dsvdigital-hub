"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approveSparkClaim, rejectSparkClaim,
  approveBingoClaim, rejectBingoClaim,
} from "../actions";

type SparkClaimEnriched = {
  id: string;
  kind: "spark";
  employee_name: string;
  proof_url: string | null;
  proof_text: string | null;
  created_at: string;
  spark_title: string;
  spark_emoji: string;
  points: number;
};
type BingoClaimEnriched = {
  id: string;
  kind: "bingo";
  employee_name: string;
  proof_url: string | null;
  proof_text: string | null;
  created_at: string;
  square_label: string;
  event_title: string;
  points: number;
};

type Enriched = SparkClaimEnriched | BingoClaimEnriched;

export default function ActivityClaimsTable({ claims }: { claims: Enriched[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reviewing, setReviewing] = useState<Enriched | null>(null);
  const [note, setNote] = useState("");

  function approve(c: Enriched) {
    startTransition(async () => {
      const fn = c.kind === "spark" ? approveSparkClaim : approveBingoClaim;
      const res = await fn(c.id, note);
      if (res?.error) alert(res.error);
      else {
        setReviewing(null); setNote(""); router.refresh();
      }
    });
  }
  function reject(c: Enriched) {
    startTransition(async () => {
      const fn = c.kind === "spark" ? rejectSparkClaim : rejectBingoClaim;
      const res = await fn(c.id, note);
      if (res?.error) alert(res.error);
      else {
        setReviewing(null); setNote(""); router.refresh();
      }
    });
  }

  if (claims.length === 0) {
    return <div className="p-10 text-center text-ink-faint text-sm">No pending activity claims ✨</div>;
  }

  return (
    <>
      <table className="w-full">
        <thead>
          <tr className="border-b border-line">
            <Th>Employee</Th>
            <Th>Activity</Th>
            <Th>Points</Th>
            <Th>Submitted</Th>
            <Th className="text-right pr-5">Action</Th>
          </tr>
        </thead>
        <tbody>
          {claims.map((c, i) => (
            <tr key={`${c.kind}-${c.id}`} className={i > 0 ? "border-t border-line" : ""}>
              <Td><strong>{c.employee_name}</strong></Td>
              <Td>
                {c.kind === "spark" ? (
                  <>
                    <span className="text-lg mr-1">{c.spark_emoji}</span>
                    <span className="text-sm">Daily Spark: {c.spark_title}</span>
                  </>
                ) : (
                  <>
                    <span className="text-lg mr-1">🎯</span>
                    <span className="text-sm">{c.event_title} — {c.square_label}</span>
                  </>
                )}
              </Td>
              <Td><strong>{c.points} pts</strong></Td>
              <Td className="text-ink-soft">{fmtDate(c.created_at)}</Td>
              <Td className="text-right pr-5">
                <button className="btn btn-sm" onClick={() => { setReviewing(c); setNote(""); }}>
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
              <h3 className="font-serif text-[22px] font-semibold mb-1">Review {reviewing.kind === "spark" ? "spark" : "bingo square"}</h3>
              <p className="text-xs text-ink-soft">{reviewing.employee_name} · {fmtDate(reviewing.created_at)}</p>
            </div>

            <div className="px-6 py-5 overflow-y-auto space-y-4">
              <div className="bg-cream rounded-lg p-4">
                {reviewing.kind === "spark" ? (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{reviewing.spark_emoji}</span>
                      <div>
                        <h4 className="font-serif text-base font-semibold leading-tight">{reviewing.spark_title}</h4>
                        <p className="text-xs text-ink-soft mt-0.5">Worth {reviewing.points} pts</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <h4 className="font-serif text-base font-semibold leading-tight">{reviewing.square_label}</h4>
                    <p className="text-xs text-ink-soft mt-1">from {reviewing.event_title} · {reviewing.points} pts</p>
                  </>
                )}
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
                  <div className="bg-paper border border-line rounded p-3 text-sm whitespace-pre-wrap">{reviewing.proof_text}</div>
                )}
                {!reviewing.proof_url && !reviewing.proof_text && (
                  <div className="text-xs text-ink-faint italic">No proof submitted</div>
                )}
              </div>

              <div>
                <label className="label">Note <span className="text-ink-faint normal-case font-normal tracking-normal">(optional)</span></label>
                <textarea
                  className="input min-h-[60px]"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-line bg-cream flex justify-between gap-2">
              <button className="btn btn-warn" onClick={() => reject(reviewing)} disabled={pending}>Reject</button>
              <div className="flex gap-2">
                <button className="btn btn-ghost" onClick={() => setReviewing(null)} disabled={pending}>Cancel</button>
                <button className="btn btn-good" onClick={() => approve(reviewing)} disabled={pending}>
                  {pending ? "Approving..." : `Approve +${reviewing.points} pts`}
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
