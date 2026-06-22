"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { recordSpin } from "./actions";

type Result = { day: number; title: string; instr: string };
type Stage = "idle" | "spinning" | "result";

// Sample tile labels for the wheel face (purely decorative — actual pick is server-side)
const TILE_EMOJIS = ["✨", "🌷", "💌", "🪩", "📚", "🌙", "☕", "🌸", "🎈", "🍵", "🌿", "🎀"];

export default function SpinWheel({ initialSpinCount }: { initialSpinCount: number }) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("idle");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [pending, startTransition] = useTransition();

  function handleSpin() {
    if (stage === "spinning") return;
    setError(null);
    setStage("spinning");

    // Animate wheel — multiple full turns plus a random offset
    const turns = 5 + Math.random() * 3; // 5-8 turns
    const offset = Math.random() * 360;
    setRotation((r) => r + turns * 360 + offset);

    startTransition(async () => {
      const res = await recordSpin();
      // Hold animation a beat regardless of how fast the server responds
      await new Promise((r) => setTimeout(r, 2200));

      if (!res.ok) {
        setError(res.error);
        setStage("idle");
        return;
      }

      setResult({ day: res.day, title: res.title, instr: res.instr });
      setStage("result");
      router.refresh();
    });
  }

  function spinAgain() {
    setResult(null);
    setStage("idle");
  }

  return (
    <div className="bg-paper border-[1.5px] border-graphite rounded-y2k shadow-[4px_4px_0_#F8D5F3] p-6 sm:p-8 mb-8">
      <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
        <div>
          <span className="text-[10px] tracking-[0.2em] uppercase text-ink-soft font-bold">Spin Wheel</span>
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold mt-1">200 things to do alone</h2>
          <p className="text-sm text-ink-soft mt-1">
            Spin for one random thing. No points, no pressure.
            {initialSpinCount > 0 && (
              <span className="ml-2 font-semibold text-graphite">
                · You've spun {initialSpinCount}×
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Wheel */}
      {stage !== "result" && (
        <div className="flex flex-col items-center py-4">
          <div className="relative w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] mb-6">
            {/* Pointer at top */}
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

            {/* Wheel face */}
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
              {/* Decorative emojis on tiles */}
              {TILE_EMOJIS.map((emo, i) => {
                const angle = (i * 360) / TILE_EMOJIS.length + 15; // center of each slice
                return (
                  <div
                    key={i}
                    className="absolute top-1/2 left-1/2 text-2xl"
                    style={{
                      transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-110px) rotate(-${angle}deg)`,
                    }}
                  >
                    {emo}
                  </div>
                );
              })}
            </div>

            {/* Center hub */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-graphite border-[3px] border-paper flex items-center justify-center shadow-[2px_2px_0_var(--goldrush)] z-10">
              <span className="text-2xl">🪩</span>
            </div>
          </div>

          <button
            onClick={handleSpin}
            disabled={stage === "spinning" || pending}
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

      {/* Result card */}
      {stage === "result" && result && (
        <div className="py-2">
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
            <p className="text-graphite text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
              {result.instr}
            </p>
          </div>

          <div className="flex gap-3 mt-5 flex-wrap">
            <button onClick={spinAgain} className="btn flex-1 min-w-[140px]">
              🪩 Spin again
            </button>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(`${titleCase(result.title)} — ${result.instr}`);
              }}
              className="btn btn-ghost flex-1 min-w-[140px]"
            >
              📋 Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Convert SHOUTY TITLE → Title Case for nicer display
function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => {
      // Keep contractions & short words but capitalize first letter
      if (w.length === 0) return w;
      return w[0].toUpperCase() + w.slice(1);
    })
    .join(" ");
}
