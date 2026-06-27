"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Save a finished strip to Supabase Storage + record metadata.
 * Called from the client with the composed strip's PNG bytes (base64).
 */
export async function saveStrip(formData: FormData): Promise<
  | { ok: true; id: string; url: string }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const file = formData.get("strip") as File | null;
  const shareToFeed = formData.get("share_to_feed") === "on";

  if (!file) return { ok: false, error: "No strip provided" };
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, error: "Strip too large (max 5 MB)" };
  }

  // Generate a UUID for the strip and use it in the storage path
  const stripId = crypto.randomUUID();
  const path = `${user.id}/${stripId}.png`;

  // Upload to Supabase Storage
  const { error: uploadErr } = await supabase.storage
    .from("photobooth-strips")
    .upload(path, file, {
      contentType: "image/png",
      cacheControl: "31536000",
      upsert: false,
    });

  if (uploadErr) {
    return { ok: false, error: `Upload failed: ${uploadErr.message}` };
  }

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from("photobooth-strips")
    .getPublicUrl(path);
  const imageUrl = urlData.publicUrl;

  // Save metadata row (use the same stripId so storage path and DB row align)
  const { error: dbErr } = await supabase.from("photobooth_strips").insert({
    id: stripId,
    employee_id: user.id,
    image_url: imageUrl,
    share_to_feed: shareToFeed,
  });

  if (dbErr) {
    // Best-effort cleanup of orphaned file
    await supabase.storage.from("photobooth-strips").remove([path]);
    return { ok: false, error: `Failed to save: ${dbErr.message}` };
  }

  revalidatePath("/fun/photobooth");
  revalidatePath("/today");
  return { ok: true, id: stripId, url: imageUrl };
}

/**
 * Toggle whether a strip is shared to the team feed.
 */
export async function toggleShare(
  stripId: string,
): Promise<{ ok: true; share_to_feed: boolean } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch current state, RLS ensures own only
  const { data: strip, error: fetchErr } = await supabase
    .from("photobooth_strips")
    .select("share_to_feed")
    .eq("id", stripId)
    .eq("employee_id", user.id)
    .single();

  if (fetchErr || !strip) return { ok: false, error: "Strip not found" };

  const newShare = !strip.share_to_feed;
  const { error } = await supabase
    .from("photobooth_strips")
    .update({ share_to_feed: newShare })
    .eq("id", stripId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/fun/photobooth");
  return { ok: true, share_to_feed: newShare };
}

/**
 * Delete a strip (the DB row + the storage file).
 */
export async function deleteStrip(
  stripId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS prevents cross-user deletes, but be explicit
  const { error: dbErr } = await supabase
    .from("photobooth_strips")
    .delete()
    .eq("id", stripId)
    .eq("employee_id", user.id);
  if (dbErr) return { ok: false, error: dbErr.message };

  // Remove storage file too
  await supabase.storage
    .from("photobooth-strips")
    .remove([`${user.id}/${stripId}.png`]);

  revalidatePath("/fun/photobooth");
  return { ok: true };
}
