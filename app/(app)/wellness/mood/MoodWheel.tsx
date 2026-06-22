"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MOODS, type MoodConfig } from "@/lib/data/moods";
import { saveMoodCheckin } from "./actions";

type Step = "primary" | "submood" | "note" | "success";

export default function MoodWheel() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("primary");
  const [selectedMood, setSelectedMood] = useState<MoodConfig | null>(null);
  const [selectedSubmood, setSelectedSubmood] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [shareToFeed, setShareToFeed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function selectMood(mood: MoodConfig) {
    setSelectedMood(mood);
    setStep("submood");
  }

  function selectSubmood(submoodKey: string) {
    setSelectedSubmood(submoodKey);
    setStep("note");
  }

  function skipSubmood() {
    setSelectedSubmood(null);
    setStep("note");
  }

  function submit() {
    if (!selectedMood) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("mood", selectedMood.key);
      if (selectedSubmood) fd.set("submood", selectedSubmood);
      if (note) fd.set("note", note);
      if (shareToFeed) fd.set("share_to_feed", "on");
      const res = await saveMoodCheckin(fd);
      if (res?.error) {
        setError(res.error);
      } else {
        setStep("success");
        // After 2s, reset for another check-in
        setTimeout(() => {
          setStep("primary");
          setSelectedMood(null);
          setSelectedSubmood(null);
          setNote("");
          setShareToFeed(false);
          router.refresh();
        }, 2200);
      }
    });
  }

  function reset() {
    setStep("primary");
    setSelectedMood(null);
    setSelectedSubmood(null);
    setNote("");
    setShareToFeed(false);
    setError(null);
  }

  return (
    <div className="bg-paper border-[1.5px] border-graphite rounded-y2k shadow-[4px_4px_0_#E6ABE1] p-6 sm:p-8 mb-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-1">
        <div>
          <span className="text-[10px] tracking-[0.2em] uppercase text-ink-soft font-bold">Mood Wheel</span>
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold mt-1">How are you feeling?</h2>
          <p className="text-sm text-ink-soft mt-1">Just for you. No points. Private by default.</p>
        </div>
        {step !== "primary" && step !== "success" && (
          <button
            onClick={reset}
            className="text-xs text-ink-soft hover:text-graphite font-semibold underline-offset-2 hover:underline"
          >
            Start over
          </button>
        )}
      </div>

      {/* Step: primary mood */}
      {step === "primary" && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6">
          {MOODS.map((m) => (
            <button
              key={m.key}
              onClick={() => selectMood(m)}
              className="border-[1.5px] border-graphite rounded-y2k p-5 text-center transition-all hover:-translate-y-0.5 hover:translate-x-[-1px] hover:shadow-[3px_3px_0_#272727] active:translate-x-0 active:translate-y-0 active:shadow-none"
              style={{ background: m.color }}
            >
              <div className="text-4xl mb-2 leading-none">{m.emoji}</div>
              <div className="font-serif font-semibold text-base">{m.label}</div>
            </button>
          ))}
        </div>
      )}

      {/* Step: submood */}
      {step === "submood" && selectedMood && (
        <div>
          <div className="bg-cream border-[1.5px] border-line rounded-lg p-4 mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selectedMood.emoji}</span>
              <div>
                <div className="text-xs text-ink-soft font-bold tracking-wider uppercase">Primary mood</div>
                <div className="font-serif font-semibold text-lg">{selectedMood.label}</div>
              </div>
            </div>
            <button
              onClick={reset}
              className="text-xs text-ink-soft hover:text-graphite font-semibold underline"
            >
              Change
            </button>
          </div>

          <p className="text-sm text-ink-soft mb-3">More specifically?</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {selectedMood.submoods.map((sm) => (
              <button
                key={sm.key}
                onClick={() => selectSubmood(sm.key)}
                className="border-[1.5px] border-graphite rounded-y2k px-3 py-2.5 text-sm font-medium hover:bg-cream transition-all flex items-center gap-2 text-left"
              >
                <span className="text-lg">{sm.emoji}</span>
                <span>{sm.label}</span>
              </button>
            ))}
            <button
              onClick={skipSubmood}
              className="border-[1.5px] border-dashed border-line rounded-y2k px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-cream transition-all"
            >
              Skip this →
            </button>
          </div>
        </div>
      )}

      {/* Step: note */}
      {step === "note" && selectedMood && (
        <div>
          <div className="bg-cream border-[1.5px] border-line rounded-lg p-4 mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{selectedMood.emoji}</span>
              <div>
                <div className="text-xs text-ink-soft font-bold tracking-wider uppercase">Feeling</div>
                <div className="font-serif font-semibold text-lg">
                  {selectedMood.label}
                  {selectedSubmood && (
                    <span className="text-ink-soft font-normal text-sm ml-2">
                      ·{" "}
                      {selectedMood.submoods.find((s) => s.key === selectedSubmood)?.label}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <label className="label" htmlFor="mood-note">A note (optional)</label>
          <textarea
            id="mood-note"
            className="textarea"
            rows={3}
            placeholder="What's going on? Totally optional, totally private unless you share to feed."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <label className="flex items-start gap-3 mt-4 p-3 bg-cream border-[1.5px] border-line rounded-lg cursor-pointer hover:border-graphite transition-colors">
            <input
              type="checkbox"
              checked={shareToFeed}
              onChange={(e) => setShareToFeed(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-lavender"
            />
            <span className="text-sm">
              <strong className="block">Share to team feed</strong>
              <span className="text-ink-soft text-xs">
                Off by default — your mood is private. Turn on if you want teammates to see your check-in.
              </span>
            </span>
          </label>

          {error && (
            <div className="mt-4 p-3 bg-error/10 border-[1.5px] border-error text-error text-sm rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-5">
            <button
              onClick={() => setStep("submood")}
              className="btn btn-ghost flex-1"
              disabled={pending}
            >
              ← Back
            </button>
            <button onClick={submit} className="btn flex-1" disabled={pending}>
              {pending ? "Saving…" : "Save check-in"}
            </button>
          </div>
        </div>
      )}

      {/* Step: success */}
      {step === "success" && selectedMood && (
        <div className="text-center py-8">
          <div className="text-6xl mb-3 animate-bounce">{selectedMood.emoji}</div>
          <h3 className="font-serif text-xl font-semibold mb-1">Saved!</h3>
          <p className="text-sm text-ink-soft">
            Logged as feeling <strong>{selectedMood.label.toLowerCase()}</strong>
            {selectedSubmood && (
              <>
                {" "}·{" "}
                <strong>
                  {selectedMood.submoods.find((s) => s.key === selectedSubmood)?.label.toLowerCase()}
                </strong>
              </>
            )}.
          </p>
        </div>
      )}
    </div>
  );
}
