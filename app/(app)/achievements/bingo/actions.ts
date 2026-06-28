"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/heic"];

/**
 * Submit (or re-submit) a bingo square claim.
 *
 * Accepts either a photo file (≤5MB) OR a text proof. At least one
 * must be provided.
 *
 * If the user has a rejected claim for this square, the row is
 * updated in place (the unique(square_id, employee_id) constraint
 * means we can't insert a second row).
 */
export async function claimBingoSquare(
  formData: FormData,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const squareId = String(formData.get("squareId") || "");
  const proofText = String(formData.get("proofText") || "").trim() || null;
  const photo = formData.get("photo") as File | null;

  if (!squareId) return { error: "Square id missing" };

  // Validate inputs — must have a photo or text
  const hasPhoto = photo && photo.size > 0;
  if (!hasPhoto && !proofText) {
    return { error: "Add a photo or a description" };
  }

  if (photo && hasPhoto) {
    if (photo.size > MAX_PHOTO_BYTES) {
      return { error: "Photo is over 5 MB. Try a smaller one." };
    }
    if (!ALLOWED_TYPES.includes(photo.type)) {
      return { error: "Only PNG/JPG/WebP photos are allowed" };
    }
  }

  // Resolve board_id (needed for storage path)
  const { data: square } = await supabase
    .from("bingo_board_squares")
    .select("board_id")
    .eq("id", squareId)
    .single();
  if (!square) return { error: "Square not found" };
  const boardId = square.board_id as string;

  // Check for existing claim (re-submission path)
  const { data: existing } = await supabase
    .from("bingo_board_claims")
    .select("id, status, photo_url")
    .eq("square_id", squareId)
    .eq("employee_id", user.id)
    .maybeSingle();

  if (existing && existing.status !== "rejected") {
    return { error: "You've already claimed this square" };
  }

  // Compute storage path: {userId}/{boardId}/{claimId}.{ext}
  // We need the claimId first — either existing.id (re-submit) or a new uuid
  let photoUrl: string | null = existing?.photo_url ?? null;

  if (hasPhoto && photo) {
    const claimId = existing?.id ?? crypto.randomUUID();
    const ext = photo.type === "image/png" ? "png"
              : photo.type === "image/webp" ? "webp"
              : photo.type === "image/heic" ? "heic"
              : "jpg";
    const path = `${user.id}/${boardId}/${claimId}.${ext}`;

    // If there's an existing photo (re-submission), remove it first
    if (existing?.photo_url) {
      const oldPath = existing.photo_url.split("/bingo-proofs/")[1];
      if (oldPath) {
        await supabase.storage.from("bingo-proofs").remove([oldPath]);
      }
    }

    const { error: uploadErr } = await supabase.storage
      .from("bingo-proofs")
      .upload(path, photo, {
        contentType: photo.type,
        cacheControl: "31536000",
        upsert: true,
      });

    if (uploadErr) {
      return { error: `Photo upload failed: ${uploadErr.message}` };
    }

    const { data: urlData } = supabase.storage
      .from("bingo-proofs")
      .getPublicUrl(path);
    photoUrl = urlData.publicUrl;

    if (existing) {
      // Re-submit: update existing row
      const { error } = await supabase
        .from("bingo_board_claims")
        .update({
          photo_url: photoUrl,
          proof_text: proofText,
          status: "pending",
          rejection_note: null,
          reviewed_by: null,
        })
        .eq("id", existing.id);
      if (error) return { error: error.message };
    } else {
      // New claim — use the claimId we just used for the storage path
      const { error } = await supabase.from("bingo_board_claims").insert({
        id: claimId,
        square_id: squareId,
        employee_id: user.id,
        photo_url: photoUrl,
        proof_text: proofText,
        status: "pending",
      });
      if (error) {
        // Cleanup orphaned upload
        await supabase.storage.from("bingo-proofs").remove([path]);
        return { error: error.message };
      }
    }
  } else {
    // Text-only submission (no photo)
    if (existing) {
      const { error } = await supabase
        .from("bingo_board_claims")
        .update({
          photo_url: null,
          proof_text: proofText,
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
        photo_url: null,
        proof_text: proofText,
        status: "pending",
      });
      if (error) return { error: error.message };
    }
  }

  revalidatePath("/achievements/bingo");
  revalidatePath("/today");
  return { ok: true };
}
