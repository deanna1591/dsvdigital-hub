"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function getUserOrRedirect() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

export async function createHabit(formData: FormData) {
  const { supabase, userId } = await getUserOrRedirect();
  const name = String(formData.get("name") || "").trim();
  const emoji = String(formData.get("emoji") || "🌱").trim() || "🌱";
  if (!name) return { error: "Name is required" };

  const { error } = await supabase.from("habits").insert({
    employee_id: userId,
    name,
    emoji,
    is_active: true,
  });
  if (error) return { error: error.message };

  revalidatePath("/wellness/habits");
  return { ok: true };
}

export async function toggleCompletion(habitId: string, date: string) {
  const { supabase, userId } = await getUserOrRedirect();

  // Check if completion exists for this date
  const { data: existing } = await supabase
    .from("habit_completions")
    .select("id")
    .eq("habit_id", habitId)
    .eq("employee_id", userId)
    .eq("completed_on", date)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("habit_completions").delete().eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("habit_completions").insert({
      habit_id: habitId,
      employee_id: userId,
      completed_on: date,
    });
    if (error) return { error: error.message };
  }

  revalidatePath("/wellness/habits");
  revalidatePath("/today");
  return { ok: true };
}

export async function deleteHabit(habitId: string) {
  const { supabase, userId } = await getUserOrRedirect();
  const { error } = await supabase
    .from("habits")
    .delete()
    .eq("id", habitId)
    .eq("employee_id", userId);
  if (error) return { error: error.message };
  revalidatePath("/wellness/habits");
  return { ok: true };
}

export async function saveReflection(formData: FormData) {
  const { supabase, userId } = await getUserOrRedirect();
  const habitId = String(formData.get("habit_id") || "");
  const streakCount = Number(formData.get("streak_count") || 0);
  const whatWorks = String(formData.get("what_works") || "").trim() || null;
  const whatIsHard = String(formData.get("what_is_hard") || "").trim() || null;
  if (!habitId || !streakCount) return { error: "Missing habit or streak" };
  if (!whatWorks && !whatIsHard) return { error: "Add at least one note" };

  const { error } = await supabase
    .from("habit_reflections")
    .upsert(
      {
        habit_id: habitId,
        employee_id: userId,
        streak_count: streakCount,
        what_works: whatWorks,
        what_is_hard: whatIsHard,
      },
      { onConflict: "habit_id,streak_count" },
    );
  if (error) return { error: error.message };
  revalidatePath("/wellness/habits");
  return { ok: true };
}
