"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type Bucket = "today" | "tomorrow" | "someday" | "brain_dump";
const VALID_BUCKETS: Bucket[] = ["today", "tomorrow", "someday", "brain_dump"];

async function getUserOrRedirect() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

export async function createTask(formData: FormData) {
  const { supabase, userId } = await getUserOrRedirect();
  const text = String(formData.get("text") || "").trim();
  const bucket = String(formData.get("bucket") || "today") as Bucket;
  if (!text) return { error: "Task text required" };
  if (!VALID_BUCKETS.includes(bucket)) return { error: "Invalid bucket" };

  // Position = max(existing) + 1 so new tasks appear at the bottom
  const { data: existing } = await supabase
    .from("personal_tasks")
    .select("position")
    .eq("employee_id", userId)
    .eq("bucket", bucket)
    .order("position", { ascending: false })
    .limit(1);
  const nextPos = existing && existing.length > 0 ? (existing[0].position as number) + 1 : 0;

  const { error } = await supabase.from("personal_tasks").insert({
    employee_id: userId,
    text,
    bucket,
    position: nextPos,
  });
  if (error) return { error: error.message };

  revalidatePath("/wellness/tasks");
  return { ok: true };
}

export async function moveTask(taskId: string, newBucket: Bucket) {
  const { supabase, userId } = await getUserOrRedirect();
  if (!VALID_BUCKETS.includes(newBucket)) return { error: "Invalid bucket" };

  // New position at bottom of new bucket
  const { data: existing } = await supabase
    .from("personal_tasks")
    .select("position")
    .eq("employee_id", userId)
    .eq("bucket", newBucket)
    .order("position", { ascending: false })
    .limit(1);
  const nextPos = existing && existing.length > 0 ? (existing[0].position as number) + 1 : 0;

  const { error } = await supabase
    .from("personal_tasks")
    .update({ bucket: newBucket, position: nextPos, completed_at: null })
    .eq("id", taskId)
    .eq("employee_id", userId);
  if (error) return { error: error.message };

  revalidatePath("/wellness/tasks");
  return { ok: true };
}

export async function toggleTaskDone(taskId: string, currentlyDone: boolean) {
  const { supabase, userId } = await getUserOrRedirect();
  const { error } = await supabase
    .from("personal_tasks")
    .update({ completed_at: currentlyDone ? null : new Date().toISOString() })
    .eq("id", taskId)
    .eq("employee_id", userId);
  if (error) return { error: error.message };
  revalidatePath("/wellness/tasks");
  return { ok: true };
}

export async function deleteTask(taskId: string) {
  const { supabase, userId } = await getUserOrRedirect();
  const { error } = await supabase
    .from("personal_tasks")
    .delete()
    .eq("id", taskId)
    .eq("employee_id", userId);
  if (error) return { error: error.message };
  revalidatePath("/wellness/tasks");
  return { ok: true };
}
