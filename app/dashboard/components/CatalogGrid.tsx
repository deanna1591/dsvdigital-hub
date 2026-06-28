"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { redeemItem } from "../actions";
import type { CatalogItem } from "@/lib/types";

export default function CatalogGrid({
  catalog,
  balance,
  defaultName,
  defaultPhone,
}: {
  catalog: CatalogItem[];
  balance: number;
  defaultName: string;
  defaultPhone: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Shipping form state — pre-filled from profile, persisted per-modal
  const [shipName, setShipName] = useState(defaultName);
  const [shipPhone, setShipPhone] = useState(defaultPhone);
  const [shipAddress, setShipAddress] = useState("");

  function openModal(item: CatalogItem) {
    setError(null);
    setSelected(item);
  }

  function closeModal() {
    if (pending) return;
    setSelected(null);
    setError(null);
  }

  function onConfirm() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const res = await redeemItem(selected.id, {
        name: shipName,
        phone: shipPhone,
        address: shipAddress,
      });
      if (res?.error) {
        setError(res.error);
      } else {
        setSelected(null);
        setShipAddress(""); // clear address for next order
        router.refresh();
      }
    });
  }

  return (
    <>
      {/* Balance banner up top */}
      <div className="mb-6 p-4 bg-paper border-[1.5px] border-graphite rounded-y2k shadow-[3px_3px_0_#E6ABE1] flex items-baseline gap-3 flex-wrap">
        <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-ink-soft">Available balance</span>
        <strong className="font-serif text-3xl font-bold text-graphite">
          {balance.toLocaleString()}
          <span className="text-sm font-sans font-bold text-ink-soft ml-1">points</span>
        </strong>
        <span className="text-xs text-ink-soft ml-auto">
          ≈ ₱{(balance * 5).toLocaleString()} value
        </span>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5">
        {catalog.map((item) => {
          const canAfford = balance >= item.points;
          const shortBy = canAfford ? 0 : item.points - balance;
          return (
            <div
              key={item.id}
              className={`bg-paper border-[1.5px] border-graphite rounded-y2k shadow-[3px_3px_0_#272727] p-5 transition-all flex flex-col ${
                canAfford ? "hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#272727]" : "opacity-60"
              }`}
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
                  onClick={() => openModal(item)}
                  title={canAfford ? "Redeem this item" : `Need ${shortBy} more points`}
                >
                  {canAfford ? "Redeem" : `−${shortBy}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <div
          className="fixed inset-0 bg-graphite/60 flex items-center justify-center z-[100] p-5"
          onClick={closeModal}
        >
          <div
            className="bg-paper rounded-y2k max-w-md w-full border-[1.5px] border-graphite overflow-hidden shadow-[4px_4px_0_#272727] max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 pt-4 pb-3 border-b-[1.5px] border-graphite bg-cream">
              <h3 className="font-serif text-lg font-semibold">Confirm redemption</h3>
            </div>

            <div className="px-5 py-4 overflow-y-auto space-y-4">
              {/* Item card */}
              <div className="bg-cream rounded-y2k border-[1.5px] border-line p-3 flex items-center gap-3">
                <div className="text-[36px] leading-none">{selected.icon}</div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-serif text-base font-semibold leading-tight">{selected.name}</h4>
                  <p className="text-xs text-ink-soft mt-0.5">₱{selected.peso_value.toLocaleString()} value</p>
                </div>
                <strong className="font-serif text-lg font-bold whitespace-nowrap">{selected.points} pts</strong>
              </div>

              {/* Balance breakdown */}
              <div className="bg-bubblegum/20 border-[1.5px] border-graphite rounded-y2k px-3 py-2 text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-ink-soft">Available balance</span>
                  <span className="font-bold tabular-nums">{balance.toLocaleString()} pts</span>
                </div>
                <div className="flex justify-between py-1 text-error">
                  <span>This redemption</span>
                  <span className="font-bold tabular-nums">−{selected.points.toLocaleString()} pts</span>
                </div>
                <div className="flex justify-between py-1.5 mt-1 border-t-[1.5px] border-graphite font-bold">
                  <span>Remaining after order</span>
                  <span className="font-serif text-base tabular-nums">
                    {(balance - selected.points).toLocaleString()} pts
                  </span>
                </div>
              </div>

              {/* Shipping form */}
              <div className="space-y-3">
                <div className="flex items-baseline gap-2">
                  <h5 className="font-serif text-sm font-bold">Shipping info</h5>
                  <span className="text-[10px] text-ink-soft">Required</span>
                </div>

                <div>
                  <label className="label" htmlFor="ship-name">Recipient name *</label>
                  <input
                    id="ship-name"
                    type="text"
                    value={shipName}
                    onChange={(e) => setShipName(e.target.value)}
                    className="input"
                    placeholder="Full name"
                    maxLength={80}
                    required
                  />
                </div>

                <div>
                  <label className="label" htmlFor="ship-phone">Phone *</label>
                  <input
                    id="ship-phone"
                    type="tel"
                    value={shipPhone}
                    onChange={(e) => setShipPhone(e.target.value)}
                    className="input"
                    placeholder="+63 917 ..."
                    maxLength={30}
                    required
                  />
                </div>

                <div>
                  <label className="label" htmlFor="ship-address">Shipping address *</label>
                  <textarea
                    id="ship-address"
                    value={shipAddress}
                    onChange={(e) => setShipAddress(e.target.value)}
                    className="textarea min-h-[80px]"
                    placeholder="Street, barangay, city, province, postal code"
                    maxLength={500}
                    required
                  />
                  <p className="text-[10px] text-ink-soft mt-1">
                    Include full address so HR can ship without follow-up.
                  </p>
                </div>
              </div>

              <p className="text-[12px] text-ink-soft leading-relaxed italic">
                Your request goes to HR for processing. Items typically delivered within 1–2 weeks.
                Points are deducted immediately on confirm.
              </p>

              {error && (
                <div className="p-2 bg-error/10 border-[1.5px] border-error text-error text-sm rounded font-medium">
                  ⚠️ {error}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-line bg-cream flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={closeModal} disabled={pending}>
                Cancel
              </button>
              <button className="btn" onClick={onConfirm} disabled={pending}>
                {pending ? "Submitting…" : "Confirm redemption"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
