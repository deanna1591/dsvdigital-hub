import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: refresh session — required for server components
  const { data: { user } } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthPath =
    path.startsWith("/login") ||
    path.startsWith("/setup") ||
    path.startsWith("/auth"); // /auth/callback exchanges the recovery code

  // The auth callback must run even without a session — it's the route
  // that ESTABLISHES the session by exchanging the PKCE code. Never
  // redirect away from it.
  if (path.startsWith("/auth")) {
    return response;
  }

  // Not signed in and trying to access protected route → login
  if (!user && !isAuthPath && path !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Signed in and on /login → today. EXCEPT /login/update-password,
  // which the user reaches WITH a recovery session specifically to set
  // a new password. Bouncing them to /today would break the reset flow.
  if (user && path.startsWith("/login") && !path.startsWith("/login/update-password")) {
    const url = request.nextUrl.clone();
    url.pathname = "/today";
    return NextResponse.redirect(url);
  }

  // Admin paths require role=admin (defense-in-depth on top of the
  // layout-level check). Anyone signed in but not an admin who tries
  // to reach /admin/* is bounced back to /today silently.
  if (user && path.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/today";
      url.searchParams.set("notice", "admin_only");
      return NextResponse.redirect(url);
    }
  }

  return response;
}
