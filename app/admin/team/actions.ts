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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://hub.dsvdigital.com";
  const inviteRedirectTo = `${siteUrl}/auth/callback?next=/login/update-password`;

  let inviteErr: unknown = null;
  try {
    const res = await admin.auth.admin.inviteUserByEmail(email, {
      data: { name },
      redirectTo: inviteRedirectTo,
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
 * When the email changes, also updates auth.users.email via the
 * admin API so invites/login work with the new address.
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

  // Fetch the current profile so we can detect if email changed
  const { data: current } = await admin
    .from("profiles")
    .select("email")
    .eq("id", id)
    .single();

  const emailChanged = email && email !== current?.email;

  // If email changed, update auth.users too (the actual login identity)
  if (emailChanged && email) {
    const { error: authErr } = await admin.auth.admin.updateUserById(id, {
      email,
      email_confirm: true,
    });
    if (authErr) {
      const msg = (authErr as { message?: string }).message ?? JSON.stringify(authErr);
      return { error: `Auth email update failed: ${msg}` };
    }
  }

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
 * Smart "resend invite" — does the right thing based on whether the
 * user already exists in auth.users:
 *
 *   - Net-new email: sends a Supabase invite (magic link to set password).
 *   - Already exists (e.g. created silently via bulk-add, or invited
 *     before): sends a password recovery email so they can set/reset
 *     their password.
 *
 * This makes the button "just work" regardless of how the user was
 * originally added.
 */
export async function resendInvite(
  email: string,
): Promise<{ ok: true; method: "invite" | "recovery" } | { error: string }> {
  await requireAdmin();
  const admin = createAdminClient();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://hub.dsvdigital.com";
  const redirectTo = `${siteUrl}/auth/callback?next=/login/update-password`;

  // Try invite first (works for net-new emails)
  const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
  });

  if (!inviteErr) {
    return { ok: true, method: "invite" };
  }

  // If the error says they already exist, fall back to password reset.
  // Supabase's error message varies by version; check for common patterns.
  const msg = inviteErr.message?.toLowerCase() ?? "";
  const alreadyExists =
    msg.includes("already") ||
    msg.includes("registered") ||
    (inviteErr as { code?: string }).code === "email_exists";

  if (!alreadyExists) {
    return { error: inviteErr.message || "Couldn't send invite" };
  }

  // Send password recovery instead — works for existing users with no
  // password set, or anyone who forgot theirs.
  const userClient = await createClient();
  const { error: resetErr } = await userClient.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (resetErr) {
    return { error: `Couldn't send password reset: ${resetErr.message}` };
  }

  return { ok: true, method: "recovery" };
}

/**
 * Set (or reset) an employee's password DIRECTLY — no email, no link.
 *
 * The simplest, most reliable way to onboard people or fix a locked-out
 * account: the admin sets a temporary password and hands it to the
 * employee. They log in at hub.dsvdigital.com with email + this password
 * immediately, then can change it from their profile.
 *
 * Sidesteps the entire email/PKCE/token_hash flow and its cross-browser
 * fragility. Uses the service-role admin API.
 *
 * If `password` is omitted, a readable temporary one is generated.
 */
export async function setEmployeePassword(
  employeeId: string,
  password?: string,
): Promise<{ ok: true; password: string; email: string } | { error: string }> {
  await requireAdmin();
  const admin = createAdminClient();

  if (!employeeId) return { error: "Missing employee id" };

  const { data: profile, error: profErr } = await admin
    .from("profiles")
    .select("id, email, name")
    .eq("id", employeeId)
    .single();

  if (profErr || !profile) return { error: "Employee not found" };
  if (!profile.email || profile.email.endsWith("@placeholder.invalid")) {
    return { error: "This employee has no real email yet. Add one via Edit first." };
  }

  const finalPassword = password?.trim() || generateTempPassword();
  if (finalPassword.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }

  // The profile id IS the auth user id (shared UUID via handle_new_user).
  const { error: updErr } = await admin.auth.admin.updateUserById(employeeId, {
    password: finalPassword,
    email_confirm: true,
  });

  if (updErr) {
    return { error: `Couldn't set password: ${updErr.message}` };
  }

  return { ok: true, password: finalPassword, email: profile.email };
}

/** Generate a readable temp password like "Bright-Tiger-3947". */
function generateTempPassword(): string {
  const adjectives = [
    "Bright", "Swift", "Calm", "Bold", "Clever", "Sunny", "Lucky", "Brave",
    "Gentle", "Happy", "Kind", "Quick", "Sharp", "Smart", "Warm",
  ];
  const nouns = [
    "Tiger", "Eagle", "River", "Mountain", "Ocean", "Forest", "Falcon",
    "Comet", "Harbor", "Meadow", "Canyon", "Summit", "Garden", "Island",
  ];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${adj}-${noun}-${num}`;
}

/**
 * Toggle an employee between 'admin' and 'employee' roles.
 *
 * Safeguards:
 *   1. Admin can't toggle themselves (prevents accidental self-lockout).
 *   2. Can't remove admin role from the LAST remaining admin (would
 *      lock everyone out of /admin entirely).
 *   3. Caller must be admin (enforced by requireAdmin).
 */
export async function toggleAdminRole(
  employeeId: string,
): Promise<{ ok: true; newRole: "admin" | "employee" } | { error: string }> {
  const { user } = await requireAdmin();
  const admin = createAdminClient();

  if (!employeeId) return { error: "Missing employee id" };
  if (employeeId === user.id) {
    return { error: "You can't change your own admin status. Ask another admin to do it." };
  }

  // Fetch the target's current role
  const { data: target, error: fetchErr } = await admin
    .from("profiles")
    .select("role, name, is_active")
    .eq("id", employeeId)
    .single();

  if (fetchErr || !target) return { error: "Employee not found" };
  if (!target.is_active) {
    return { error: "Can't change admin status on a deactivated account. Reactivate first." };
  }

  const currentRole = target.role as "admin" | "employee";
  const newRole: "admin" | "employee" = currentRole === "admin" ? "employee" : "admin";

  // If demoting an admin, make sure there's at least one other active admin
  if (currentRole === "admin") {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .eq("is_active", true);
    if ((count ?? 0) <= 1) {
      return {
        error:
          "Can't remove admin from the last admin — the portal needs at least one. Promote someone else first.",
      };
    }
  }

  const { error: updErr } = await admin
    .from("profiles")
    .update({ role: newRole })
    .eq("id", employeeId);

  if (updErr) return { error: updErr.message };

  revalidatePath("/admin/team");
  return { ok: true, newRole };
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

/**
 * Let a signed-in employee change their own password.
 *
 * This is the easy case: they already have an active session (they
 * logged in with whatever password the admin gave them), so we can
 * call auth.updateUser({ password }) directly. No email, no recovery
 * link, no PKCE — none of the cross-browser fragility.
 *
 * Used by anyone who was handed an initial password and wants to set
 * their own, or who just wants to rotate their password periodically.
 */
export async function changeMyPassword(formData: FormData): Promise<
  { ok: true } | { error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const newPassword = String(formData.get("new_password") || "");
  const confirm = String(formData.get("confirm_password") || "");

  if (newPassword.length < 6) {
    return { error: "New password must be at least 6 characters" };
  }
  if (newPassword !== confirm) {
    return { error: "The two passwords don't match" };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };

  return { ok: true };
}
