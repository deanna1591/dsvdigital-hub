"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const LUCKY_BONUS = 10;
const BINGO_CATEGORY = "engagement"; // matches existing spark/mission convention

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (data?.role !== "admin") redirect("/today");
  return { supabase, user };
}

export async function approveClaim(
  claimId: string,
): Promise<{ ok: true; pointsAwarded: number } | { error: string }> {
  const { supabase, user } = await requireAdmin();

  // Fetch the claim with joined square (for points/name) and board (for title)
  const { data: claim, error: cErr } = await supabase
    .from("bingo_board_claims")
    .select(`
      id,
      employee_id,
      status,
      bingo_board_squares!inner (
        name,
        points,
        is_lucky,
        bingo_boards!inner (title)
      )
    `)
    .eq("id", claimId)
    .single();
  if (cErr || !claim) return { error: "Claim not found" };

  if (claim.status === "approved") {
    return { error: "Already approved" };
  }

  // Type-safe destructuring of the joined data
  type JoinedSquare = { name: string; points: number; is_lucky: boolean; bingo_boards: { title: string } };
  const square = claim.bingo_board_squares as unknown as JoinedSquare;
  const board = square.bingo_boards;

  const basePoints = square.points ?? 5;
  const bonus = square.is_lucky ? LUCKY_BONUS : 0;
  const totalPoints = basePoints + bonus;

  // Award points
  const { error: actErr } = await supabase.from("point_activities").insert({
    employee_id: claim.employee_id,
    category_id: BINGO_CATEGORY,
    points: totalPoints,
    note: `Bingo: ${board.title} — ${square.name}${square.is_lucky ? " ⭐ (+lucky)" : ""}`,
    awarded_by: user.id,
  });
  if (actErr) {
    return { error: `Couldn't award points: ${actErr.message}` };
  }

  // Mark approved
  const { error: updErr } = await supabase
    .from("bingo_board_claims")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      rejection_note: null,
    })
    .eq("id", claimId);
  if (updErr) return { error: updErr.message };

  revalidatePath("/admin/bingo/claims");
  revalidatePath("/achievements/bingo");
  revalidatePath("/today");
  return { ok: true, pointsAwarded: totalPoints };
}

export async function rejectClaim(
  claimId: string,
  rejectionNote: string,
): Promise<{ ok: true } | { error: string }> {
  const { supabase, user } = await requireAdmin();
  const note = rejectionNote.trim() || null;

  const { error } = await supabase
    .from("bingo_board_claims")
    .update({
      status: "rejected",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      rejection_note: note,
    })
    .eq("id", claimId);
  if (error) return { error: error.message };

  revalidatePath("/admin/bingo/claims");
  revalidatePath("/achievements/bingo");
  return { ok: true };
}
