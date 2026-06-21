import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/me";
import FeedTimeline from "@/app/dashboard/components/FeedTimeline";
import type { FeedEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const { me } = await getCurrentUser();
  const supabase = await createClient();

  // Recent missions completions (approved), redemptions delivered, sparks claimed
  const [missionsRes, redemptionsRes, sparksRes, namesRes] = await Promise.all([
    supabase
      .from("mission_submissions")
      .select("*, mission:missions(title, emoji, cover_color, type)")
      .eq("status", "approved")
      .order("reviewed_at", { ascending: false })
      .limit(20),
    supabase
      .from("redemption_orders")
      .select("*")
      .eq("status", "delivered")
      .order("updated_at", { ascending: false })
      .limit(10),
    supabase
      .from("daily_spark_claims")
      .select("*, spark:daily_sparks(title, emoji, color, points)")
      .eq("status", "approved")
      .order("reviewed_at", { ascending: false })
      .limit(15),
    supabase.from("profiles").select("id, name"),
  ]);

  const nameMap = new Map<string, string>(
    (namesRes.data ?? []).map((r) => [r.id as string, r.name as string]),
  );

  const events: FeedEvent[] = [];

  for (const m of (missionsRes.data ?? []) as Array<{
    id: string;
    employee_id: string;
    proof_url: string | null;
    proof_text: string | null;
    points_awarded: number;
    reviewed_at: string;
    mission?: { title: string; emoji: string; cover_color: string; type: string };
  }>) {
    events.push({
      id: "m_" + m.id,
      type: "mission_completed",
      employee_id: m.employee_id,
      employee_name: nameMap.get(m.employee_id) ?? "Teammate",
      timestamp: m.reviewed_at,
      mission_title: m.mission?.title,
      mission_emoji: m.mission?.emoji,
      mission_color: m.mission?.cover_color,
      mission_type: m.mission?.type,
      proof_url: m.proof_url,
      proof_text: m.proof_text,
      points: m.points_awarded,
    });
  }

  for (const r of (redemptionsRes.data ?? []) as Array<{
    id: string;
    employee_id: string;
    item_name: string;
    item_icon: string;
    points_spent: number;
    peso_value: number;
    updated_at: string;
  }>) {
    events.push({
      id: "r_" + r.id,
      type: "redemption",
      employee_id: r.employee_id,
      employee_name: nameMap.get(r.employee_id) ?? "Teammate",
      timestamp: r.updated_at,
      item_name: r.item_name,
      item_icon: r.item_icon,
      points_spent: r.points_spent,
      peso_value: r.peso_value,
    });
  }

  for (const s of (sparksRes.data ?? []) as Array<{
    id: string;
    employee_id: string;
    reviewed_at: string;
    spark?: { title: string; emoji: string; color: string; points: number };
  }>) {
    events.push({
      id: "s_" + s.id,
      type: "spark_claimed",
      employee_id: s.employee_id,
      employee_name: nameMap.get(s.employee_id) ?? "Teammate",
      timestamp: s.reviewed_at,
      spark_title: s.spark?.title,
      spark_emoji: s.spark?.emoji,
      spark_color: s.spark?.color,
      points: s.spark?.points,
    });
  }

  events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return <FeedTimeline events={events} currentUserName={me.name} />;
}
