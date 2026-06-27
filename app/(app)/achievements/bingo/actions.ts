"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function claimBingoSquare({
  squareId,
  proofUrl,
  proofText,
}: {
  squareId: string;
  proofUrl?: string;
  proofText?: string;
}): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const url = proofUrl?.trim() || null;
  const text = proofText?.trim() || null;
  if (!url && !text) {
    return { error: "Provide a photo link or a description" };
  }

  // Insert OR update (in case of re-submission after rejection)
  // The unique (square_id, employee_id) constraint means we need to handle both.
  const { data: existing } = await supabase
    .from("bingo_board_claims")
    .select("id, status")
    .eq("square_id", squareId)
    .eq("employee_id", user.id)
    .maybeSingle();

  if (existing) {
    if (existing.status !== "rejected") {
      return { error: "You've already claimed this square" };
    }
    // Re-submit
    const { error } = await supabase
      .from("bingo_board_claims")
      .update({
        photo_url: url,
        proof_text: text,
        status: "pending",
        rejection_note: null,
        reviewed_by: null,
      })
      .eq("id", existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("bingo_board_claims").insert({
      square_id: squareId,
      employee_id: user.id,
      photo_url: url,
      proof_text: text,
      status: "pending",
    });
    if (error) return { error: error.message };
  }

  revalidatePath("/achievements/bingo");
  revalidatePath("/today");
  return { ok: true };
}
