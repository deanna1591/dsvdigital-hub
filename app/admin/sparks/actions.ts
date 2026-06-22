"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (data?.role !== "admin") redirect("/today");
  return supabase;
}

export async function toggleSparkActive(id: string, currentlyActive: boolean) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("daily_sparks")
    .update({ is_active: !currentlyActive })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/sparks");
  revalidatePath("/today");
  return { ok: true };
}

export async function updateSpark(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return { error: "Missing id" };

  const title = String(formData.get("title") || "").trim();
  const prompt = String(formData.get("prompt") || "").trim();
  const emoji = String(formData.get("emoji") || "").trim();
  const color = String(formData.get("color") || "").trim();
  const points = Number(formData.get("points") || 10);
  const proofType = String(formData.get("proof_type") || "text").trim();

  if (!title || !prompt) return { error: "Title and prompt are required" };

  const { error } = await supabase
    .from("daily_sparks")
    .update({ title, prompt, emoji: emoji || "✨", color: color || "#E6ABE1", points, proof_type: proofType })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/sparks");
  revalidatePath("/today");
  return { ok: true };
}

export async function createSpark(formData: FormData) {
  const supabase = await requireAdmin();
  const dayOfYear = Number(formData.get("day_of_year") || 0);
  const title = String(formData.get("title") || "").trim();
  const prompt = String(formData.get("prompt") || "").trim();
  const emoji = String(formData.get("emoji") || "").trim() || "✨";
  const color = String(formData.get("color") || "").trim() || "#E6ABE1";
  const points = Number(formData.get("points") || 10);
  const proofType = String(formData.get("proof_type") || "text").trim();

  if (!dayOfYear || dayOfYear < 1 || dayOfYear > 366) {
    return { error: "day_of_year must be 1-366" };
  }
  if (!title || !prompt) return { error: "Title and prompt are required" };

  const { error } = await supabase.from("daily_sparks").insert({
    day_of_year: dayOfYear,
    title,
    prompt,
    emoji,
    color,
    points,
    proof_type: proofType,
    is_active: true,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/sparks");
  revalidatePath("/today");
  return { ok: true };
}
