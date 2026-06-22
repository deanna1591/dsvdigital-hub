"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordSpin, saveReflection } from "./actions";

type Result = {
  spinId: string;
  day: number;
  title: string;
  instr: string;
  why: string;
  prompt: string;
};
type Stage = "idle" | "spinning" | "result" | "reflection_saved";

const TILE_EMOJIS = ["✨", "🌷", "💌", "🪩", "📚", "🌙", "☕", "🌸", "🎈", "🍵", "🌿", "🎀"];

export default function SpinWheel({ initialSpinCount }: { initialSpinCount: number }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [showWhy, setShowWhy] = useState(false);

  // Reflection form state
  const [notice, setNotice] = useState("");
  const [feel, setFeel] = useState("");
  const [elseText, setElseText] = useState("");

  const [spinPending, startSpinTransition] = useTransition();
  const [reflectPending, startReflectTransition] = useTransition();

  function handleSpin() {
    if (stage === "spinning") return;
    setError(null);
    setShowWhy(false);
    setNotice("");
    setFeel("");
    setElseText("");
    setStage("spinning");

    const turns = 5 + Math.random() * 3;
    const offset = Math.random() * 360;
    setRotation((r) => r + turns * 360 + offset);

    startSpinTransition(async () => {
      const res = await recordSpin();
      await new Promise((r) => setTimeout(r, 2200));

      if (!res.ok) {
        setError(res.error);
        setStage("idle");
        return;
      }

      setResult({
        spinId: res.spinId,
        day: res.day,
        title: res.title,
        instr: res.instr,
        why: res.why,
        prompt: res.prompt,
      });
      setStage("result");
      router.refresh();
    });
  }

  function handleSaveReflection() {
    if (!result) return;
    setError(null);
    startReflectTransition(async () => {
      const res = await saveReflection(result.spinId, notice, feel, elseText);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setStage("reflection_saved");
      router.refresh();
    });
  }

  function spinAgain() {
    setResult(null);
    setNotice("");
    setFeel("");
    setElseText("");
    setError(null);
    setShowWhy(false);
    setStage("idle");
  }

  return (
    <div className="bg-paper border-[1.5px] border-graphite rounded-y2k shadow-[4px_4px_0_#F8D5F3] p-6 sm:p-8 mb-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <span className="text-[10px] tracking-[0.2em] uppercase text-ink-soft font-bold">Spin Wheel</span>
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold mt-1">200 things to do alone</h2>
          <p className="text-sm text-ink-soft mt-1">
            Spin for one random thing. No points, no pressure.
            {initialSpinCount > 0 && (
              <span className="ml-2 font-semibold text-graphite">· You've spun {initialSpinCount}×</span>
            )}
          </p>
        </div>
      </div>

      {/* Wheel */}
      {stage !== "result" && stage !== "reflection_saved" && (
        <div className="flex flex-col items-center py-4">
          <div className="relative w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] mb-6">
            <div className="absolute top-[-12px] left-1/2 -translate-x-1/2 z-20">
              <div
                className="w-0 h-0"
                style={{
                  borderLeft: "14px solid transparent",
                  borderRight: "14px solid transparent",
                  borderTop: "22px solid var(--graphite)",
                  filter: "drop-shadow(0 2px 0 var(--goldrush))",
                }}
              />
            </div>
            <div
              className="absolute inset-0 rounded-full border-[3px] border-graphite shadow-[4px_4px_0_#272727] overflow-hidden"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: stage === "spinning" ? "transform 2.2s cubic-bezier(0.17, 0.67, 0.16, 1)" : "none",
                background: `conic-gradient(
                  var(--lavender) 0deg 30deg,
                  var(--goldrush) 30deg 60deg,
                  var(--bubblegum) 60deg 90deg,
                  var(--cream) 90deg 120deg,
                  var(--lavender) 120deg 150deg,
                  var(--goldrush) 150deg 180deg,
                  var(--bubblegum) 180deg 210deg,
                  var(--cream) 210deg 240deg,
                  var(--lavender) 240deg 270deg,
                  var(--goldrush) 270deg 300deg,
                  var(--bubblegum) 300deg 330deg,
                  var(--cream) 330deg 360deg
                )`,
              }}
            >
              {TILE_EMOJIS.map((emo, i) => {
                const angle = (i * 360) / TILE_EMOJIS.length + 15;
                return (
                  <div
                    key={i}
                    className="absolute top-1/2 left-1/2 text-2xl"
                    style={{ transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-110px) rotate(-${angle}deg)` }}
                  >
                    {emo}
                  </div>
                );
              })}
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-graphite border-[3px] border-paper flex items-center justify-center shadow-[2px_2px_0_var(--goldrush)] z-10">
              <span className="text-2xl">🪩</span>
            </div>
          </div>

          <button
            onClick={handleSpin}
            disabled={stage === "spinning" || spinPending}
            className="btn px-8 py-3 text-base font-bold disabled:opacity-60"
          >
            {stage === "spinning" ? "Spinning…" : "Spin the wheel"}
          </button>

          {error && (
            <div className="mt-4 p-3 bg-error/10 border-[1.5px] border-error text-error text-sm rounded-lg max-w-md">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Result card with reflection inputs */}
      {(stage === "result" || stage === "reflection_saved") && result && (
        <div className="py-2">
          {/* Activity card */}
          <div
            className="border-[1.5px] border-graphite rounded-y2k p-6 sm:p-8 shadow-[3px_3px_0_#272727]"
            style={{ background: "var(--bubblegum)" }}
          >
            <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
              <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-graphite bg-paper px-2.5 py-1 rounded-full border-[1.5px] border-graphite">
                Day {result.day} of 200
              </span>
              <span className="text-2xl">✨</span>
            </div>
            <h3 className="font-serif text-2xl sm:text-3xl font-semibold leading-tight mb-3 text-graphite">
              {titleCase(result.title)}
            </h3>
            <p className="text-graphite text-sm sm:text-base leading-relaxed whitespace-pre-wrap mb-3">
              {result.instr}
            </p>

            {/* Why this works (expandable) */}
            {result.why && (
              <div className="mt-4 pt-4 border-t-[1.5px] border-graphite/30">
                <button
                  onClick={() => setShowWhy(!showWhy)}
                  className="text-xs font-bold text-graphite underline-offset-2 hover:underline flex items-center gap-1"
                >
                  {showWhy ? "▼" : "▶"} Why this works
                </button>
                {showWhy && (
                  <p className="text-graphite/90 text-xs sm:text-sm leading-relaxed mt-2 italic">
                    {result.why}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Reflection form */}
          {stage === "result" && (
            <div className="mt-6 bg-paper border-[1.5px] border-graphite rounded-y2k p-5 sm:p-6 shadow-[2px_2px_0_#272727]">
              <div className="mb-4">
                <span className="text-[10px] tracking-[0.2em] uppercase text-ink-soft font-bold">Reflection</span>
                <h4 className="font-serif text-lg font-semibold mt-1">
                  {result.prompt || "Take a moment to journal what came up."}
                </h4>
                <p className="text-xs text-ink-faint mt-1 italic">
                  Optional. Private to you. Skip if you're not feeling it today.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label htmlFor="r-notice" className="label">What did you notice?</label>
                  <textarea
                    id="r-notice"
                    rows={2}
                    className="textarea"
                    value={notice}
                    onChange={(e) => setNotice(e.target.value)}
                    disabled={reflectPending}
                    placeholder="Anything that stood out…"
                  />
                </div>
                <div>
                  <label htmlFor="r-feel" className="label">What did you feel?</label>
                  <textarea
                    id="r-feel"
                    rows={2}
                    className="textarea"
                    value={feel}
                    onChange={(e) => setFeel(e.target.value)}
                    disabled={reflectPending}
                    placeholder="In your body, in your mood…"
                  />
                </div>
                <div>
                  <label htmlFor="r-else" className="label">Anything else?</label>
                  <textarea
                    id="r-else"
                    rows={2}
                    className="textarea"
                    value={elseText}
                    onChange={(e) => setElseText(e.target.value)}
                    disabled={reflectPending}
                    placeholder="A surprise, a follow-up, something to remember…"
                  />
                </div>
              </div>

              {error && (
                <div className="mt-3 p-3 bg-error/10 border-[1.5px] border-error text-error text-sm rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex gap-3 mt-5 flex-wrap">
                <button
                  onClick={handleSaveReflection}
                  disabled={reflectPending}
                  className="btn flex-1 min-w-[140px]"
                >
                  {reflectPending ? "Saving…" : "✏️ Save reflection"}
                </button>
                <button
                  onClick={spinAgain}
                  disabled={reflectPending}
                  className="btn btn-ghost flex-1 min-w-[140px]"
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}

          {/* Reflection saved state */}
          {stage === "reflection_saved" && (
            <div className="mt-6 bg-paper border-[1.5px] border-graphite rounded-y2k p-6 text-center shadow-[2px_2px_0_#272727]">
              <div className="text-4xl mb-2">✏️</div>
              <h4 className="font-serif text-lg font-semibold mb-1">Reflection saved</h4>
              <p className="text-sm text-ink-soft mb-4">Tucked into your spin history.</p>
              <div className="flex gap-3 justify-center flex-wrap">
                <button onClick={spinAgain} className="btn">
                  🪩 Spin again
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(`${titleCase(result.title)} — ${result.instr}`);
                  }}
                  className="btn btn-ghost"
                >
                  📋 Copy activity
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => (w.length === 0 ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}
