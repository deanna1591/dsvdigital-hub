"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" as const, supabase: null, user: null };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { error: "Not authorized" as const, supabase: null, user: null };
  return { error: null, supabase, user };
}

export async function approveOrder(orderId: string): Promise<{ error?: string } | void> {
  const { error: authErr, supabase, user } = await requireAdmin();
  if (authErr || !supabase) return { error: authErr || "Auth failed" };

  const { error } = await supabase
    .from("redemption_orders")
    .update({ status: "processing", approved_by: user!.id })
    .eq("id", orderId)
    .eq("status", "pending");

  if (error) return { error: error.message };
  revalidatePath("/admin");
}

export async function rejectOrder(orderId: string): Promise<{ error?: string } | void> {
  const { error: authErr, supabase, user } = await requireAdmin();
  if (authErr || !supabase) return { error: authErr || "Auth failed" };

  const { error } = await supabase
    .from("redemption_orders")
    .update({ status: "rejected", approved_by: user!.id })
    .eq("id", orderId)
    .eq("status", "pending");

  if (error) return { error: error.message };
  revalidatePath("/admin");
}

export async function markDelivered(orderId: string): Promise<{ error?: string } | void> {
  const { error: authErr, supabase } = await requireAdmin();
  if (authErr || !supabase) return { error: authErr || "Auth failed" };

  const { error } = await supabase
    .from("redemption_orders")
    .update({ status: "delivered" })
    .eq("id", orderId)
    .eq("status", "processing");

  if (error) return { error: error.message };
  revalidatePath("/admin");
}

