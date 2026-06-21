import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/me";
import BingoBoard from "@/app/dashboard/components/BingoBoard";
import ComingSoon from "@/components/coming-soon";
import type { BingoEvent, BingoSquare, BingoClaim } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BingoPage() {
  const { userId } = await getCurrentUser();
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);
  const [eventRes, squaresRes, claimsRes] = await Promise.all([
    supabase
      .from("bingo_events")
      .select("*")
      .lte("start_date", today)
      .gte("end_date", today)
      .eq("is_active", true)
      .maybeSingle(),
    supabase.from("bingo_squares").select("*"),
    supabase.from("bingo_claims").select("*").eq("employee_id", userId),
  ]);

  const activeBingo = (eventRes.data ?? null) as BingoEvent | null;

  if (!activeBingo) {
    return (
      <ComingSoon
        emoji="🎲"
        title="No active bingo this week"
        description="The next bingo board kicks off soon. Boards run weekly with new themes — Hump Day, Wellness, Q-Launch energy, and more."
        teasers={[
          "5×5 grid with 5 themed columns (B-I-N-G-O)",
          "+5 pts per square claimed, +25 pts per line, +200 pts blackout",
          "One lucky square per board (+10 pts bonus)",
          "Admin creates monthly boards in advance",
        ]}
      />
    );
  }

  const bingoSquares = ((squaresRes.data ?? []) as BingoSquare[]).filter(
    (s) => s.event_id === activeBingo.id,
  );
  const myBingoClaims = (claimsRes.data ?? []) as BingoClaim[];

  return <BingoBoard event={activeBingo} squares={bingoSquares} myClaims={myBingoClaims} />;
}
