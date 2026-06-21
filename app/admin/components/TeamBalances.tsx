import type { EmployeeBalance } from "@/lib/types";

export default function TeamBalances({ balances }: { balances: EmployeeBalance[] }) {
  return (
    <div className="max-h-[420px] overflow-y-auto">
      {balances.map((e, i) => (
        <div
          key={e.id}
          className={`px-5 py-3 flex justify-between items-center ${i > 0 ? "border-t border-line" : ""}`}
        >
          <div className="text-sm font-medium">{e.name}</div>
          <div className="font-serif font-semibold text-base">
            {e.balance} <span className="text-[11px] text-ink-soft font-sans font-normal">pts</span>
          </div>
        </div>
      ))}
    </div>
  );
}
