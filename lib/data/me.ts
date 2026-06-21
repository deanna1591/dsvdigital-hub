import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { EmployeeBalance } from "@/lib/types";

/**
 * Fetches the current authenticated user's profile + balance from the
 * `employee_balances` view. Redirects to /login if not authenticated, or
 * shows a friendly fallback if the profile exists but the balance view
 * hasn't computed yet (race during first signup).
 *
 * Used by the (app)/layout.tsx and any page that needs the current user.
 */
export async function getCurrentUser(): Promise<{
  me: EmployeeBalance;
  userId: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("employee_balances")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!me) {
    redirect("/setup");
  }

  return { me: me as EmployeeBalance, userId: user.id };
}

/**
 * Variant: returns null instead of redirecting, for pages that need
 * to render their own "no profile" state (like /setup).
 */
export async function getCurrentUserOrNull(): Promise<{
  me: EmployeeBalance | null;
  userId: string | null;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { me: null, userId: null };

  const { data: me } = await supabase
    .from("employee_balances")
    .select("*")
    .eq("id", user.id)
    .single();

  return { me: (me as EmployeeBalance) || null, userId: user.id };
}
