import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/me";
import HabitsList from "./HabitsList";

export const dynamic = "force-dynamic";

export default async function HabitsPage() {
  const { userId } = await getCurrentUser();
  const supabase = await createClient();

  // Last 90 days of completions is plenty for streak math + 7-day display
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffISO = cutoff.toISOString().slice(0, 10);

  const [habitsRes, completionsRes, reflectionsRes] = await Promise.all([
    supabase
      .from("habits")
      .select("id, name, emoji, created_at")
      .eq("employee_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
    supabase
      .from("habit_completions")
      .select("habit_id, completed_on")
      .eq("employee_id", userId)
      .gte("completed_on", cutoffISO),
    supabase
      .from("habit_reflections")
      .select("habit_id, streak_count, what_works, what_is_hard")
      .eq("employee_id", userId),
  ]);

  return (
    <HabitsList
      habits={(habitsRes.data ?? []) as Array<{ id: string; name: string; emoji: string; created_at: string }>}
      completions={(completionsRes.data ?? []) as Array<{ habit_id: string; completed_on: string }>}
      reflections={(reflectionsRes.data ?? []) as Array<{ habit_id: string; streak_count: number; what_works: string | null; what_is_hard: string | null }>}
    />
  );
}
