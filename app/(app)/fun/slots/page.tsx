import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/me";
import SlotMachine from "@/app/dashboard/components/SlotMachine";
import type { SlotSpin } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SlotsPage() {
  const { userId } = await getCurrentUser();
  const supabase = await createClient();

  const [balanceRes, recentSpinsRes, totalEarnedRes, totalSpentRes, topWinsRes] = await Promise.all([
    supabase
      .from("spin_tokens_ledger")
      .select("delta")
      .eq("employee_id", userId),
    supabase
      .from("slot_spins")
      .select("*")
      .eq("employee_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("spin_tokens_ledger")
      .select("delta")
      .eq("employee_id", userId)
      .gt("delta", 0),
    supabase
      .from("spin_tokens_ledger")
      .select("delta")
      .eq("employee_id", userId)
      .lt("delta", 0),
    supabase
      .from("slot_spins")
      .select("*, profiles!inner(name)")
      .gt("payout_points", 0)
      .order("payout_points", { ascending: false })
      .limit(5),
  ]);

  const spinBalance = (balanceRes.data ?? []).reduce((s, r) => s + (r.delta as number), 0);
  const recentSpins = (recentSpinsRes.data ?? []) as SlotSpin[];
  const totalSpinsEarned = (totalEarnedRes.data ?? []).reduce((s, r) => s + (r.delta as number), 0);
  const totalSpinsSpent = Math.abs((totalSpentRes.data ?? []).reduce((s, r) => s + (r.delta as number), 0));

  const topWins = ((topWinsRes.data ?? []) as Array<{
    payout_points: number;
    win_label: string;
    created_at: string;
    profiles?: { name: string };
  }>).map((w) => ({
    employee_name: w.profiles?.name ?? "Anonymous",
    payout_points: w.payout_points,
    win_label: w.win_label,
    created_at: w.created_at,
  }));

  return (
    <SlotMachine
      spinBalance={spinBalance}
      recentSpins={recentSpins}
      totalEarned={totalSpinsEarned}
      totalSpent={totalSpinsSpent}
      topWins={topWins}
    />
  );
}
