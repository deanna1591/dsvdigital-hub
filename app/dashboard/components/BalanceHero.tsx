import type { EmployeeBalance } from "@/lib/types";

export default function BalanceHero({ me, activeOrders }: { me: EmployeeBalance; activeOrders: number }) {
  const firstName = me.name.split(" ")[0];
  return (
    <div className="bg-ink text-paper p-9 rounded-xl mb-8 grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-8 items-center shadow-[6px_6px_0_#d97435]">
      <div>
        <div className="text-[11px] tracking-[0.2em] uppercase opacity-70 mb-2 font-bold">My Wallet</div>
        <h2 className="font-serif text-3xl font-semibold mb-5 leading-tight">Hello, {firstName} 👋</h2>
        <div className="flex items-baseline gap-4 mb-2">
          <span className="font-serif text-[72px] font-bold leading-none tracking-tight text-accent-2">{me.balance}</span>
          <span className="text-lg opacity-70 font-medium">points available</span>
        </div>
        <p className="text-[15px] opacity-85">
          ≈ <strong className="font-serif font-semibold text-lg">₱{(me.balance * 5).toLocaleString()}</strong> to spend on redemptions
        </p>
      </div>
      <div className="md:border-l md:border-dashed md:border-white/30 md:pl-8 grid grid-cols-2 md:grid-cols-1 gap-4 pt-5 md:pt-0 border-t md:border-t-0 border-dashed border-white/30">
        <Stat label="Earned YTD" value={`${me.earned_total} pts`} />
        <Stat label="Redeemed YTD" value={`${me.redeemed_total} pts`} />
        <Stat label="Active Orders" value={`${activeOrders}`} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.18em] uppercase opacity-70 mb-1 font-bold">{label}</div>
      <div className="font-serif text-[22px] font-semibold">{value}</div>
    </div>
  );
}
