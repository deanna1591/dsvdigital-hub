import { createClient } from "@/lib/supabase/server";
import type { DayEntry, DayState, ActivityItem } from "@/components/streak-timeline";

/**
 * Builds the last `nDays` of activity for the streak timeline.
 *
 * Pulls from multiple tables and groups by calendar date:
 *   - daily_spark_claims (sparks claimed/pending)
 *   - bingo_board_claims (bingo squares stamped)
 *   - mission_submissions (missions submitted)
 *   - point_activities (manual awards, etc)
 *   - mood_checkins (mood logs, no points)
 *
 * Today gets a special label and state.
 */
export async function getStreakTimeline(userId: string, nDays = 7): Promise<DayEntry[]> {
  const supabase = await createClient();

  // Build the date range
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (nDays - 1));
  const startISO = startDate.toISOString().slice(0, 10);

  // Fetch all relevant activity in parallel
  const [
    sparkClaimsRes,
    bingoClaimsRes,
    missionsRes,
    pointsRes,
    moodsRes,
    spinsRes,
    todaysSparkRes,
  ] = await Promise.all([
    supabase
      .from("daily_spark_claims")
      .select("*, spark:daily_sparks(title, emoji, points)")
      .eq("employee_id", userId)
      .gte("created_at", startISO + "T00:00:00Z")
      .order("created_at", { ascending: false }),
    supabase
      .from("bingo_board_claims")
      .select("*, square:bingo_board_squares(name, emoji)")
      .eq("employee_id", userId)
      .gte("created_at", startISO + "T00:00:00Z"),
    supabase
      .from("mission_submissions")
      .select("*, mission:missions(title, cover_emoji, points)")
      .eq("employee_id", userId)
      .gte("created_at", startISO + "T00:00:00Z"),
    supabase
      .from("point_activities")
      .select("*")
      .eq("employee_id", userId)
      .gte("created_at", startISO + "T00:00:00Z"),
    supabase
      .from("mood_checkins")
      .select("*")
      .eq("employee_id", userId)
      .gte("created_at", startISO + "T00:00:00Z"),
    supabase
      .from("spin_wheel_spins")
      .select("id, activity_day, activity_title, created_at")
      .eq("employee_id", userId)
      .gte("created_at", startISO + "T00:00:00Z"),
    // Today's spark to show as CTA if not yet claimed
    supabase
      .from("daily_sparks")
      .select("*")
      .eq("day_of_year", getDayOfYear(today))
      .eq("is_active", true)
      .maybeSingle(),
  ]);

  const sparkClaims = (sparkClaimsRes.data || []) as Array<{
    created_at: string;
    status: string;
    spark?: { title: string; emoji: string; points: number };
  }>;
  const bingoClaims = (bingoClaimsRes.data || []) as Array<{
    created_at: string;
    status: string;
    square?: { name: string; emoji: string };
  }>;
  const missions = (missionsRes.data || []) as Array<{
    created_at: string;
    status: string;
    mission?: { title: string; cover_emoji: string; points: number };
  }>;
  const points = (pointsRes.data || []) as Array<{
    created_at: string;
    points: number;
    note: string | null;
    category_id?: string | null;
  }>;
  const moods = (moodsRes.data || []) as Array<{
    created_at: string;
    mood: string;
    submood?: string | null;
  }>;
  const spins = (spinsRes.data || []) as Array<{
    id: string;
    activity_day: number;
    activity_title: string;
    created_at: string;
  }>;
  const todaysSpark = todaysSparkRes.data as { title: string; emoji: string; points: number } | null;

  // Group activity by ISO date
  const byDate = new Map<string, ActivityItem[]>();
  const push = (iso: string, item: ActivityItem) => {
    const date = iso.slice(0, 10);
    const list = byDate.get(date) ?? [];
    list.push(item);
    byDate.set(date, list);
  };

  for (const c of sparkClaims) {
    push(c.created_at, {
      icon: c.spark?.emoji ?? "✨",
      title: c.spark?.title ?? "Daily Spark",
      subtitle: c.status === "pending" ? "Waiting for review" : c.status === "rejected" ? "Rejected" : undefined,
      points: c.spark?.points,
      status: c.status === "pending" ? "pending" : "approved",
      time: formatTime(c.created_at),
    });
  }
  for (const c of bingoClaims) {
    push(c.created_at, {
      icon: c.square?.emoji ?? "🎲",
      title: c.square?.name ?? "Bingo square",
      subtitle: "Bingo claim · " + c.status,
      points: 5,
      status: c.status === "pending" ? "pending" : "approved",
      time: formatTime(c.created_at),
    });
  }
  for (const m of missions) {
    push(m.created_at, {
      icon: m.mission?.cover_emoji ?? "⚡",
      title: m.mission?.title ?? "Mission",
      subtitle: m.status === "pending" ? "Submitted, waiting review" : `Mission · ${m.status}`,
      points: m.mission?.points,
      status: m.status === "pending" ? "pending" : "approved",
      time: formatTime(m.created_at),
    });
  }
  for (const p of points) {
    push(p.created_at, {
      icon: "💰",
      title: p.category_id ?? "Points awarded",
      subtitle: p.note ?? undefined,
      points: p.points,
      status: "approved",
      time: formatTime(p.created_at),
    });
  }
  for (const m of moods) {
    push(m.created_at, {
      icon: "🌷",
      title: "Mood check-in",
      subtitle: m.submood ? `${m.mood} · ${m.submood}` : m.mood,
      noPoints: true,
      time: formatTime(m.created_at),
    });
  }
  for (const s of spins) {
    push(s.created_at, {
      icon: "🪩",
      title: titleCase(s.activity_title),
      subtitle: `Spin · Day ${s.activity_day} of 200`,
      noPoints: true,
      time: formatTime(s.created_at),
    });
  }

  // Build the day entries from most recent to oldest
  const days: DayEntry[] = [];
  for (let i = 0; i < nDays; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const items = (byDate.get(iso) ?? []).sort((a, b) =>
      (b.time ?? "").localeCompare(a.time ?? ""),
    );
    const isToday = i === 0;
    const state = computeState(isToday, items);

    // For today, if there's a spark that hasn't been claimed yet, show CTA
    if (isToday && todaysSpark && !items.some((it) => it.title === todaysSpark.title)) {
      items.unshift({
        icon: todaysSpark.emoji,
        title: todaysSpark.title,
        subtitle: "Today's spark · not claimed yet",
        points: todaysSpark.points,
        ctaLabel: "Claim",
        ctaHref: "/today",
      });
    }

    days.push({
      date: iso,
      dayLabel: formatDayLabel(d, isToday),
      state,
      items,
    });
  }

  return days;
}

function computeState(isToday: boolean, items: ActivityItem[]): DayState {
  if (isToday) return "today";
  if (items.length === 0) return "miss";
  if (items.some((it) => it.status === "pending")) return "pending";
  if (items.some((it) => (it.points ?? 0) > 0 && it.status === "approved")) return "streak";
  return "done";
}

function formatDayLabel(d: Date, isToday: boolean): string {
  if (isToday) {
    return "Today · " + d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function getDayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => (w.length === 0 ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}
