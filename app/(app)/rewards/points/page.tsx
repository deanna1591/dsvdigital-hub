import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/me";
import ActivityTable from "@/app/dashboard/components/ActivityTable";
import type { PointActivity, PointCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PointsPage() {
  const { userId } = await getCurrentUser();
  const supabase = await createClient();

  const [activityRes, categoriesRes] = await Promise.all([
    supabase
      .from("point_activities")
      .select("*")
      .eq("employee_id", userId)
      .order("created_at", { ascending: false }),
    supabase.from("point_categories").select("*"),
  ]);

  const activity = (activityRes.data ?? []) as PointActivity[];
  const categories = (categoriesRes.data ?? []) as PointCategory[];

  return <ActivityTable activity={activity} categories={categories} />;
}
