import { createClient } from "@/lib/supabase/server";
import MissionsManager from "./components/MissionsManager";
import type { Mission } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MissionsAdminPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("missions")
    .select("*")
    .order("is_active", { ascending: false })
    .order("is_pinned", { ascending: false })
    .order("sort_order", { ascending: true });

  const missions = (data || []) as Mission[];

  return (
    <main className="max-w-[1280px] mx-auto p-6 sm:p-8 pt-7">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="font-serif text-3xl font-semibold mb-1">Missions</h2>
          <p className="text-sm text-ink-soft">
            Tasks that benefit DSV — reviews, social engagement, referrals. Employees earn points when admin approves their submission.
          </p>
        </div>
      </div>

      <MissionsManager missions={missions} />
    </main>
  );
}
