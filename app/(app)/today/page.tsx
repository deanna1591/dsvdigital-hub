import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/me";
import { getStreakTimeline } from "@/lib/data/streak";
import { StreakTimeline } from "@/components/streak-timeline";
import MoodQuickCheck from "@/components/mood-quick-check";
import BalanceHero from "@/app/dashboard/components/BalanceHero";
import SparkOfTheDay from "@/app/dashboard/components/SparkOfTheDay";
import type { DailySpark, DailySparkClaim } from "@/lib/types";

export const dynamic = "force-dynamic";

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { me, userId } = await getCurrentUser();
  const { notice } = await searchParams;
  const supabase = await createClient();
  const today = new Date();
  const dayOfYear = getDayOfYear(today);

  // Fetch today's spark + claim, active orders count, recent claims, mood today
  const [sparkRes, sparkClaimRes, ordersRes, recentSparkClaimsRes, totalApprovedRes, moodTodayRes] = await Promise.all([
    supabase
      .from("daily_sparks")
      .select("*")
      .eq("day_of_year", dayOfYear)
      .eq("is_active", true)
      .maybeSingle(),
    supabase
      .from("daily_spark_claims")
      .select("*")
      .eq("employee_id", userId)
      .gte("created_at", today.toISOString().slice(0, 10) + "T00:00:00Z")
      .maybeSingle(),
    supabase
      .from("redemption_orders")
      .select("id", { count: "exact" })
      .eq("employee_id", userId)
      .in("status", ["pending", "processing"]),
    supabase
      .from("daily_spark_claims")
      .select("*")
      .eq("employee_id", userId)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(7),
    supabase
      .from("daily_spark_claims")
      .select("id", { count: "exact" })
      .eq("employee_id", userId)
      .eq("status", "approved"),
    supabase
      .from("mood_checkins")
      .select("id", { count: "exact" })
      .eq("employee_id", userId)
      .gte("created_at", today.toISOString().slice(0, 10) + "T00:00:00Z"),
  ]);

  const todaysSpark = (sparkRes.data ?? null) as DailySpark | null;
  const todaysClaim = (sparkClaimRes.data ?? null) as DailySparkClaim | null;
  const activeOrders = ordersRes.count ?? 0;
  const recentSparkClaims = (recentSparkClaimsRes.data ?? []) as DailySparkClaim[];
  const totalSparksApproved = totalApprovedRes.count ?? 0;
  const alreadyMoodToday = (moodTodayRes.count ?? 0) > 0;
  // Simple "streak" = consecutive days back from today with an approved claim
  const sparkStreak = computeStreak(recentSparkClaims);

  // Streak timeline data (last 7 days of activity)
  const timeline = await getStreakTimeline(userId, 7);

  return (
    <>
      {notice === "admin_only" && (
        <div className="mb-4 p-3 bg-bubblegum/40 border-[1.5px] border-graphite rounded-y2k text-sm flex items-center gap-2">
          <span>🔒</span>
          <span>
            <strong>That area is admin-only.</strong> Reach out to your admin if you think you need access.
          </span>
        </div>
      )}
      <BalanceHero me={me} activeOrders={activeOrders} />

      <MoodQuickCheck alreadyCheckedIn={alreadyMoodToday} />

      <section className="mb-10">
        <SparkOfTheDay
          todaysSpark={todaysSpark}
          todaysClaim={todaysClaim}
          recentClaims={recentSparkClaims}
          totalClaimed={totalSparksApproved}
          daysActive={sparkStreak}
        />
      </section>

      <section className="mb-10">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-serif text-2xl font-semibold">Your streak timeline</h2>
          <span className="text-xs text-ink-soft font-medium">last 7 days</span>
        </div>
        <StreakTimeline days={timeline} />
      </section>
    </>
  );
}

function computeStreak(claims: DailySparkClaim[]): number {
  if (claims.length === 0) return 0;
  const dates = new Set(claims.map((c) => c.created_at.slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  // Allow today if claimed, then walk backwards
  while (true) {
    const iso = cursor.toISOString().slice(0, 10);
    if (dates.has(iso)) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      // If today isn't claimed but yesterday is, start from yesterday
      if (streak === 0) {
        cursor.setDate(cursor.getDate() - 1);
        const yiso = cursor.toISOString().slice(0, 10);
        if (dates.has(yiso)) {
          streak++;
          cursor.setDate(cursor.getDate() - 1);
          continue;
        }
      }
      break;
    }
  }
  return streak;
}
