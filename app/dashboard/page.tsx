import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TopBar from "@/app/components/TopBar";
import BalanceHero from "./components/BalanceHero";
import DashboardTabs from "./components/DashboardTabs";
import type {
  CatalogItem, EmployeeBalance, RedemptionOrder, PointActivity, PointCategory,
  Mission, MissionSubmission, DailySpark, DailySparkClaim,
  BingoEvent, BingoSquare, BingoClaim, SpinBalance, SlotSpin
} from "@/lib/types";

export const dynamic = "force-dynamic";

export type FeedEvent = {
  id: string;
  type: "mission_completed" | "redemption" | "milestone_birthday" | "milestone_anniversary" | "spark_claimed";
  employee_id: string;
  employee_name: string;
  timestamp: string;
  mission_title?: string;
  mission_emoji?: string;
  mission_color?: string;
  mission_type?: string;
  proof_url?: string | null;
  proof_text?: string | null;
  points?: number;
  item_name?: string;
  item_icon?: string;
  points_spent?: number;
  peso_value?: number;
  milestone_points?: number;
  spark_title?: string;
  spark_emoji?: string;
  spark_color?: string;
};

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const today = new Date();
  const todayISO = today.toISOString().slice(0, 10);
  const dayOfYear = getDayOfYear(today);

  const [
    balanceRes, catalogRes, ordersRes, activityRes, categoriesRes, missionsRes, mySubsRes,
    allBalancesRes, feedSubsRes, feedOrdersRes, feedMilestonesRes,
    todaysSparkRes, todaysClaimRes, recentSparkClaimsRes,
    activeBingoRes, mySparkApprovedRes,
    spinBalanceRes, recentSpinsRes, topWinsRes,
  ] = await Promise.all([
    supabase.from("employee_balances").select("*").eq("id", user.id).single(),
    supabase.from("catalog_items").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("redemption_orders").select("*").eq("employee_id", user.id).order("created_at", { ascending: false }),
    supabase.from("point_activities").select("*").eq("employee_id", user.id).order("created_at", { ascending: false }).limit(50),
    supabase.from("point_categories").select("*"),
    supabase.from("missions").select("*").eq("is_active", true).order("is_pinned", { ascending: false }).order("sort_order"),
    supabase.from("mission_submissions").select("*").eq("employee_id", user.id).order("created_at", { ascending: false }),
    supabase.from("employee_balances").select("id,name").eq("is_active", true),
    supabase
      .from("mission_submissions")
      .select("id,employee_id,proof_url,proof_text,updated_at,mission:missions(title,cover_emoji,cover_color,mission_type)")
      .eq("status", "approved")
      .order("updated_at", { ascending: false }).limit(20),
    supabase
      .from("redemption_orders")
      .select("id,employee_id,item_name,item_icon,points_spent,peso_value,updated_at")
      .in("status", ["processing", "delivered"])
      .order("updated_at", { ascending: false }).limit(15),
    supabase
      .from("point_activities")
      .select("id,employee_id,category_id,points,created_at")
      .in("category_id", ["birthday", "anniversary"])
      .order("created_at", { ascending: false }).limit(15),
    supabase.from("daily_sparks").select("*").eq("day_of_year", dayOfYear).eq("is_active", true).maybeSingle(),
    supabase.from("daily_spark_claims").select("*").eq("employee_id", user.id).eq("claim_date", todayISO).maybeSingle(),
    supabase.from("daily_spark_claims").select("*").eq("employee_id", user.id).order("claim_date", { ascending: false }).limit(14),
    supabase.from("bingo_events").select("*").eq("is_active", true).lte("start_date", todayISO).gte("end_date", todayISO).order("created_at", { ascending: false }).limit(1),
    supabase.from("daily_spark_claims").select("id").eq("employee_id", user.id).eq("status", "approved"),
    // Slot machine queries:
    supabase.from("employee_spin_balance").select("*").eq("employee_id", user.id).maybeSingle(),
    supabase.from("slot_spins").select("*").eq("employee_id", user.id).order("created_at", { ascending: false }).limit(12),
    supabase.from("slot_spins").select("employee_id,payout_points,win_label,created_at").in("win_type", ["jackpot", "three_of_kind"]).gte("payout_points", 10).order("payout_points", { ascending: false }).order("created_at", { ascending: false }).limit(10),
  ]);

  const me = balanceRes.data as EmployeeBalance;
  const catalog = (catalogRes.data || []) as CatalogItem[];
  const orders = (ordersRes.data || []) as RedemptionOrder[];
  const activity = (activityRes.data || []) as PointActivity[];
  const categories = (categoriesRes.data || []) as PointCategory[];
  const missions = (missionsRes.data || []) as Mission[];
  const mySubmissions = (mySubsRes.data || []) as MissionSubmission[];

  const todaysSpark = (todaysSparkRes.data || null) as DailySpark | null;
  const todaysClaim = (todaysClaimRes.data || null) as DailySparkClaim | null;
  const recentSparkClaims = (recentSparkClaimsRes.data || []) as DailySparkClaim[];
  const totalSparksApproved = ((mySparkApprovedRes.data || []) as { id: string }[]).length;

  // Calculate streak
  const approvedDates = new Set(
    recentSparkClaims.filter((c) => c.status === "approved" || c.status === "pending").map((c) => c.claim_date)
  );
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    if (approvedDates.has(ds)) streak++;
    else if (i > 0) break;
  }

  // Fetch active bingo squares + claims
  let activeBingo: BingoEvent | null = null;
  let bingoSquares: BingoSquare[] = [];
  let myBingoClaims: BingoClaim[] = [];
  const events = (activeBingoRes.data || []) as BingoEvent[];
  if (events.length > 0) {
    activeBingo = events[0];
    const [squaresRes, claimsRes] = await Promise.all([
      supabase.from("bingo_squares").select("*").eq("event_id", activeBingo.id).order("position"),
      supabase.from("bingo_claims").select("*").eq("event_id", activeBingo.id).eq("employee_id", user.id),
    ]);
    bingoSquares = (squaresRes.data || []) as BingoSquare[];
    myBingoClaims = (claimsRes.data || []) as BingoClaim[];
  }

  // Slot data
  const spinBalanceData = (spinBalanceRes.data as SpinBalance | null) || null;
  const spinBalance = spinBalanceData?.balance ?? 0;
  const totalSpinsEarned = spinBalanceData?.total_earned ?? 0;
  const totalSpinsSpent = spinBalanceData?.total_spent ?? 0;
  const recentSpins = (recentSpinsRes.data || []) as SlotSpin[];
  const topWinsRaw = (topWinsRes.data || []) as { employee_id: string; payout_points: number; win_label: string; created_at: string }[];

  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-ink-soft mb-2">Setting up your profile...</p>
          <p className="text-xs text-ink-faint">If this persists, contact HR.</p>
        </div>
      </div>
    );
  }

  // Build feed
  const nameMap = new Map<string, string>(((allBalancesRes.data as { id: string; name: string }[]) || []).map((b) => [b.id, b.name]));

  const topWins = topWinsRaw.map((w) => ({
    employee_name: nameMap.get(w.employee_id) || "Teammate",
    payout_points: w.payout_points,
    win_label: w.win_label,
    created_at: w.created_at,
  }));
  const feed: FeedEvent[] = [];

  for (const s of (feedSubsRes.data || []) as any[]) {
    const m = s.mission;
    if (!m) continue;
    feed.push({
      id: `m-${s.id}`, type: "mission_completed",
      employee_id: s.employee_id, employee_name: nameMap.get(s.employee_id) || "Teammate",
      timestamp: s.updated_at,
      mission_title: m.title, mission_emoji: m.cover_emoji, mission_color: m.cover_color, mission_type: m.mission_type,
      proof_url: s.proof_url, proof_text: s.proof_text,
    });
  }
  for (const o of (feedOrdersRes.data || []) as any[]) {
    feed.push({
      id: `r-${o.id}`, type: "redemption",
      employee_id: o.employee_id, employee_name: nameMap.get(o.employee_id) || "Teammate",
      timestamp: o.updated_at,
      item_name: o.item_name, item_icon: o.item_icon, points_spent: o.points_spent, peso_value: o.peso_value,
    });
  }
  for (const a of (feedMilestonesRes.data || []) as any[]) {
    feed.push({
      id: `b-${a.id}`,
      type: a.category_id === "birthday" ? "milestone_birthday" : "milestone_anniversary",
      employee_id: a.employee_id, employee_name: nameMap.get(a.employee_id) || "Teammate",
      timestamp: a.created_at, milestone_points: a.points,
    });
  }
  feed.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const feedSlice = feed.slice(0, 30);

  return (
    <>
      <TopBar me={me} currentView="employee" />
      <main className="max-w-[1280px] mx-auto p-6 sm:p-8">
        <BalanceHero me={me} activeOrders={orders.filter((o) => o.status === "pending" || o.status === "processing").length} />
        <DashboardTabs
          me={me}
          catalog={catalog}
          orders={orders}
          activity={activity}
          categories={categories}
          missions={missions}
          mySubmissions={mySubmissions}
          feed={feedSlice}
          todaysSpark={todaysSpark}
          todaysClaim={todaysClaim}
          recentSparkClaims={recentSparkClaims}
          totalSparksApproved={totalSparksApproved}
          sparkStreak={streak}
          activeBingo={activeBingo}
          bingoSquares={bingoSquares}
          myBingoClaims={myBingoClaims}
          spinBalance={spinBalance}
          recentSpins={recentSpins}
          totalSpinsEarned={totalSpinsEarned}
          totalSpinsSpent={totalSpinsSpent}
          topWins={topWins}
        />
      </main>
    </>
  );
}
