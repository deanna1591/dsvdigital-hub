"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bulkInviteEmployees, type BulkRowResult } from "./actions";

const CSV_TEMPLATE = `name,email,company,status,phone,member_since
Cheruby Bermudez,cheruby@example.com,Klook,fulltime,+63 917 555 0001,2024-01-15
Jennifer Barrientos,jennifer@example.com,Klook,fulltime,+63 917 555 0002,2023-06-01
Mariazelle Bernaldo,mariazelle@example.com,Internal,parttime,,2024-03-10`;

const SHEET_NAMES = `Cheruby Bermudez
Jennifer Barrientos
Mariazelle Bernaldo
Apple Joy Pasco
Erika Jane Boado
Diana Caroline F. Dulinski
Melody Millena
Ryan Panganiban
Aldwyn Patrick Bernaldo
Ella Rhose Tadiosa
Denice Ann Dumlao
Olin Mai Dela Cruz
Maria Fatima Rabimbi
Lenifer May Lalamunan
Romina Mia Aquino
Leira Sophia Lumen
Cirilyn F. Atanacio
May Sheila Sugalan
Lily Anne Morales
Mary Angeline Florentino
Lovely Lyn Maglupay
Katherine Edagalino
Jowe Joy Cutamora
Judy Mae Fernandez
Princess Yannah Alay-ay
Kimberly Lastimoso
Marinel Micabani
Faith Morales
Marielle Anne Villegas
Lois Banaag
Mariel Penaflor
Arjay Millena
Charmaine Tandas
Rochelle Medina
Chrislamia Lu
Jericho Murito
Arnel Bonifacio Chua
Ricamay Grumal
Axl Rose Aquino
Leniegail R. Tongnawa
Genia A. Peleo
Marvin Ebuenga
Andrean Erasmo
Alejandro Dela Rosa
Maria Pia Carmela Miraflores
Neljoy Calub
Jeremy Bancifra
Liezl Nacu
Pia De Castro
Jaymee Mae Labasan`;

type Mode = "names" | "csv";

