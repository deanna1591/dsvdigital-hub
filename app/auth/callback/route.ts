import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Auth callback route — exchanges the PKCE `code` param for a session.
 *
 * Supabase email links (recovery, invite, magic link) all redirect here with
 *   ?code=<one-time-code>&next=<destination-path>
 *
 * The handler:
 *   1. Reads the code from the URL.
 *   2. Calls supabase.auth.exchangeCodeForSession(code) which sets the
 *      auth cookies on the response (handled by @supabase/ssr).
 *   3. Redirects the user to the `next` destination, now with an active
 *      session so the destination page can update password, etc.
 *
 * If the code is missing or expired, redirects to /login with an error.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/login/update-password";

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Recovery link is missing its security code. Request a new one.")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(
        `Recovery link is invalid or expired (${error.message}). Request a new one.`,
      )}`,
    );
  }

  // Validate `next` is a safe relative path (no protocol-relative or external)
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/today";
  return NextResponse.redirect(`${origin}${safeNext}`);
}
