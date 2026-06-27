"use client";

import { useState } from "react";
import { TAPES, type Tape } from "@/lib/data/playlists";

export default function MusicRoom() {
  const [selected, setSelected] = useState<Tape>(TAPES[0]);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="bg-paper border-[1.5px] border-graphite rounded-y2k shadow-[4px_4px_0_#F8D5F3] p-6 mb-6">
        <span className="text-[10px] tracking-[0.2em] uppercase text-ink-soft font-bold">Music</span>
        <h2 className="font-serif text-2xl sm:text-3xl font-semibold mt-1">Pick a tape</h2>
        <p className="text-sm text-ink-soft mt-1">Four hand-picked playlists. No points, just vibes.</p>
      </div>

      {/* Now playing — Spotify embed */}
      <div className="bg-paper border-[1.5px] border-graphite rounded-y2k shadow-[3px_3px_0_#272727] overflow-hidden mb-6">
        <div
          className="px-4 py-3 border-b-[1.5px] border-graphite flex items-center gap-3"
          style={{ background: selected.color }}
        >
          <span className="text-2xl">{selected.emoji}</span>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] tracking-[0.2em] uppercase font-bold text-ink-soft">Now playing</div>
            <div className="font-serif font-semibold text-lg leading-tight truncate">{selected.label}</div>
            <div className="text-xs text-ink-soft italic">{selected.vibe}</div>
          </div>
        </div>

        {/* The Spotify embed — wrapped in a div with a key so it remounts cleanly when switching tapes */}
        <div key={selected.id} className="bg-graphite">
          <iframe
            title={selected.label}
            src={`https://open.spotify.com/embed/playlist/${selected.id}?utm_source=generator&theme=0`}
            width="100%"
            height={352}
            frameBorder={0}
            loading="lazy"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            className="block"
          />
        </div>
      </div>

      {/* Tape picker */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TAPES.map((tape) => (
          <CassetteCard
            key={tape.id}
            tape={tape}
            isSelected={tape.id === selected.id}
            onClick={() => setSelected(tape)}
          />
        ))}
      </div>

      <p className="text-xs text-ink-faint italic text-center mt-6">
        Playback through Spotify. Free accounts include ads.
      </p>
    </div>
  );
}

function CassetteCard({
  tape,
  isSelected,
  onClick,
}: {
  tape: Tape;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`border-[1.5px] border-graphite rounded-y2k overflow-hidden text-left transition-all ${
        isSelected
          ? "shadow-[4px_4px_0_#E8B044] -translate-x-px -translate-y-px"
          : "shadow-[2px_2px_0_#272727] hover:shadow-[3px_3px_0_#272727] hover:-translate-x-px hover:-translate-y-px"
      }`}
      aria-pressed={isSelected}
    >
      {/* Top label band */}
      <div
        className="px-4 py-2 border-b-[1.5px] border-graphite flex items-center justify-between gap-2"
        style={{ background: tape.color }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">{tape.emoji}</span>
          <span className="font-serif font-semibold text-sm truncate">{tape.label}</span>
        </div>
        {isSelected && (
          <span className="text-[10px] tracking-[0.15em] uppercase font-bold px-2 py-0.5 rounded-full bg-paper border-[1.5px] border-graphite">
            Playing
          </span>
        )}
      </div>

      {/* Cassette body */}
      <div
        className="relative p-5"
        style={{ background: tape.color }}
      >
        {/* Tape reels */}
        <div className="flex items-center justify-around mb-3">
          <Reel spineColor={tape.spineColor} spinning={isSelected} />
          <div
            className="flex-1 h-2 mx-2 border-y-[1.5px] border-graphite"
            style={{ background: tape.spineColor, opacity: 0.6 }}
          />
          <Reel spineColor={tape.spineColor} spinning={isSelected} />
        </div>
        {/* Tape sticker / vibe label */}
        <div
          className="bg-paper border-[1.5px] border-graphite px-3 py-1.5 text-center"
          style={{ borderStyle: "solid" }}
        >
          <p className="text-xs font-bold text-graphite tracking-wide">{tape.vibe.toUpperCase()}</p>
        </div>
      </div>

      {/* Bottom strip */}
      <div className="px-4 py-1.5 bg-graphite text-paper text-[10px] tracking-[0.18em] uppercase font-bold flex items-center justify-between">
        <span>DSV Mixtape</span>
        <span>Side A</span>
      </div>
    </button>
  );
}

function Reel({ spineColor, spinning }: { spineColor: string; spinning: boolean }) {
  return (
    <div
      className="relative w-12 h-12 rounded-full border-[3px] border-graphite shrink-0"
      style={{ background: spineColor }}
    >
      {/* Inner concentric circles */}
      <div
        className="absolute inset-2 rounded-full border-[1.5px] border-paper"
        style={{
          animation: spinning ? "spin 3s linear infinite" : undefined,
        }}
      >
        <div className="absolute inset-1 rounded-full border border-graphite/50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-graphite" />
      </div>
    </div>
  );
}
