import type { EmployeeBalance } from "@/lib/types";

export default function BalanceHero({ me, activeOrders }: { me: EmployeeBalance; activeOrders: number }) {
  const firstName = me.name.split(" ")[0];
  return (
    <div className="bg-graphite text-paper p-6 sm:p-9 rounded-y2k mb-8 grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-6 md:gap-8 items-center border-[1.5px] border-graphite shadow-[6px_6px_0_#E6ABE1] relative overflow-hidden">
      {/* Decorative dot pattern */}
      <div className="absolute -top-4 -right-4 w-32 h-32 bg-goldrush/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-lavender/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative">
        <div className="text-[11px] tracking-[0.2em] uppercase opacity-70 mb-2 font-bold">My Wallet</div>
        <h2 className="font-serif text-2xl sm:text-3xl font-semibold mb-5 leading-tight">Hello, {firstName} 👋</h2>
        <div className="flex items-baseline gap-3 sm:gap-4 mb-2 flex-wrap">
          <span className="font-serif text-[56px] sm:text-[72px] font-bold leading-none tracking-tight text-goldrush">{me.balance}</span>
          <span className="text-base sm:text-lg opacity-70 font-medium">points available</span>
        </div>
        <p className="text-sm sm:text-[15px] opacity-85">
          ≈ <strong className="font-serif font-semibold text-lg text-paper">₱{(me.balance * 5).toLocaleString()}</strong> to spend on redemptions
        </p>
      </div>
      <div className="md:border-l md:border-dashed md:border-white/30 md:pl-8 grid grid-cols-3 md:grid-cols-1 gap-4 pt-5 md:pt-0 border-t md:border-t-0 border-dashed border-white/30 relative">
        <Stat label="Earned" value={`${me.earned_total} pts`} />
        <Stat label="Redeemed" value={`${me.redeemed_total} pts`} />
        <Stat label="Orders" value={`${activeOrders}`} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.18em] uppercase opacity-70 mb-1 font-bold">{label}</div>
      <div className="font-serif text-[18px] sm:text-[22px] font-semibold">{value}</div>
    </div>
  );
}
