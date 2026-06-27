"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleShare, deleteStrip } from "./actions";

type Strip = {
  id: string;
  image_url: string;
  share_to_feed: boolean;
  created_at: string;
};

export default function PhotoboothGallery({ strips }: { strips: Strip[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);

  if (strips.length === 0) {
    return (
      <div className="text-center py-10 px-6 text-ink-soft">
        <div className="text-4xl mb-3">🖼️</div>
        <p className="text-sm font-medium mb-1">No strips yet</p>
        <p className="text-xs text-ink-faint">Make one above — they live here forever.</p>
      </div>
    );
  }

  function handleShare(stripId: string) {
    startTransition(async () => {
      await toggleShare(stripId);
      router.refresh();
    });
  }

  function handleDelete(stripId: string) {
    if (!confirm("Delete this strip? Can't be undone.")) return;
    startTransition(async () => {
      await deleteStrip(stripId);
      if (openId === stripId) setOpenId(null);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="font-serif text-lg font-semibold">Your gallery ({strips.length})</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {strips.map((s) => (
          <div
            key={s.id}
            className="border-[1.5px] border-graphite rounded-y2k bg-paper shadow-[2px_2px_0_#272727] overflow-hidden flex flex-col"
          >
            <button
              onClick={() => setOpenId(s.id)}
              className="block w-full bg-cream"
              aria-label="View larger"
            >
              <img
                src={s.image_url}
                alt="Photobooth strip"
                className="w-full block aspect-[1/3] object-cover hover:opacity-90 transition-opacity"
                loading="lazy"
              />
            </button>
            <div className="p-2 text-[10px] flex items-center justify-between gap-1">
              <span className="text-ink-faint truncate">{formatRelative(s.created_at)}</span>
              {s.share_to_feed && (
                <span className="px-1.5 py-0.5 rounded-full bg-lavender border border-graphite font-bold whitespace-nowrap">
                  Feed
                </span>
              )}
            </div>
            <div className="px-2 pb-2 flex items-center justify-between gap-1">
              <button
                onClick={() => handleShare(s.id)}
                disabled={pending}
                className="text-[10px] font-bold underline-offset-2 hover:underline text-graphite"
              >
                {s.share_to_feed ? "Hide from feed" : "Share to feed"}
              </button>
              <button
                onClick={() => handleDelete(s.id)}
                disabled={pending}
                className="text-[10px] text-ink-faint hover:text-error"
                aria-label="Delete"
              >
                🗑
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {openId && (
        <div
          className="fixed inset-0 z-50 bg-graphite/80 flex items-center justify-center p-4"
          onClick={() => setOpenId(null)}
        >
          <img
            src={strips.find((s) => s.id === openId)?.image_url}
            alt="Strip"
            className="max-h-[90vh] border-[3px] border-paper shadow-[6px_6px_0_#E6ABE1]"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
