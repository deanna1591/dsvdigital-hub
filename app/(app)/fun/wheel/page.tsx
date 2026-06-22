import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/me";
import SpinWheel from "./SpinWheel";
import SpinHistory from "./SpinHistory";

export const dynamic = "force-dynamic";

export default async function WheelPage() {
  const { userId } = await getCurrentUser();
  const supabase = await createClient();

  const [historyRes, countRes] = await Promise.all([
    supabase
      .from("spin_wheel_spins")
      .select("id, activity_day, activity_title, activity_instr, reflection_prompt, reflection_notice, reflection_feel, reflection_else, reflected_at, created_at")
      .eq("employee_id", userId)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("spin_wheel_spins")
      .select("id", { count: "exact", head: true })
      .eq("employee_id", userId),
  ]);

  const spins = (historyRes.data ?? []) as Array<{
    id: string;
    activity_day: number;
    activity_title: string;
    activity_instr: string;
    reflection_prompt: string | null;
    reflection_notice: string | null;
    reflection_feel: string | null;
    reflection_else: string | null;
    reflected_at: string | null;
    created_at: string;
  }>;
  const totalSpins = countRes.count ?? 0;

  return (
    <div className="max-w-2xl mx-auto">
      <SpinWheel initialSpinCount={totalSpins} />
      <SpinHistory spins={spins} />
    </div>
  );
}
