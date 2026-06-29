"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";

export async function login(formData: FormData) {
  const supabase = await createClient();
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };
  const { error } = await supabase.auth.signInWithPassword(data);
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect(`/login?message=${encodeURIComponent("Account created — check your email to confirm, then sign in.")}`);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Send a password reset / recovery email. Works for both:
 *   - Users who never set a password (silently created via bulk-invite)
 *   - Users who forgot their password
 *
 * Supabase intentionally returns success even if the email doesn't
 * exist (to prevent user enumeration), so this always shows the same
 * confirmation message.
 */
export async function requestPasswordReset(formData: FormData) {
  const supabase = await createClient();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) {
    redirect(`/login?error=${encodeURIComponent("Email is required")}`);
  }

  // Build absolute URL for the reset callback
  const h = await headers();
  const host = h.get("host") || "hub.dsvdigital.com";
  const proto = h.get("x-forwarded-proto") || "https";
  const redirectTo = `${proto}://${host}/login/update-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect(
    `/login?message=${encodeURIComponent(
      `If ${email} has an account, a password reset link is on its way. Check your inbox (and spam folder).`,
    )}`,
  );
}

/**
 * After clicking the recovery email link, the user lands on
 * /login/update-password with a session that lets them update
 * their password directly via auth.updateUser().
 */
export async function updatePassword(formData: FormData) {
  const supabase = await createClient();
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");

  if (password.length < 6) {
    redirect(`/login/update-password?error=${encodeURIComponent("Password must be at least 6 characters")}`);
  }
  if (password !== confirm) {
    redirect(`/login/update-password?error=${encodeURIComponent("Passwords don't match")}`);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?error=${encodeURIComponent("Recovery session expired — request a new password reset link.")}`);
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`/login/update-password?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect(`/login?message=${encodeURIComponent("Password updated — sign in with your new password.")}`);
}
