"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
  return supabase;
}

/**
 * Extract the storage path (after the bucket name) from a public URL.
 * e.g.  https://x.supabase.co/storage/v1/object/public/bingo-proofs/userId/boardId/claimId.jpg
 *   ->  userId/boardId/claimId.jpg
 */
function pathFromUrl(url: string): string | null {
  const marker = "/bingo-proofs/";
  const i = url.indexOf(marker);
  if (i === -1) return null;
  return url.slice(i + marker.length);
}

/**
 * Delete a single photo from storage and null its photo_url in the DB.
 * The claim row itself is kept so review history isn't lost.
 */
export async function deleteOnePhoto(claimId: string): Promise<{ ok: true } | { error: string }> {
  const supabase = await requireAdmin();

  const { data: claim } = await supabase
    .from("bingo_board_claims")
    .select("id, photo_url")
    .eq("id", claimId)
    .single();
  if (!claim) return { error: "Claim not found" };

  if (claim.photo_url) {
    const path = pathFromUrl(claim.photo_url);
    if (path) {
      const { error: removeErr } = await supabase.storage
        .from("bingo-proofs")
        .remove([path]);
      if (removeErr) {
        return { error: `Storage delete failed: ${removeErr.message}` };
      }
    }
  }

  const { error: dbErr } = await supabase
    .from("bingo_board_claims")
    .update({ photo_url: null })
    .eq("id", claimId);
  if (dbErr) return { error: dbErr.message };

  revalidatePath("/admin/bingo/photos");
  return { ok: true };
}

/**
 * Delete every photo associated with a specific board.
 * The claim rows survive — only the storage files + photo_url column are wiped.
 */
export async function deletePhotosForBoard(
  boardId: string,
): Promise<{ ok: true; deleted: number } | { error: string }> {
  const supabase = await requireAdmin();

  // Find all claim photos for this board's squares
  const { data: claims } = await supabase
    .from("bingo_board_claims")
    .select("id, photo_url, square_id, bingo_board_squares!inner(board_id)")
    .eq("bingo_board_squares.board_id", boardId)
    .not("photo_url", "is", null);

  if (!claims || claims.length === 0) return { ok: true, deleted: 0 };

  // Storage removals (can be batched)
  const paths = claims
    .map((c) => (c.photo_url ? pathFromUrl(c.photo_url) : null))
    .filter((p): p is string => p !== null);

  if (paths.length > 0) {
    const { error: removeErr } = await supabase.storage
      .from("bingo-proofs")
      .remove(paths);
    if (removeErr) {
      return { error: `Storage delete failed: ${removeErr.message}` };
    }
  }

  // Null the photo_url on all those claims
  const claimIds = claims.map((c) => c.id);
  const { error: dbErr } = await supabase
    .from("bingo_board_claims")
    .update({ photo_url: null })
    .in("id", claimIds);
  if (dbErr) return { error: dbErr.message };

  revalidatePath("/admin/bingo/photos");
  return { ok: true, deleted: paths.length };
}

/**
 * Delete ALL bingo photos across all boards.
 * Nuclear option — use sparingly.
 */
export async function deleteAllPhotos(): Promise<
  { ok: true; deleted: number } | { error: string }
> {
  const supabase = await requireAdmin();

  const { data: claims } = await supabase
    .from("bingo_board_claims")
    .select("id, photo_url")
    .not("photo_url", "is", null);

  if (!claims || claims.length === 0) return { ok: true, deleted: 0 };

  const paths = claims
    .map((c) => (c.photo_url ? pathFromUrl(c.photo_url) : null))
    .filter((p): p is string => p !== null);

  if (paths.length > 0) {
    const { error: removeErr } = await supabase.storage
      .from("bingo-proofs")
      .remove(paths);
    if (removeErr) {
      return { error: `Storage delete failed: ${removeErr.message}` };
    }
  }

  const claimIds = claims.map((c) => c.id);
  const { error: dbErr } = await supabase
    .from("bingo_board_claims")
    .update({ photo_url: null })
    .in("id", claimIds);
  if (dbErr) return { error: dbErr.message };

  revalidatePath("/admin/bingo/photos");
  return { ok: true, deleted: paths.length };
}