export async function awardPoints({
  employeeId,
  categoryId,
  points,
  note,
}: {
  employeeId: string;
  categoryId: string;
  points: number;
  note: string;
}): Promise<{ error?: string } | void> {
  const { error: authErr, supabase, user } = await requireAdmin();
  if (authErr || !supabase) return { error: authErr || "Auth failed" };

  if (!Number.isFinite(points) || points <= 0) return { error: "Points must be > 0" };

  const { error } = await supabase.from("point_activities").insert({
    employee_id: employeeId,
    category_id: categoryId,
    points,
    note: note || null,
    awarded_by: user!.id,
  });

  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

export async function approveSubmission(submissionId: string, reviewNote: string): Promise<{ error?: string } | void> {
  const { error: authErr, supabase, user } = await requireAdmin();
  if (authErr || !supabase) return { error: authErr || "Auth failed" };

  // Fetch submission + mission to get points + employee
  const { data: submission, error: subErr } = await supabase
    .from("mission_submissions")
    .select("*, mission:missions(*)")
    .eq("id", submissionId)
    .eq("status", "pending")
    .single();

  if (subErr || !submission) return { error: "Submission not found or already reviewed" };

  const mission = submission.mission as { title: string; points: number };

  // Award points by inserting a point_activity
  const { data: activity, error: actErr } = await supabase
    .from("point_activities")
    .insert({
      employee_id: submission.employee_id,
      category_id: "engagement",
      points: mission.points,
      note: `Mission: ${mission.title}`,
      awarded_by: user!.id,
    })
    .select("id")
    .single();

  if (actErr || !activity) return { error: `Failed to award points: ${actErr?.message}` };

  // Update submission status
  const { error: updErr } = await supabase
    .from("mission_submissions")
    .update({
      status: "approved",
      reviewed_by: user!.id,
      review_note: reviewNote.trim() || null,
      awarded_activity_id: activity.id,
    })
    .eq("id", submissionId);

  if (updErr) return { error: updErr.message };

  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

export async function rejectSubmission(submissionId: string, reviewNote: string): Promise<{ error?: string } | void> {
  const { error: authErr, supabase, user } = await requireAdmin();
  if (authErr || !supabase) return { error: authErr || "Auth failed" };

  const { error } = await supabase
    .from("mission_submissions")
    .update({
      status: "rejected",
      reviewed_by: user!.id,
      review_note: reviewNote.trim() || null,
    })
    .eq("id", submissionId)
    .eq("status", "pending");

  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

// ============ DAILY SPARK ADMIN ACTIONS ============

export async function approveSparkClaim(claimId: string, reviewNote: string): Promise<{ error?: string } | void> {
  const { error: authErr, supabase, user } = await requireAdmin();
  if (authErr || !supabase) return { error: authErr || "Auth failed" };

  const { data: claim, error: cErr } = await supabase
    .from("daily_spark_claims")
    .select("*, spark:daily_sparks(*)")
    .eq("id", claimId)
    .eq("status", "pending")
    .single();
  if (cErr || !claim) return { error: "Claim not found or already reviewed" };

  const spark = claim.spark as { title: string; points: number };

  const { data: activity, error: actErr } = await supabase
    .from("point_activities")
    .insert({
      employee_id: claim.employee_id,
      category_id: "engagement",
      points: spark.points,
      note: `Daily Spark: ${spark.title}`,
      awarded_by: user!.id,
    })
    .select("id")
    .single();
  if (actErr || !activity) return { error: `Failed to award points: ${actErr?.message}` };

  const { error: updErr } = await supabase
    .from("daily_spark_claims")
    .update({
      status: "approved",
      reviewed_by: user!.id,
      review_note: reviewNote.trim() || null,
      awarded_activity_id: activity.id,
    })
    .eq("id", claimId);
  if (updErr) return { error: updErr.message };

  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

export async function rejectSparkClaim(claimId: string, reviewNote: string): Promise<{ error?: string } | void> {
  const { error: authErr, supabase, user } = await requireAdmin();
  if (authErr || !supabase) return { error: authErr || "Auth failed" };

  const { error } = await supabase
    .from("daily_spark_claims")
    .update({
      status: "rejected",
      reviewed_by: user!.id,
      review_note: reviewNote.trim() || null,
    })
    .eq("id", claimId)
    .eq("status", "pending");
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

// ============ BINGO ADMIN ACTIONS ============

export async function approveBingoClaim(claimId: string, reviewNote: string): Promise<{ error?: string } | void> {
  const { error: authErr, supabase, user } = await requireAdmin();
  if (authErr || !supabase) return { error: authErr || "Auth failed" };

  const { data: claim, error: cErr } = await supabase
    .from("bingo_claims")
    .select("*, square:bingo_squares(label, points), event:bingo_events(title)")
    .eq("id", claimId)
    .eq("status", "pending")
    .single();
  if (cErr || !claim) return { error: "Claim not found or already reviewed" };

  const square = claim.square as { label: string; points: number };
  const event = claim.event as { title: string };

  const { data: activity, error: actErr } = await supabase
    .from("point_activities")
    .insert({
      employee_id: claim.employee_id,
      category_id: "engagement",
      points: square.points,
      note: `${event.title}: ${square.label}`,
      awarded_by: user!.id,
    })
    .select("id")
    .single();
  if (actErr || !activity) return { error: `Failed to award points: ${actErr?.message}` };

  const { error: updErr } = await supabase
    .from("bingo_claims")
    .update({
      status: "approved",
      reviewed_by: user!.id,
      review_note: reviewNote.trim() || null,
      awarded_activity_id: activity.id,
    })
    .eq("id", claimId);
  if (updErr) return { error: updErr.message };

  revalidatePath("/admin");
  revalidatePath("/dashboard");
}

export async function rejectBingoClaim(claimId: string, reviewNote: string): Promise<{ error?: string } | void> {
  const { error: authErr, supabase, user } = await requireAdmin();
  if (authErr || !supabase) return { error: authErr || "Auth failed" };

  const { error } = await supabase
    .from("bingo_claims")
    .update({
      status: "rejected",
      reviewed_by: user!.id,
      review_note: reviewNote.trim() || null,
    })
    .eq("id", claimId)
    .eq("status", "pending");
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/dashboard");
}
