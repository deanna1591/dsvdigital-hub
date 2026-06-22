import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/me";
import MoodWheel from "./MoodWheel";
import MoodHistory from "./MoodHistory";

export const dynamic = "force-dynamic";

export default async function MoodPage() {
  const { userId } = await getCurrentUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("mood_checkins")
    .select("id, mood, submood, note, share_to_feed, created_at")
    .eq("employee_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  const checkins = (data ?? []) as Array<{
    id: string;
    mood: string;
    submood: string | null;
    note: string | null;
    share_to_feed: boolean;
    created_at: string;
  }>;

  return (
    <div className="max-w-2xl mx-auto">
      <MoodWheel />
      <MoodHistory checkins={checkins} />
    </div>
  );
}
