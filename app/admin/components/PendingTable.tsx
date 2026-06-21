"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveOrder, rejectOrder } from "../actions";
import type { RedemptionOrder } from "@/lib/types";

type Enriched = RedemptionOrder & { employee_name: string };

export default function PendingTable({ orders }: { orders: Enriched[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

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
          <Th>Date</Th>
          <Th className="text-right pr-5">Actions</Th>
        </tr>
      </thead>
      <tbody>
        {orders.map((o, i) => (
          <tr key={o.id} className={i > 0 ? "border-t border-line" : ""}>
            <Td>
              <strong>{o.employee_name}</strong>
            </Td>
            <Td>
              <span className="text-lg mr-1">{o.item_icon}</span> {o.item_name}
            </Td>
            <Td>
              {o.points_spent} pts <span className="text-ink-faint text-xs">(₱{o.peso_value.toLocaleString()})</span>
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
        ))}
      </tbody>
    </table>
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
