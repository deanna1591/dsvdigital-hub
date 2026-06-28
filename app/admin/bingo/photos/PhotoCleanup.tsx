"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BingoBoardRow } from "@/lib/types";
import { deleteOnePhoto, deletePhotosForBoard, deleteAllPhotos } from "./actions";

type Photo = {
  claim_id: string;
  photo_url: string;
  employee_name: string | null;
  square_name: string;
  created_at: string;
};

type Group = {
  board: BingoBoardRow;
  photos: Photo[];
};

export default function PhotoCleanup({
  groups,
  totalPhotos,
}: {
  groups: Group[];
  totalPhotos: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<Photo | null>(null);

  function handleDeleteOne(claimId: string, label: string) {
    if (!confirm(`Delete this photo (${label})? The claim itself is kept.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteOnePhoto(claimId);
      if ("error" in res) setError(res.error);
      else router.refresh();
    });
  }

  function handleDeleteBoard(boardId: string, title: string, count: number) {
    if (!confirm(`Delete all ${count} photos for "${title}"? Claim history is kept; only the photos are removed from storage.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deletePhotosForBoard(boardId);
      if ("error" in res) setError(res.error);
      else router.refresh();
    });
  }

  function handleDeleteAll() {
    if (totalPhotos === 0) return;
    if (!confirm(`Delete ALL ${totalPhotos} bingo photos? This frees storage but is irreversible. Claim rows survive — only the photos go.`)) return;
    if (!confirm("Really delete all? This affects every board.")) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteAllPhotos();
      if ("error" in res) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div>
      {/* Totals */}
      <div className="bg-paper border-[1.5px] border-graphite rounded-y2k shadow-[2px_2px_0_#272727] p-4 mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="text-[10px] tracking-[0.2em] uppercase text-ink-soft font-bold">Photos in storage</div>
          <div className="font-serif text-3xl font-semibold mt-0.5">{totalPhotos}</div>
        </div>
        {totalPhotos > 0 && (
          <button
            onClick={handleDeleteAll}
            disabled={pending}
            className="text-xs font-bold text-error border-[1.5px] border-error rounded-full px-3 py-1.5 hover:bg-error/10 disabled:opacity-50"
          >
            🗑 Delete all photos
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-error/10 border-[1.5px] border-error text-error text-sm rounded-lg">
          {error}
        </div>
      )}

      {groups.length === 0 ? (
        <div className="bg-paper border-[1.5px] border-dashed border-line rounded-y2k p-8 text-center">
          <div className="text-4xl mb-2">🪶</div>
          <p className="text-sm text-ink-soft">No bingo photos in storage. Everything is clean.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section
              key={group.board.id}
              className="bg-paper border-[1.5px] border-graphite rounded-y2k shadow-[3px_3px_0_#272727] overflow-hidden"
            >
              <div className="px-4 py-3 border-b-[1.5px] border-graphite bg-cream flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl">{group.board.theme}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="font-serif font-semibold">{group.board.title}</strong>
                      <span
                        className={`text-[10px] tracking-[0.1em] uppercase font-bold px-2 py-0.5 rounded-full border-[1.5px] border-graphite ${
                          group.board.status === "live"
                            ? "bg-good text-paper"
                            : group.board.status === "draft"
                            ? "bg-paper"
                            : "bg-line text-ink-soft"
                        }`}
                      >
                        {group.board.status}
                      </span>
                    </div>
                    <p className="text-[10px] text-ink-soft mt-0.5">
                      {group.photos.length} photo{group.photos.length === 1 ? "" : "s"} ·{" "}
                      {new Date(group.board.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {" → "}
                      {new Date(group.board.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteBoard(group.board.id, group.board.title, group.photos.length)}
                  disabled={pending}
                  className="text-xs font-bold text-error border-[1.5px] border-error rounded-full px-3 py-1.5 hover:bg-error/10 disabled:opacity-50 shrink-0"
                >
                  🗑 Delete board's photos
                </button>
              </div>

              <div className="p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {group.photos.map((photo) => (
                  <div
                    key={photo.claim_id}
                    className="border-[1.5px] border-graphite rounded-lg overflow-hidden flex flex-col bg-paper"
                  >
                    <button
                      onClick={() => setLightbox(photo)}
                      className="block w-full bg-cream aspect-square overflow-hidden"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.photo_url}
                        alt={photo.square_name}
                        className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                        loading="lazy"
                      />
                    </button>
                    <div className="p-2 text-[10px]">
                      <div className="font-semibold truncate">{photo.square_name}</div>
                      <div className="text-ink-soft truncate">{photo.employee_name ?? "Unknown"}</div>
                      <div className="text-ink-faint">
                        {new Date(photo.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        handleDeleteOne(
                          photo.claim_id,
                          `${photo.square_name} · ${photo.employee_name ?? "Unknown"}`,
                        )
                      }
                      disabled={pending}
                      className="text-[10px] text-error font-bold py-1.5 hover:bg-error/10 border-t border-line"
                    >
                      🗑 Delete photo
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-graphite/85 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.photo_url}
            alt={lightbox.square_name}
            className="max-h-[90vh] max-w-full border-[3px] border-paper shadow-[6px_6px_0_#E6ABE1]"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
