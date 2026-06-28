"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const VALID_STATUSES = ["fulltime", "parttime", "contractor", "intern", "leave", "former"] as const;
type EmploymentStatus = (typeof VALID_STATUSES)[number];

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

/**
 * Send an invite email and pre-fill the new employee's profile.
 *
 * Uses the service-role admin client because `auth.admin.inviteUserByEmail`
 * requires elevated privileges. Supabase will email the invitee a magic
 * link; they set a password and become an active user.
 */
export async function inviteEmployee(formData: FormData): Promise<
  { ok: true; userId: string } | { error: string }
> {
  await requireAdmin();

  // Guard against missing service-role key — that's the most common
  // source of an empty {} error.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      error:
        "Server is missing SUPABASE_SERVICE_ROLE_KEY. Add it to your .env.local and restart the dev server.",
    };
  }

  const admin = createAdminClient();

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const name = String(formData.get("name") || "").trim();
  const company = String(formData.get("company_client") || "").trim() || null;
  const statusRaw = String(formData.get("employment_status") || "").trim();
  const status = (VALID_STATUSES as readonly string[]).includes(statusRaw)
    ? (statusRaw as EmploymentStatus)
    : null;
  const phone = String(formData.get("phone") || "").trim() || null;
  const memberSinceRaw = String(formData.get("member_since") || "").trim();
  const memberSince = memberSinceRaw || null;
  const photo = formData.get("photo") as File | null;

  if (!email) return { error: "Email is required" };
  if (!name) return { error: "Name is required" };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Invalid email format" };
  if (statusRaw && !status) return { error: "Invalid employment status" };

  if (photo && photo.size > 0) {
    if (photo.size > MAX_PHOTO_BYTES) return { error: "Photo over 2 MB" };
    if (!ALLOWED_PHOTO_TYPES.includes(photo.type)) {
      return { error: "Photo must be PNG, JPG, or WebP" };
    }
  }

  // Send invite (creates the auth.users row + triggers profile creation)
  let inviteData: Awaited<ReturnType<typeof admin.auth.admin.inviteUserByEmail>>["data"] | null = null;
  let inviteErr: unknown = null;
  try {
    const res = await admin.auth.admin.inviteUserByEmail(email, {
      data: { name },
    });
    inviteData = res.data;
    inviteErr = res.error;
  } catch (e) {
    inviteErr = e;
  }

  if (inviteErr || !inviteData?.user) {
    // Log the full error to the server console for inspection — the
    // client only sees the stringified summary.
    // eslint-disable-next-line no-console
    console.error("[invite] failed:", inviteErr);

    // Pull the most useful message out of whatever shape the error is.
    const e = inviteErr as { message?: string; code?: string; status?: number; error_description?: string } | null;
    const summary =
      e?.message ||
      e?.error_description ||
      (e?.code ? `code=${e.code}` : null) ||
      (e?.status ? `HTTP ${e.status}` : null) ||
      (typeof e === "object" ? JSON.stringify(e) : String(e)) ||
      "no user returned";
    return { error: `Invite failed: ${summary}. Check the dev server terminal for full details.` };
  }
  const userId = inviteData.user.id;

  // Upload photo if provided
  let photoUrl: string | null = null;
  if (photo && photo.size > 0) {
    const ext = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
    const path = `${userId}/avatar.${ext}`;
    const { error: upErr } = await admin.storage
      .from("employee-photos")
      .upload(path, photo, {
        contentType: photo.type,
        cacheControl: "31536000",
        upsert: true,
      });
    if (upErr) {
      // Don't fail the whole invite — log and continue
      console.error("[invite] photo upload failed:", upErr.message);
    } else {
      const { data } = admin.storage.from("employee-photos").getPublicUrl(path);
      photoUrl = data.publicUrl;
    }
  }

  // Update the profile row created by the trigger with all the extra details
  const { error: updErr } = await admin
    .from("profiles")
    .update({
      name,
      email,
      photo_url: photoUrl,
      company_client: company,
      employment_status: status,
      phone,
      member_since: memberSince,
    })
    .eq("id", userId);

  if (updErr) {
    return { error: `Profile update failed: ${updErr.message}` };
  }

  revalidatePath("/admin/team");
  return { ok: true, userId };
}

