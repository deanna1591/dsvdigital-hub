"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { redeemItem } from "../actions";
import type { CatalogItem } from "@/lib/types";

export default function CatalogGrid({ catalog, balance }: { catalog: CatalogItem[]; balance: number }) {
  const router = useRouter();
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onConfirm() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const res = await redeemItem(selected.id);
      if (res?.error) {
        setError(res.error);
      } else {
        setSelected(null);
        router.refresh();
      }
    });
  }

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
        {catalog.map((item) => {
          const canAfford = balance >= item.points;
          return (
            <div
              key={item.id}
              className="bg-paper border-[1.5px] border-graphite rounded-y2k shadow-[3px_3px_0_#272727] p-5 transition-all hover:border-ink hover:-translate-y-0.5 hover:shadow-[0_8px_16px_rgba(31,34,56,0.08)] flex flex-col"
            >
              <div className="text-[44px] leading-none mb-3">{item.icon}</div>
              <h3 className="font-serif text-[17px] font-semibold leading-tight mb-1">{item.name}</h3>
              <p className="text-xs text-ink-soft mb-4">₱{item.peso_value.toLocaleString()} value</p>
              <div className="mt-auto flex items-center justify-between gap-3">
                <div className="font-serif font-bold text-xl">
                  {item.points}
                  <small className="text-[11px] text-ink-soft font-normal ml-0.5 font-sans">pts</small>
                </div>
                <button
                  className="btn btn-sm"
                  disabled={!canAfford}
                  onClick={() => setSelected(item)}
                >
                  {canAfford ? "Redeem" : "Locked"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="fixed inset-0 bg-ink/60 flex items-center justify-center z-[100] p-5" onClick={() => !pending && setSelected(null)}>
          <div
            className="bg-paper rounded-xl max-w-md w-full border-[1.5px] border-ink overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-5 pb-4 border-b border-dashed border-line">
              <h3 className="font-serif text-[22px] font-semibold">Confirm redemption</h3>
            </div>
            <div className="px-6 py-5">
              <div className="bg-cream rounded-lg p-4 flex items-center gap-3.5 mb-4">
                <div className="text-[40px]">{selected.icon}</div>
                <div>
                  <h4 className="font-serif text-base font-semibold">{selected.name}</h4>
                  <p className="text-xs text-ink-soft mt-0.5">₱{selected.peso_value.toLocaleString()} value</p>
                  <strong className="block mt-1.5 font-serif text-lg">{selected.points} points</strong>
                </div>
              </div>
              <p className="text-[13px] text-ink-soft leading-relaxed">
                Your request will go to HR for processing. Items typically delivered within 1–2 weeks. Points are deducted immediately.
              </p>
              {error && <p className="mt-3 text-sm text-warn bg-warn/10 p-2 rounded">{error}</p>}
            </div>
            <div className="px-6 py-4 border-t border-line bg-cream flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={() => setSelected(null)} disabled={pending}>
                Cancel
              </button>
              <button className="btn" onClick={onConfirm} disabled={pending}>
                {pending ? "Submitting..." : "Confirm redemption"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
