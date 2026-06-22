"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function saveMoodCheckin(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const mood = String(formData.get("mood") || "").trim();
  const submood = String(formData.get("submood") || "").trim() || null;
  const note = String(formData.get("note") || "").trim() || null;
  const shareToFeed = formData.get("share_to_feed") === "on";

  if (!mood) {
    return { error: "Pick a mood first" };
  }

  const { error } = await supabase.from("mood_checkins").insert({
    employee_id: user.id,
    mood,
    submood,
    note,
    share_to_feed: shareToFeed,
  });

  if (error) {
    return { error: error.message };
  }

  // Refresh the timeline + mood page
  revalidatePath("/wellness/mood");
  revalidatePath("/today");
  return { ok: true };
}

export async function deleteMoodCheckin(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id") || "");
  if (!id) return { error: "No id provided" };

  // RLS ensures users can only delete their own
  const { error } = await supabase.from("mood_checkins").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/wellness/mood");
  return { ok: true };
}
