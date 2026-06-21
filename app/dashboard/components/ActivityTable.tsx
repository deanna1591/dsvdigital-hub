import type { PointActivity, PointCategory } from "@/lib/types";

export default function ActivityTable({ activity, categories }: { activity: PointActivity[]; categories: PointCategory[] }) {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  if (activity.length === 0) {
    return (
      <div className="bg-paper border border-line rounded-xl p-12 text-center text-ink-faint">
        No activity yet.
      </div>
    );
  }

  return (
    <div className="bg-paper border border-line rounded-xl overflow-hidden">
      <table className="w-full">
        <thead className="bg-cream border-b-[1.5px] border-ink">
          <tr>
            <Th>Date</Th>
            <Th>Category</Th>
            <Th>Note</Th>
            <Th>Points</Th>
          </tr>
        </thead>
        <tbody>
          {activity.map((a, i) => (
            <tr key={a.id} className={`hover:bg-ink/[0.03] ${i > 0 ? "border-t border-line" : ""}`}>
              <Td className="text-ink-soft">{fmtDate(a.created_at)}</Td>
              <Td>{catMap.get(a.category_id) || a.category_id}</Td>
              <Td className="text-ink-soft">{a.note || "—"}</Td>
              <Td>
                <strong className="text-good">+{a.points} pts</strong>
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
