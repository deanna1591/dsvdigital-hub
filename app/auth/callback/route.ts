import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Auth callback route — establishes a session from an email link.
 *
 * Supports BOTH mechanisms Supabase can use:
 *
 *  A) token_hash + type  (OTP verification — the robust path)
 *     Works in ANY browser/device because it doesn't depend on a
 *     locally-stored PKCE verifier cookie. This is what admin-initiated
 *     resets need, since the admin requests the link in one browser and
 *     the employee clicks it in another.
 *
 *  B) code  (PKCE flow — only works in the SAME browser that requested it)
 *     Kept as a fallback for self-service "forgot password" where the
 *     same person requests and clicks.
 *
 * After establishing the session, redirects to `next`.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get("next") ?? "/login/update-password";

  // Upstream error passthrough (expired/used/invalid)
  const errorParam = searchParams.get("error");
  if (errorParam) {
    const desc = searchParams.get("error_description") || "";
    return NextResponse.redirect(
      `${origin}/login/forgot-password?error=${encodeURIComponent(friendlyAuthError(errorParam, desc))}`,
    );
  }

  const supabase = await createClient();
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/today";

  // --- Path A: token_hash + type (OTP) ---
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (error) {
      return NextResponse.redirect(
        `${origin}/login/forgot-password?error=${encodeURIComponent(friendlyAuthError("access_denied", error.message))}`,
      );
    }
    return NextResponse.redirect(`${origin}${safeNext}`);
  }

  // --- Path B: code (PKCE) ---
  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        `${origin}/login/forgot-password?error=${encodeURIComponent(friendlyAuthError("access_denied", error.message))}`,
      );
    }
    return NextResponse.redirect(`${origin}${safeNext}`);
  }

  // Neither present
  return NextResponse.redirect(
    `${origin}/login/forgot-password?error=${encodeURIComponent(
      "Recovery link is missing its token. Request a new one below.",
    )}`,
  );
}

function friendlyAuthError(code: string, desc: string): string {
  const d = desc.toLowerCase();
  if (d.includes("verifier") || d.includes("storage")) {
    return "This reset link must be opened in the same browser flow. We've switched to a more reliable link — request a fresh one below and it'll work from any device.";
  }
  if (code === "access_denied" || d.includes("expired")) {
    return "This reset link expired or was already used. Enter your email below to get a fresh one (links last 1 hour and can only be used once).";
  }
  if (d.includes("not allowed") || d.includes("redirect")) {
    return "Recovery redirect URL isn't allowed. Tell your admin to check Supabase's redirect URL allow list.";
  }
  return desc || `Recovery error: ${code}. Request a new link below.`;
}
