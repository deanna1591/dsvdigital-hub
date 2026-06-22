"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SPIN_ACTIVITIES } from "@/lib/data/spin-activities";

/**
 * Server-side spin: pick a random activity (so the user can't cheat
 * the picker), insert a row, and return the pick to the client to
 * animate.
 *
 * No points. Pure fun.
 */
export async function recordSpin(): Promise<
  | { ok: true; day: number; title: string; instr: string }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Server-side RNG (uniform across all 200)
  const picked = SPIN_ACTIVITIES[Math.floor(Math.random() * SPIN_ACTIVITIES.length)];

  const { error } = await supabase.from("spin_wheel_spins").insert({
    employee_id: user.id,
    activity_day: picked.day,
    activity_title: picked.title,
    activity_instr: picked.instr,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/fun/wheel");
  revalidatePath("/today");
  return { ok: true, day: picked.day, title: picked.title, instr: picked.instr };
}
