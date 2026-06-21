import type { EmployeeBalance } from "@/lib/types";

export default function TeamBalances({ balances }: { balances: EmployeeBalance[] }) {
  if (balances.length === 0) {
    return (
      <div className="py-12 text-center text-ink-soft">
        <div className="text-4xl mb-3">👥</div>
        <p className="text-sm font-medium mb-1">No teammates yet</p>
        <p className="text-xs text-ink-faint">Import your team from the sheet to populate this list.</p>
      </div>
    );
  }
  return (
    <div className="max-h-[420px] overflow-y-auto">
      {balances.map((e, i) => (
        <div
          key={e.id}
          className={`px-4 sm:px-5 py-3 flex justify-between items-center hover:bg-cream transition-colors ${i > 0 ? "border-t border-line" : ""}`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 bg-lavender text-graphite rounded-full flex items-center justify-center font-bold text-xs border-[1.5px] border-graphite shrink-0">
              {e.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-sm font-medium truncate">{e.name}</div>
          </div>
          <div className="font-serif font-semibold text-base text-goldrush shrink-0 ml-2">
            {e.balance} <span className="text-[11px] text-ink-soft font-sans font-normal">pts</span>
          </div>
        </div>
      ))}
    </div>
  );
}
