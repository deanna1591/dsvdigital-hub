"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { pullSlotMachine } from "../actions";
import type { SlotPullResult, SlotSpin } from "@/lib/types";

const SYMBOLS = ["🍒", "🍋", "🔔", "⭐", "💎", "💰"];
const SPIN_DURATION_MS = 2200; // total animation time
const REEL_STAGGER_MS = 350;   // each reel stops a bit after the previous

export default function SlotMachine({
  spinBalance,
  recentSpins,
  totalEarned,
  totalSpent,
  topWins,
}: {
  spinBalance: number;
  recentSpins: SlotSpin[];
  totalEarned: number;
  totalSpent: number;
  topWins: { employee_name: string; payout_points: number; win_label: string; created_at: string }[];
}) {
  const router = useRouter();
  const [pulling, setPulling] = useState(false);
  const [displayReels, setDisplayReels] = useState<string[]>(["🍒", "🍋", "🔔"]);
  const [reelsSpinning, setReelsSpinning] = useState<boolean[]>([false, false, false]);
  const [lastResult, setLastResult] = useState<SlotPullResult | null>(null);
  const [showWin, setShowWin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reelIntervalsRef = useRef<NodeJS.Timeout[]>([]);

  // Cycle reels while spinning
  useEffect(() => {
    reelIntervalsRef.current.forEach(clearInterval);
    reelIntervalsRef.current = [];
    reelsSpinning.forEach((spinning, idx) => {
      if (spinning) {
        const interval = setInterval(() => {
          setDisplayReels((prev) => {
            const next = [...prev];
            next[idx] = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
            return next;
          });
        }, 80);
        reelIntervalsRef.current.push(interval);
      }
    });
    return () => {
      reelIntervalsRef.current.forEach(clearInterval);
    };
  }, [reelsSpinning]);

  async function pull() {
    if (pulling || spinBalance < 1) return;
    setError(null);
    setShowWin(false);
    setLastResult(null);
    setPulling(true);
    setReelsSpinning([true, true, true]);

    // Call backend immediately — we know the result while animation runs
    const responsePromise = pullSlotMachine();

    // Stop reels in sequence regardless of when response arrives
    setTimeout(() => setReelsSpinning((s) => [false, s[1], s[2]]), SPIN_DURATION_MS - REEL_STAGGER_MS * 2);
    setTimeout(() => setReelsSpinning((s) => [s[0], false, s[2]]), SPIN_DURATION_MS - REEL_STAGGER_MS);
    setTimeout(() => setReelsSpinning((s) => [s[0], s[1], false]), SPIN_DURATION_MS);

    const response = await responsePromise;
    // Wait for animation to finish
    await new Promise((r) => setTimeout(r, SPIN_DURATION_MS + 100));

    if (response.error) {
      setError(response.error);
      setReelsSpinning([false, false, false]);
      setPulling(false);
      return;
    }

    if (response.result) {
      const result = response.result;
      setDisplayReels([result.reel_1, result.reel_2, result.reel_3]);
      setLastResult(result);
      setReelsSpinning([false, false, false]);
      setTimeout(() => setShowWin(true), 200);
      router.refresh();
    }
    setPulling(false);
  }

  const isJackpot = lastResult?.win_type === "jackpot";
  const isBigWin = lastResult && lastResult.payout_points >= 30;

  return (
    <>
      {/* Custom Y2K-flavored styles inline so they don't pollute global CSS */}
      <style jsx>{`
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 20px #ff1493, 0 0 40px #ff1493, 0 0 60px #ff1493; }
          50%      { box-shadow: 0 0 30px #00ffff, 0 0 60px #00ffff, 0 0 80px #00ffff; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px) rotate(-1deg); }
          75% { transform: translateX(4px) rotate(1deg); }
        }
        @keyframes confetti-fall {
          0% { transform: translateY(-100px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(120vh) rotate(720deg); opacity: 0; }
        }
        @keyframes sparkle-twinkle {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes scanlines {
          0% { background-position: 0 0; }
          100% { background-position: 0 4px; }
        }
        .y2k-bg {
          background:
            radial-gradient(ellipse at top left, rgba(255,20,147,0.3), transparent 50%),
            radial-gradient(ellipse at bottom right, rgba(0,255,255,0.3), transparent 50%),
            radial-gradient(ellipse at center, rgba(255,215,0,0.2), transparent 60%),
            linear-gradient(135deg, #1a0033 0%, #330066 50%, #4d0099 100%);
        }
        .scanlines::after {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            rgba(0,0,0,0.15),
            rgba(0,0,0,0.15) 1px,
            transparent 1px,
            transparent 3px
          );
          pointer-events: none;
          z-index: 2;
        }
        .reel {
          background: linear-gradient(180deg, #ffffff 0%, #f0f0f0 50%, #d4d4d4 100%);
          border: 4px solid;
          border-image: linear-gradient(135deg, #ff1493, #00ffff) 1;
          box-shadow: inset 0 0 20px rgba(0,0,0,0.3), 0 4px 0 #000;
        }
        .reel-symbol {
          font-size: clamp(48px, 12vw, 80px);
          line-height: 1;
          filter: drop-shadow(2px 2px 0 rgba(0,0,0,0.2));
        }
        .reel-spinning .reel-symbol {
          filter: blur(1px) drop-shadow(2px 2px 0 rgba(0,0,0,0.2));
        }
        .chrome-machine {
          background:
            linear-gradient(135deg, #ff1493 0%, #ff69b4 30%, #ffd700 60%, #00ffff 100%);
          border: 6px solid;
          border-image: linear-gradient(135deg, #c0c0c0, #ffffff, #808080, #ffffff, #c0c0c0) 1;
          box-shadow:
            0 0 0 4px #000,
            0 0 40px rgba(255,20,147,0.6),
            0 20px 60px rgba(0,0,0,0.5);
        }
        .neon-text {
          background: linear-gradient(90deg, #ff1493, #00ffff, #ffff00, #ff1493);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          font-weight: 900;
          letter-spacing: 0.05em;
          animation: glow-pulse 3s infinite;
          filter: drop-shadow(0 0 8px rgba(255,255,255,0.5));
        }
        .lcd-display {
          background: #001100;
          color: #00ff00;
          font-family: 'Courier New', monospace;
          font-weight: bold;
          text-shadow: 0 0 8px #00ff00;
          border: 3px inset #404040;
          padding: 8px 14px;
          border-radius: 4px;
          letter-spacing: 0.1em;
        }
        .spin-btn {
          background: linear-gradient(180deg, #ff1493 0%, #c71585 50%, #8b008b 100%);
          border: 4px solid #fff;
          color: white;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          padding: 18px 40px;
          border-radius: 20px;
          font-size: 22px;
          cursor: pointer;
          text-shadow: 2px 2px 0 #000;
          box-shadow:
            0 0 0 4px #000,
            0 0 30px #ff1493,
            inset 0 4px 0 rgba(255,255,255,0.3),
            inset 0 -6px 0 rgba(0,0,0,0.3);
          transition: all 0.1s;
        }
        .spin-btn:not(:disabled):hover {
          transform: translateY(-2px) scale(1.03);
          box-shadow:
            0 0 0 4px #000,
            0 0 50px #00ffff,
            inset 0 4px 0 rgba(255,255,255,0.4);
        }
        .spin-btn:not(:disabled):active {
          transform: translateY(2px);
        }
        .spin-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .y2k-pill {
          background: linear-gradient(135deg, #00ffff 0%, #00bfff 100%);
          color: #000;
          border: 2px solid #000;
          padding: 4px 10px;
          border-radius: 999px;
          font-weight: 900;
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          box-shadow: 2px 2px 0 #000;
        }
        .star-sparkle {
          position: absolute;
          font-size: 20px;
          animation: sparkle-twinkle 1.5s infinite;
          pointer-events: none;
        }
        .confetti-piece {
          position: fixed;
          top: -20px;
          font-size: 24px;
          animation: confetti-fall 3.5s ease-out forwards;
          z-index: 1000;
          pointer-events: none;
        }
        .win-modal {
          background: linear-gradient(135deg, #ff1493, #ffd700, #00ffff);
          border: 5px solid #000;
          box-shadow: 0 0 0 4px #fff, 0 0 60px #ffd700, 8px 8px 0 #000;
        }
        .jackpot-text {
          background: linear-gradient(45deg, #ff1493, #ffd700, #00ffff, #ff1493);
          background-size: 300% 300%;
          animation: glow-pulse 1s infinite, shake 0.3s infinite;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>

      <div className="y2k-bg relative overflow-hidden rounded-2xl border-[3px] border-ink scanlines" style={{ minHeight: "60vh" }}>
        {/* Floating sparkles decoration */}
        {[...Array(12)].map((_, i) => (
          <span
            key={i}
            className="star-sparkle"
            style={{
              top: `${(i * 37) % 100}%`,
              left: `${(i * 71) % 100}%`,
              animationDelay: `${i * 0.15}s`,
            }}
          >
            {i % 3 === 0 ? "✨" : i % 3 === 1 ? "⭐" : "💫"}
          </span>
        ))}

        <div className="relative z-10 p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="y2k-pill inline-block mb-3">★ SLOT MACHINE ★</div>
            <h2 className="neon-text text-4xl sm:text-6xl font-black tracking-tight mb-2" style={{ fontFamily: "'Fraunces', serif", lineHeight: 1 }}>
              DSV CASINO
            </h2>
            <p className="text-white/80 text-sm">
              Earn spins by completing activities. Match 3 to win big!
            </p>
          </div>

          {/* Stats bar */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            <div className="lcd-display">
              <span className="text-xs opacity-70">SPINS:</span> <span className="text-xl">{spinBalance.toString().padStart(2, "0")}</span>
            </div>
            <div className="lcd-display">
              <span className="text-xs opacity-70">EARNED:</span> <span className="text-xl">{totalEarned}</span>
            </div>
            <div className="lcd-display">
              <span className="text-xs opacity-70">USED:</span> <span className="text-xl">{totalSpent}</span>
            </div>
          </div>

          {/* The machine */}
          <div className="chrome-machine rounded-3xl p-6 sm:p-8 max-w-2xl mx-auto mb-8">
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
              {displayReels.map((symbol, idx) => (
                <div
                  key={idx}
                  className={`reel rounded-2xl aspect-square flex items-center justify-center ${reelsSpinning[idx] ? "reel-spinning" : ""}`}
                >
                  <span className="reel-symbol">{symbol}</span>
                </div>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={pull}
                disabled={pulling || spinBalance < 1}
                className="spin-btn"
              >
                {pulling ? "🎰 SPINNING..." : spinBalance < 1 ? "✨ NO SPINS ✨" : `🎰 PULL! (1 SPIN)`}
              </button>
            </div>

            {error && (
              <div className="mt-4 bg-black/70 border-2 border-yellow-400 text-yellow-200 text-sm p-3 rounded text-center">
                ⚠ {error}
              </div>
            )}
          </div>

          {/* Payout table */}
          <div className="max-w-2xl mx-auto bg-black/60 border-2 border-cyan-400 rounded-2xl p-5 mb-6 backdrop-blur-sm">
            <h3 className="text-center text-cyan-300 font-black mb-3 tracking-widest text-sm">★ PAYOUT TABLE ★</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-white text-sm">
              <Payout symbols="🍒🍒🍒" points={2} />
              <Payout symbols="🍋🍋🍋" points={3} />
              <Payout symbols="🔔🔔🔔" points={5} />
              <Payout symbols="⭐⭐⭐" points={10} />
              <Payout symbols="💎💎💎" points={30} />
              <Payout symbols="💰💰💰" points={150} jackpot />
              <Payout symbols="Any Pair" points={1} small />
              <div className="flex items-center justify-center text-xs opacity-60">
                No match = 0
              </div>
            </div>
          </div>

          {/* How to earn spins */}
          <div className="max-w-2xl mx-auto bg-black/60 border-2 border-pink-400 rounded-2xl p-5 mb-6 backdrop-blur-sm">
            <h3 className="text-center text-pink-300 font-black mb-3 tracking-widest text-sm">★ HOW TO EARN SPINS ★</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-white">
              <div className="text-center">
                <div className="text-3xl mb-1">✨</div>
                <div className="font-bold">Daily Spark</div>
                <div className="text-xs opacity-80">+1 spin per claim</div>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-1">🎯</div>
                <div className="font-bold">Bingo Square</div>
                <div className="text-xs opacity-80">+1 spin per square</div>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-1">🚀</div>
                <div className="font-bold">Mission</div>
                <div className="text-xs opacity-80">+2 spins per mission</div>
              </div>
            </div>
          </div>

          {/* Recent big wins board */}
          {topWins.length > 0 && (
            <div className="max-w-2xl mx-auto bg-black/60 border-2 border-yellow-400 rounded-2xl p-5 backdrop-blur-sm">
              <h3 className="text-center text-yellow-300 font-black mb-3 tracking-widest text-sm">★ HALL OF FAME ★</h3>
              <div className="space-y-1.5">
                {topWins.slice(0, 5).map((w, i) => (
                  <div key={i} className="flex items-center justify-between text-white text-sm bg-white/5 px-3 py-2 rounded">
                    <span>
                      <span className="opacity-60 text-xs">#{i + 1}</span>{" "}
                      <strong>{w.employee_name}</strong>
                    </span>
                    <span className="text-yellow-300 font-bold">+{w.payout_points} pts {w.win_label.includes("JACKPOT") ? "🎰" : "💎"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent spins history */}
          {recentSpins.length > 0 && (
            <div className="max-w-2xl mx-auto mt-6 bg-black/40 border border-white/20 rounded-2xl p-5 backdrop-blur-sm">
              <h3 className="text-center text-white/80 font-bold mb-3 tracking-widest text-xs uppercase">Your Recent Spins</h3>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {recentSpins.slice(0, 12).map((s) => (
                  <div
                    key={s.id}
                    className={`shrink-0 text-center p-2 rounded border ${
                      s.win_type === "jackpot" ? "bg-yellow-500/30 border-yellow-300" :
                      s.win_type === "three_of_kind" ? "bg-purple-500/30 border-purple-300" :
                      s.win_type === "pair" ? "bg-cyan-500/20 border-cyan-300" :
                      "bg-white/5 border-white/20"
                    } text-white text-xs min-w-[68px]`}
                  >
                    <div className="text-base leading-none mb-1">{s.reel_1}{s.reel_2}{s.reel_3}</div>
                    <div className="font-bold">
                      {s.payout_points > 0 ? `+${s.payout_points}` : "—"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* WIN OVERLAY */}
        {showWin && lastResult && lastResult.payout_points > 0 && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-5"
            onClick={() => setShowWin(false)}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            {isBigWin && [...Array(40)].map((_, i) => (
              <span
                key={i}
                className="confetti-piece"
                style={{ left: `${(i * 7.3) % 100}%`, animationDelay: `${(i * 0.05) % 1.5}s` }}
              >
                {["🎉", "🎊", "✨", "⭐", "💰", "💎"][i % 6]}
              </span>
            ))}
            <div className="win-modal relative z-10 rounded-3xl p-8 max-w-md w-full text-center">
              <div className="text-7xl mb-3">{lastResult.reel_1}{lastResult.reel_2}{lastResult.reel_3}</div>
              <h3 className={`font-black text-3xl sm:text-4xl mb-2 ${isJackpot ? "jackpot-text" : "text-black"}`} style={{ fontFamily: "'Fraunces', serif" }}>
                {isJackpot ? "🎰 JACKPOT! 🎰" : "WINNER!"}
              </h3>
              <p className="text-black text-lg font-bold mb-1">{lastResult.win_label}</p>
              <p className="text-black/80 text-2xl font-black mb-5">+{lastResult.payout_points} POINTS</p>
              <button
                onClick={() => setShowWin(false)}
                className="bg-black text-white font-bold px-6 py-3 rounded-full hover:scale-105 transition-transform"
              >
                {spinBalance > 0 ? "Keep Going! →" : "Sweet! ✨"}
              </button>
            </div>
          </div>
        )}

        {/* No-win flash */}
        {showWin && lastResult && lastResult.payout_points === 0 && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-5"
            onClick={() => setShowWin(false)}
          >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="relative z-10 bg-paper border-[1.5px] border-ink rounded-2xl p-8 max-w-md w-full text-center shadow-[6px_6px_0_#000]">
              <div className="text-6xl mb-3">{lastResult.reel_1}{lastResult.reel_2}{lastResult.reel_3}</div>
              <p className="font-serif text-2xl mb-1">No match this time!</p>
              <p className="text-ink-soft text-sm mb-5">{spinBalance > 0 ? "Got more spins? Try again!" : "Earn more spins by completing activities."}</p>
              <button
                onClick={() => setShowWin(false)}
                className="bg-ink text-paper font-bold px-6 py-2.5 rounded-full hover:scale-105 transition-transform"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Payout({ symbols, points, jackpot, small }: { symbols: string; points: number; jackpot?: boolean; small?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded px-2.5 py-1.5 ${jackpot ? "bg-yellow-500/30 border-2 border-yellow-300" : small ? "bg-white/5 border border-white/20" : "bg-white/10"}`}>
      <span className={`text-base ${small ? "text-xs font-medium" : ""}`}>{symbols}</span>
      <span className={`font-bold ${jackpot ? "text-yellow-300" : "text-cyan-300"}`}>{points}</span>
    </div>
  );
}
