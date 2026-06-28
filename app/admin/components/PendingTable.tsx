"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveOrder, rejectOrder } from "../actions";
import type { RedemptionOrder } from "@/lib/types";

type Enriched = RedemptionOrder & { employee_name: string };

export default function PendingTable({ orders }: { orders: Enriched[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<string | null>(null);

  function act(fn: typeof approveOrder | typeof rejectOrder, id: string) {
    startTransition(async () => {
      await fn(id);
      router.refresh();
    });
  }

  if (orders.length === 0) {
    return <div className="p-10 text-center text-ink-faint text-sm">No pending redemptions 🎉</div>;
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-line">
          <Th>Employee</Th>
          <Th>Item</Th>
          <Th>Cost</Th>
          <Th>Ship to</Th>
          <Th>Date</Th>
          <Th className="text-right pr-5">Actions</Th>
        </tr>
      </thead>
      <tbody>
        {orders.map((o, i) => {
          const isExpanded = expanded === o.id;
          return (
            <Fragment key={o.id}>
              <tr className={i > 0 ? "border-t border-line" : ""}>
                <Td>
                  <strong>{o.employee_name}</strong>
                </Td>
                <Td>
                  <span className="text-lg mr-1">{o.item_icon}</span> {o.item_name}
                </Td>
                <Td>
                  {o.points_spent} pts <span className="text-ink-faint text-xs">(₱{o.peso_value.toLocaleString()})</span>
                </Td>
                <Td>
                  {o.shipping_name ? (
                    <button
                      onClick={() => setExpanded(isExpanded ? null : o.id)}
                      className="text-bronze font-bold text-xs underline-offset-2 hover:underline"
                    >
                      📦 {o.shipping_name} {isExpanded ? "▴" : "▾"}
                    </button>
                  ) : (
                    <span className="text-ink-faint text-xs italic">— no info —</span>
                  )}
                </Td>
                <Td className="text-ink-soft">{fmtDate(o.created_at)}</Td>
                <Td className="text-right pr-5">
                  <div className="flex gap-1.5 justify-end">
                    <button
                      className="btn btn-sm btn-good"
                      disabled={pending}
                      onClick={() => act(approveOrder, o.id)}
                    >
                      Approve
                    </button>
                    <button
                      className="btn btn-sm btn-warn"
                      disabled={pending}
                      onClick={() => {
                        if (confirm("Reject this redemption? Points will be refunded.")) {
                          act(rejectOrder, o.id);
                        }
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </Td>
              </tr>
              {isExpanded && o.shipping_name && (
                <tr className="border-t border-line bg-cream/40">
                  <td colSpan={6} className="px-4 py-3 text-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl">
                      <Field label="Recipient" value={o.shipping_name} />
                      <Field label="Phone" value={o.shipping_phone} copyable />
                      <Field label="Address" value={o.shipping_address} copyable wrap />
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

function Field({
  label,
  value,
  copyable,
  wrap,
}: {
  label: string;
  value: string | null;
  copyable?: boolean;
  wrap?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.15em] uppercase font-bold text-ink-soft mb-0.5 flex items-center gap-2">
        <span>{label}</span>
        {copyable && value && (
          <button
            onClick={() => navigator.clipboard.writeText(value)}
            className="text-bronze text-[10px] underline-offset-2 hover:underline normal-case tracking-normal font-normal"
            title="Copy"
          >
            copy
          </button>
        )}
      </div>
      <div className={`text-sm font-medium ${wrap ? "whitespace-pre-wrap" : ""}`}>
        {value || <span className="text-ink-faint italic">—</span>}
      </div>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`text-left px-4 py-3 text-[10px] tracking-[0.15em] uppercase font-bold text-ink-soft ${className}`}>{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3.5 text-sm align-middle ${className}`}>{children}</td>;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
