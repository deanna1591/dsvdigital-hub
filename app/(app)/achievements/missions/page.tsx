import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/me";
import MissionsGrid from "@/app/dashboard/components/MissionsGrid";
import type { Mission, MissionSubmission } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MissionsPage() {
  const { userId } = await getCurrentUser();
  const supabase = await createClient();

  const [missionsRes, submissionsRes] = await Promise.all([
    supabase
      .from("missions")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("mission_submissions")
      .select("*")
      .eq("employee_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  const missions = (missionsRes.data ?? []) as Mission[];
  const mySubmissions = (submissionsRes.data ?? []) as MissionSubmission[];

  return <MissionsGrid missions={missions} mySubmissions={mySubmissions} />;
}
