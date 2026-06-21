"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { MissionType, ProofType } from "@/lib/types";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" as const, supabase: null, user: null };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { error: "Not authorized" as const, supabase: null, user: null };
  return { error: null, supabase, user };
}

export type MissionInput = {
  title: string;
  description: string;
  points: number;
  mission_type: MissionType;
  platform: string;
  proof_type: ProofType;
  cover_color: string;
  cover_emoji: string;
  external_link: string;
  instructions: string;
  is_pinned: boolean;
  is_active: boolean;
  max_per_user: number;
  expires_at: string;
  sort_order: number;
};

function validate(input: MissionInput): string | null {
  if (!input.title.trim()) return "Title is required";
  if (!input.description.trim()) return "Description is required";
  if (!Number.isFinite(input.points) || input.points <= 0) return "Points must be greater than 0";
  if (input.external_link && !/^https?:\/\//i.test(input.external_link.trim())) return "External link must start with http:// or https://";
  return null;
}

function inputToRow(input: MissionInput) {
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    points: Math.round(input.points),
    mission_type: input.mission_type,
    platform: input.platform.trim() || null,
    proof_type: input.proof_type,
    cover_color: input.cover_color || "#E6ABE1",
    cover_emoji: input.cover_emoji || "🎯",
    external_link: input.external_link.trim() || null,
    instructions: input.instructions.trim() || null,
    is_pinned: input.is_pinned,
    is_active: input.is_active,
    max_per_user: Math.round(input.max_per_user) || 1,
    expires_at: input.expires_at ? new Date(input.expires_at).toISOString() : null,
    sort_order: Math.round(input.sort_order) || 100,
  };
}

export async function addMission(input: MissionInput): Promise<{ error?: string } | void> {
  const { error: authErr, supabase } = await requireAdmin();
  if (authErr || !supabase) return { error: authErr || "Auth failed" };

  const invalid = validate(input);
  if (invalid) return { error: invalid };

  const { error } = await supabase.from("missions").insert(inputToRow(input));
  if (error) return { error: error.message };
  revalidatePath("/admin/missions");
  revalidatePath("/dashboard");
}

export async function updateMission(id: string, input: MissionInput): Promise<{ error?: string } | void> {
  const { error: authErr, supabase } = await requireAdmin();
  if (authErr || !supabase) return { error: authErr || "Auth failed" };

  const invalid = validate(input);
  if (invalid) return { error: invalid };

  const { error } = await supabase.from("missions").update(inputToRow(input)).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/missions");
  revalidatePath("/dashboard");
}

export async function toggleMissionActive(id: string, nextValue: boolean): Promise<{ error?: string } | void> {
  const { error: authErr, supabase } = await requireAdmin();
  if (authErr || !supabase) return { error: authErr || "Auth failed" };

  const { error } = await supabase.from("missions").update({ is_active: nextValue }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/missions");
  revalidatePath("/dashboard");
}

export async function deleteMission(id: string): Promise<{ error?: string } | void> {
  const { error: authErr, supabase } = await requireAdmin();
  if (authErr || !supabase) return { error: authErr || "Auth failed" };

  // Check if any submissions reference this mission
  const { count } = await supabase
    .from("mission_submissions")
    .select("id", { count: "exact", head: true })
    .eq("mission_id", id);

  if (count && count > 0) {
    const { error } = await supabase.from("missions").update({ is_active: false }).eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/admin/missions");
    revalidatePath("/dashboard");
    return { error: `Mission has ${count} submission(s) — archived instead of deleted to preserve history.` };
  }

  const { error } = await supabase.from("missions").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/missions");
  revalidatePath("/dashboard");
}
