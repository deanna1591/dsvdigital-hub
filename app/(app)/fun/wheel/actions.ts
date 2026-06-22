"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SPIN_ACTIVITIES } from "@/lib/data/spin-activities";

/**
 * Server-side spin: pick a random activity, insert a row (with the
 * activity-specific reflection prompt snapshotted), return the pick
 * and the new row id so the client can attach a reflection later.
 */
export async function recordSpin(): Promise<
  | { ok: true; spinId: string; day: number; title: string; instr: string; why: string; prompt: string }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const picked = SPIN_ACTIVITIES[Math.floor(Math.random() * SPIN_ACTIVITIES.length)];

  const { data: row, error } = await supabase
    .from("spin_wheel_spins")
    .insert({
      employee_id: user.id,
      activity_day: picked.day,
      activity_title: picked.title,
      activity_instr: picked.instr,
      reflection_prompt: picked.prompt,
    })
    .select("id")
    .single();

  if (error || !row) {
    return { ok: false, error: error?.message ?? "Failed to record spin" };
  }

  revalidatePath("/fun/wheel");
  revalidatePath("/today");
  return {
    ok: true,
    spinId: row.id,
    day: picked.day,
    title: picked.title,
    instr: picked.instr,
    why: picked.why,
    prompt: picked.prompt,
  };
}

/**
 * Save a reflection journal entry against an existing spin.
 * All three fields are optional, but at least one must be non-empty.
 */
export async function saveReflection(
  spinId: string,
  notice: string,
  feel: string,
  elseText: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const noticeTrim = notice.trim();
  const feelTrim = feel.trim();
  const elseTrim = elseText.trim();

  if (!noticeTrim && !feelTrim && !elseTrim) {
    return { ok: false, error: "Add at least one note before saving" };
  }

  // RLS ensures the user can only update their own row
  const { error } = await supabase
    .from("spin_wheel_spins")
    .update({
      reflection_notice: noticeTrim || null,
      reflection_feel: feelTrim || null,
      reflection_else: elseTrim || null,
      reflected_at: new Date().toISOString(),
    })
    .eq("id", spinId)
    .eq("employee_id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/fun/wheel");
  return { ok: true };
}
