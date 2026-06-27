import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/me";
import BingoBoardV2 from "./BingoBoardV2";
import ComingSoon from "@/components/coming-soon";
import type { BingoBoardRow, BingoBoardSquareRow, BingoBoardClaimRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BingoPage() {
  const { userId } = await getCurrentUser();
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);

  // Find the currently live board
  const { data: boardData } = await supabase
    .from("bingo_boards")
    .select("*")
    .eq("status", "live")
    .lte("start_date", today)
    .gte("end_date", today)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const board = boardData as BingoBoardRow | null;

  if (!board) {
    return (
      <ComingSoon
        emoji="🎲"
        title="No active bingo this week"
        description="The next bingo board kicks off soon. Boards run weekly with new themes — Hump Day, Wellness, Q-Launch energy, and more."
        teasers={[
          "5×5 grid with 5 themed columns",
          "+5 pts per square, +25 pts per line, +100 pts blackout",
          "One lucky square per board (+10 pts bonus)",
          "Admins create boards in advance from /admin/bingo",
        ]}
      />
    );
  }

  const [squaresRes, claimsRes] = await Promise.all([
    supabase
      .from("bingo_board_squares")
      .select("*")
      .eq("board_id", board.id),
    supabase
      .from("bingo_board_claims")
      .select("*")
      .eq("employee_id", userId)
      .in("square_id", []),  // placeholder, will refine below
  ]);

  const squares = (squaresRes.data ?? []) as BingoBoardSquareRow[];
  const squareIds = squares.map((s) => s.id);

  // Refetch claims now we know square IDs
  const { data: claimsData } = await supabase
    .from("bingo_board_claims")
    .select("*")
    .eq("employee_id", userId)
    .in("square_id", squareIds.length > 0 ? squareIds : ["00000000-0000-0000-0000-000000000000"]);

  const myClaims = (claimsData ?? []) as BingoBoardClaimRow[];

  return <BingoBoardV2 board={board} squares={squares} myClaims={myClaims} />;
}
