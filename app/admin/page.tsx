import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StatsRow from "./components/StatsRow";
import PendingTable from "./components/PendingTable";
import ProcessedTable from "./components/ProcessedTable";
import AwardPointsForm from "./components/AwardPointsForm";
import TeamBalances from "./components/TeamBalances";
import MissionSubmissionsTable from "./components/MissionSubmissionsTable";
import ActivityClaimsTable from "./components/ActivityClaimsTable";
import type { EmployeeBalance, RedemptionOrder, PointCategory, MissionSubmission, Mission } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminOperationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [pendingRes, processedRes, balancesRes, categoriesRes, submissionsRes, sparkClaimsRes, bingoClaimsRes] = await Promise.all([
    supabase.from("redemption_orders").select("*").eq("status", "pending").order("created_at", { ascending: false }),
    supabase.from("redemption_orders").select("*").neq("status", "pending").order("updated_at", { ascending: false }).limit(20),
    supabase.from("employee_balances").select("*").eq("is_active", true).order("balance", { ascending: false }),
    supabase.from("point_categories").select("*").eq("is_active", true).order("default_points", { ascending: true }),
    supabase.from("mission_submissions").select("*, mission:missions(*)").eq("status", "pending").order("created_at", { ascending: false }),
    supabase.from("daily_spark_claims").select("*, spark:daily_sparks(title, emoji, points)").eq("status", "pending").order("created_at", { ascending: false }),
    supabase.from("bingo_claims").select("*, square:bingo_squares(label, points), event:bingo_events(title)").eq("status", "pending").order("created_at", { ascending: false }),
  ]);

  const pending = (pendingRes.data || []) as RedemptionOrder[];
  const processed = (processedRes.data || []) as RedemptionOrder[];
  const balances = (balancesRes.data || []) as EmployeeBalance[];
  const categories = (categoriesRes.data || []) as PointCategory[];
  const submissions = (submissionsRes.data || []) as (MissionSubmission & { mission: Mission })[];

  const nameMap = new Map(balances.map((b) => [b.id, b.name]));
  const pendingEnriched = pending.map((o) => ({ ...o, employee_name: nameMap.get(o.employee_id) || "Unknown" }));
  const processedEnriched = processed.map((o) => ({ ...o, employee_name: nameMap.get(o.employee_id) || "Unknown" }));
  const submissionsEnriched = submissions.map((s) => ({ ...s, employee_name: nameMap.get(s.employee_id) || "Unknown" }));

  const sparkEnriched = ((sparkClaimsRes.data || []) as any[]).map((c) => ({
    id: c.id, kind: "spark" as const,
    employee_name: nameMap.get(c.employee_id) || "Unknown",
    proof_url: c.proof_url, proof_text: c.proof_text, created_at: c.created_at,
    spark_title: c.spark?.title || "Spark", spark_emoji: c.spark?.emoji || "✨",
    points: c.spark?.points || 5,
  }));
  const bingoEnriched = ((bingoClaimsRes.data || []) as any[]).map((c) => ({
    id: c.id, kind: "bingo" as const,
    employee_name: nameMap.get(c.employee_id) || "Unknown",
    proof_url: c.proof_url, proof_text: c.proof_text, created_at: c.created_at,
    square_label: c.square?.label || "Square", event_title: c.event?.title || "Bingo",
    points: c.square?.points || 5,
  }));
  const activityClaims = [...sparkEnriched, ...bingoEnriched].sort(
    (a, b) => b.created_at.localeCompare(a.created_at)
  );

  const outstandingPoints = pending.reduce((s, o) => s + o.points_spent, 0);
  const outstandingPhp = pending.reduce((s, o) => s + o.peso_value, 0);
  const processedYtdPhp = processed.filter((o) => o.status === "delivered").reduce((s, o) => s + o.peso_value, 0);

  return (
    <main className="max-w-[1280px] mx-auto p-6 sm:p-8 pt-7">
      <StatsRow
        pendingCount={pending.length + submissionsEnriched.length + activityClaims.length}
        outstandingPoints={outstandingPoints}
        outstandingPhp={outstandingPhp}
        processedYtdPhp={processedYtdPhp}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-7">
        <div className="space-y-6">
          {activityClaims.length > 0 && (
            <div className="bg-paper border-[1.5px] border-graphite rounded-y2k shadow-[3px_3px_0_#272727] overflow-hidden">
              <div className="px-5 py-4 border-b-[1.5px] border-ink bg-cream flex items-center justify-between">
                <h3 className="font-serif text-lg font-semibold">Daily Spark & Bingo Claims</h3>
                <span className="pill pill-pending">{activityClaims.length} pending</span>
              </div>
              <ActivityClaimsTable claims={activityClaims} />
            </div>
          )}

          <div className="bg-paper border-[1.5px] border-graphite rounded-y2k shadow-[3px_3px_0_#272727] overflow-hidden">
            <div className="px-5 py-4 border-b-[1.5px] border-ink bg-cream flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold">Mission Submissions</h3>
              {submissionsEnriched.length > 0 && (
                <span className="pill pill-pending">{submissionsEnriched.length} pending</span>
              )}
            </div>
            <MissionSubmissionsTable submissions={submissionsEnriched} />
          </div>

          <div className="bg-paper border-[1.5px] border-graphite rounded-y2k shadow-[3px_3px_0_#272727] overflow-hidden">
            <div className="px-5 py-4 border-b-[1.5px] border-ink bg-cream flex items-center justify-between">
              <h3 className="font-serif text-lg font-semibold">Pending Redemptions</h3>
              {pendingEnriched.length > 0 && (
                <span className="pill pill-pending">{pendingEnriched.length} pending</span>
              )}
            </div>
            <PendingTable orders={pendingEnriched} />
          </div>

          <div className="bg-paper border-[1.5px] border-graphite rounded-y2k shadow-[3px_3px_0_#272727] overflow-hidden">
            <div className="px-5 py-4 border-b-[1.5px] border-ink bg-cream">
              <h3 className="font-serif text-lg font-semibold">Recently Processed</h3>
            </div>
            <ProcessedTable orders={processedEnriched} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-paper border-[1.5px] border-graphite rounded-y2k shadow-[3px_3px_0_#272727] overflow-hidden">
            <div className="px-5 py-4 border-b-[1.5px] border-ink bg-cream">
              <h3 className="font-serif text-lg font-semibold">Award Points</h3>
            </div>
            <AwardPointsForm employees={balances} categories={categories} />
          </div>

          <div className="bg-paper border-[1.5px] border-graphite rounded-y2k shadow-[3px_3px_0_#272727] overflow-hidden">
            <div className="px-5 py-4 border-b-[1.5px] border-ink bg-cream">
              <h3 className="font-serif text-lg font-semibold">Team Balances</h3>
            </div>
            <TeamBalances balances={balances} />
          </div>
        </div>
      </div>
    </main>
  );
}