/**
 * Update an existing employee's profile (admin can change any field).
 */
export async function updateEmployee(formData: FormData): Promise<
  { ok: true } | { error: string }
> {
  await requireAdmin();
  const admin = createAdminClient();

  const id = String(formData.get("id") || "");
  if (!id) return { error: "Missing employee id" };

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase() || null;
  const company = String(formData.get("company_client") || "").trim() || null;
  const statusRaw = String(formData.get("employment_status") || "").trim();
  const status = (VALID_STATUSES as readonly string[]).includes(statusRaw)
    ? statusRaw
    : null;
  const phone = String(formData.get("phone") || "").trim() || null;
  const memberSinceRaw = String(formData.get("member_since") || "").trim();
  const memberSince = memberSinceRaw || null;
  const photo = formData.get("photo") as File | null;

  if (!name) return { error: "Name is required" };
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Invalid email" };
  }
  if (statusRaw && !status) return { error: "Invalid status" };

  // Handle photo upload if provided
  let photoUrl: string | undefined; // undefined = don't change
  if (photo && photo.size > 0) {
    if (photo.size > MAX_PHOTO_BYTES) return { error: "Photo over 2 MB" };
    if (!ALLOWED_PHOTO_TYPES.includes(photo.type)) {
      return { error: "Photo must be PNG, JPG, or WebP" };
    }
    const ext = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
    const path = `${id}/avatar.${ext}`;
    const { error: upErr } = await admin.storage
      .from("employee-photos")
      .upload(path, photo, {
        contentType: photo.type,
        cacheControl: "31536000",
        upsert: true,
      });
    if (upErr) return { error: `Photo upload failed: ${upErr.message}` };
    const { data } = admin.storage.from("employee-photos").getPublicUrl(path);
    photoUrl = `${data.publicUrl}?v=${Date.now()}`;
  }

  const updates: Record<string, unknown> = {
    name,
    email,
    company_client: company,
    employment_status: status,
    phone,
    member_since: memberSince,
  };
  if (photoUrl !== undefined) updates.photo_url = photoUrl;

  const { error } = await admin.from("profiles").update(updates).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/admin/team");
  revalidatePath("/profile");
  return { ok: true };
}

/**
 * Soft-deactivate an employee (sets is_active=false). Their data and
 * point history are preserved; they just can't log in. Reversible via
 * reactivateEmployee.
 */
export async function deactivateEmployee(
  id: string,
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ is_active: false, employment_status: "former" })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/team");
  return { ok: true };
}

export async function reactivateEmployee(
  id: string,
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ is_active: true })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/team");
  return { ok: true };
}

/**
 * Resend the invite email to someone who hasn't accepted yet.
 */
export async function resendInvite(
  email: string,
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(email);
  if (error) return { error: error.message };
  return { ok: true };
}

/**
 * Employee self-update of their own photo + phone (only).
 * Other fields require admin.
 */
export async function updateMyProfile(formData: FormData): Promise<
  { ok: true } | { error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const phone = String(formData.get("phone") || "").trim() || null;
  const photo = formData.get("photo") as File | null;

  let photoUrl: string | undefined;
  if (photo && photo.size > 0) {
    if (photo.size > MAX_PHOTO_BYTES) return { error: "Photo over 2 MB" };
    if (!ALLOWED_PHOTO_TYPES.includes(photo.type)) {
      return { error: "Photo must be PNG, JPG, or WebP" };
    }
    const ext = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
    const path = `${user.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("employee-photos")
      .upload(path, photo, {
        contentType: photo.type,
        cacheControl: "31536000",
        upsert: true,
      });
    if (upErr) return { error: `Photo upload failed: ${upErr.message}` };
    const { data } = supabase.storage.from("employee-photos").getPublicUrl(path);
    photoUrl = `${data.publicUrl}?v=${Date.now()}`;
  }

  const updates: Record<string, unknown> = { phone };
  if (photoUrl !== undefined) updates.photo_url = photoUrl;

  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/profile");
  revalidatePath("/today");
  return { ok: true };
}