export default function BulkInvite() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>("names");
  const [text, setText] = useState("");
  const [sendInvite, setSendInvite] = useState(false);
  const [results, setResults] = useState<BulkRowResult[] | null>(null);
  const [summary, setSummary] = useState<{ ok: number; skipped: number; failed: number } | null>(null);

  function handleSubmit(formData: FormData) {
    if (!text.trim()) return;
    formData.set("csv", text);
    formData.set("mode", mode);
    if (sendInvite) formData.set("send_invite", "on");

    startTransition(async () => {
      const res = await bulkInviteEmployees(formData);
      setResults(res.results);
      setSummary({ ok: res.ok, skipped: res.skipped, failed: res.failed });
      router.refresh();
    });
  }

  function loadNames() {
    setMode("names");
    setText(SHEET_NAMES);
  }

  function loadCsvTemplate() {
    setMode("csv");
    setText(CSV_TEMPLATE);
  }

  return (
    <div className="space-y-6">
      {!results && (
        <form action={handleSubmit} className="bg-paper border-[1.5px] border-graphite rounded-y2k shadow-[3px_3px_0_#272727] p-5">
          {/* Mode tabs */}
          <div className="flex gap-1 mb-4 border-b-[1.5px] border-graphite">
            {[
              { id: "names" as const, label: "Just names" },
              { id: "csv" as const, label: "Full CSV" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setMode(t.id)}
                className={`px-4 py-2 text-sm font-bold transition-colors -mb-[1.5px] ${
                  mode === t.id
                    ? "border-[1.5px] border-graphite border-b-paper bg-paper rounded-t-y2k"
                    : "text-ink-soft hover:text-graphite"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {mode === "names" ? (
            <div className="mb-4">
              <div className="flex items-baseline justify-between gap-2 mb-2 flex-wrap">
                <label className="label" htmlFor="csv-names">One name per line</label>
                <button
                  type="button"
                  onClick={loadNames}
                  className="text-xs font-bold text-bronze underline-offset-2 hover:underline"
                >
                  📊 Load 49 names from matrix
                </button>
              </div>
              <textarea
                id="csv-names"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={14}
                className="textarea font-mono text-xs"
                placeholder={`Cheruby Bermudez\nJennifer Barrientos\nMariazelle Bernaldo\n...`}
                required
              />
              <p className="text-[11px] text-ink-soft mt-1.5 leading-relaxed">
                Each line becomes one employee with a placeholder email like{" "}
                <code className="bg-cream px-1 rounded">cheruby.bermudez@placeholder.invalid</code>.
                Admins fill in real emails + other details later from the team page. Invites can't be sent until a real email is set.
              </p>
            </div>
          ) : (
            <div className="mb-4">
              <div className="flex items-baseline justify-between gap-2 mb-2 flex-wrap">
                <label className="label" htmlFor="csv-full">CSV data</label>
                <button
                  type="button"
                  onClick={loadCsvTemplate}
                  className="text-xs font-bold text-bronze underline-offset-2 hover:underline"
                >
                  📋 Load template
                </button>
              </div>
              <textarea
                id="csv-full"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={12}
                className="textarea font-mono text-xs"
                placeholder={`name,email,company,status,phone,member_since\nJane Doe,jane@dsvdigital.com,Klook,fulltime,+63...,2024-01-01\n...`}
                required
              />
              <p className="text-[11px] text-ink-soft mt-1.5 leading-relaxed">
                Required columns: <code>name</code>, <code>email</code>. Optional:{" "}
                <code>company</code>, <code>status</code>, <code>phone</code>, <code>member_since</code>.
                Status: fulltime / parttime / contractor / intern / leave / former.
              </p>
            </div>
          )}

          <label className="flex items-start gap-2 p-3 bg-cream border-[1.5px] border-line rounded-lg cursor-pointer hover:border-graphite transition-colors mb-4">
            <input
              type="checkbox"
              checked={sendInvite}
              onChange={(e) => setSendInvite(e.target.checked)}
              disabled={mode === "names"}
              className="mt-0.5 w-4 h-4 accent-lavender disabled:opacity-50"
            />
            <span className="text-sm">
              <strong className="block">
                Send invite emails now
                {mode === "names" && (
                  <span className="ml-1 text-[10px] font-normal text-ink-soft">(not available in names-only mode)</span>
                )}
              </strong>
              <span className="text-ink-soft text-xs">
                {mode === "names"
                  ? "Names-only adds silently. Send real invites later from the team page once you've filled in their emails."
                  : "If off, people are added silently with no email — you can send invites later from the team page."}
              </span>
            </span>
          </label>

          <button type="submit" disabled={pending || !text.trim()} className="btn w-full">
            {pending ? "Processing…" : sendInvite ? "Send invites" : "Add to system (no emails)"}
          </button>
        </form>
      )}

      {results && summary && (
        <div className="bg-paper border-[1.5px] border-graphite rounded-y2k shadow-[3px_3px_0_#272727] p-5">
          <h2 className="font-serif text-xl font-semibold mb-3">Done</h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Stat label="Successful" value={summary.ok} color="bg-good text-paper" />
            <Stat label="Skipped" value={summary.skipped} color="bg-line text-ink-soft" />
            <Stat label="Failed" value={summary.failed} color="bg-error/20 text-error" />
          </div>

          <details className="text-sm" open={summary.failed > 0}>
            <summary className="cursor-pointer font-bold hover:underline">
              Per-row details ({results.length})
            </summary>
            <ul className="mt-3 space-y-1 max-h-80 overflow-y-auto border border-line rounded p-2 bg-cream/50">
              {results.map((r, i) => (
                <li
                  key={i}
                  className={`text-xs px-2 py-1 rounded ${
                    r.status === "invited" || r.status === "created"
                      ? "text-good"
                      : r.status === "skipped"
                      ? "text-ink-soft"
                      : "text-error"
                  }`}
                >
                  <span className="font-mono">#{r.row}</span>{" "}
                  <strong>{r.name || "(no name)"}</strong>{" "}
                  <span className="text-ink-faint">{r.email}</span>{" "}
                  — {r.status}: {r.message}
                </li>
              ))}
            </ul>
          </details>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => {
                setResults(null);
                setSummary(null);
                setText("");
              }}
              className="btn btn-ghost flex-1"
            >
              Run another batch
            </button>
            <a href="/admin/team" className="btn flex-1 text-center">
              Back to team →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`border-[1.5px] border-graphite rounded-y2k p-3 text-center ${color}`}>
      <div className="font-serif text-2xl font-bold">{value}</div>
      <div className="text-[10px] tracking-[0.15em] uppercase font-bold">{label}</div>
    </div>
  );
}
