"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markDelivered } from "../actions";
import type { RedemptionOrder } from "@/lib/types";

type Enriched = RedemptionOrder & { employee_name: string };

export default function ProcessedTable({ orders }: { orders: Enriched[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (orders.length === 0) {
    return <div className="p-10 text-center text-ink-faint text-sm">No processed orders yet.</div>;
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-line">
          <Th>Employee</Th>
          <Th>Item</Th>
          <Th>Status</Th>
          <Th>Date</Th>
          <Th></Th>
        </tr>
      </thead>
      <tbody>
        {orders.map((o, i) => (
          <tr key={o.id} className={i > 0 ? "border-t border-line" : ""}>
            <Td>{o.employee_name}</Td>
            <Td>
              <span className="text-lg mr-1">{o.item_icon}</span> {o.item_name}
            </Td>
            <Td>
              <span className={`pill pill-${o.status}`}>{o.status}</span>
            </Td>
            <Td className="text-ink-soft">{fmtDate(o.updated_at)}</Td>
            <Td className="text-right pr-4">
              {o.status === "processing" && (
                <button
                  className="btn btn-sm"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      await markDelivered(o.id);
                      router.refresh();
                    });
                  }}
                >
                  Mark Delivered
                </button>
              )}
            </Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="text-left px-4 py-3 text-[10px] tracking-[0.15em] uppercase font-bold text-ink-soft">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3.5 text-sm align-middle ${className}`}>{children}</td>;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
