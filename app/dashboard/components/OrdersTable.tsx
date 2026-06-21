import type { RedemptionOrder } from "@/lib/types";

export default function OrdersTable({ orders }: { orders: RedemptionOrder[] }) {
  if (orders.length === 0) {
    return (
      <div className="bg-paper border border-line rounded-xl p-12 text-center text-ink-faint">
        No orders yet. Browse the catalog to redeem!
      </div>
    );
  }

  return (
    <div className="bg-paper border border-line rounded-xl overflow-hidden">
      <table className="w-full">
        <thead className="bg-cream border-b-[1.5px] border-ink">
          <tr>
            <Th>Item</Th>
            <Th>Points Spent</Th>
            <Th>Order Date</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o, i) => (
            <tr key={o.id} className={`hover:bg-ink/[0.03] ${i > 0 ? "border-t border-line" : ""}`}>
              <Td>
                <span className="text-lg mr-1">{o.item_icon}</span> {o.item_name}
              </Td>
              <Td>
                <strong>{o.points_spent} pts</strong>{" "}
                <span className="text-ink-faint text-xs">(₱{o.peso_value.toLocaleString()})</span>
              </Td>
              <Td className="text-ink-soft">{fmtDate(o.created_at)}</Td>
              <Td>
                <span className={`pill pill-${o.status}`}>{o.status}</span>
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-4 py-3 text-[10px] tracking-[0.15em] uppercase font-bold text-ink-soft">{children}</th>;
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3.5 text-sm align-middle ${className}`}>{children}</td>;
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
