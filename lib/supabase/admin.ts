import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. Bypasses RLS. ONLY use from server code
 * for privileged operations like sending invites or admin-only
 * mutations that the user's auth context can't perform.
 *
 * Never expose this client to the browser — it has full DB access.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY missing — admin operations require it",
    );
  }
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
