import { redirect } from "next/navigation";

/**
 * Legacy /dashboard route → /today
 * Phase 2b moved the employee view to categorized routes under /(app).
 */
export default function DashboardRedirect() {
  redirect("/today");
}
