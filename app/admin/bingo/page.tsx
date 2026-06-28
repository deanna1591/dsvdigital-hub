import { createClient } from "@/lib/supabase/server";
import type { BingoBoardRow } from "@/lib/types";
import BoardsList from "./BoardsList";

export const dynamic = "force-dynamic";

export default async function AdminBingoPage() {
  const supabase = await createClient();

  const [boardsRes, pendingRes] = await Promise.all([
    supabase.from("bingo_boards").select("*").order("created_at", { ascending: false }),
    supabase.from("bingo_board_claims").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const boards = (boardsRes.data ?? []) as BingoBoardRow[];
  const pendingCount = pendingRes.count ?? 0;

  return (
    <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Bingo Boards</h1>
          <p className="text-sm text-ink-soft mt-1">
            Create, edit, and publish bingo boards. Only one board can be live at a time.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="/admin/bingo/claims"
            className="relative text-xs font-bold text-graphite border-[1.5px] border-graphite rounded-full px-3 py-1.5 bg-paper hover:bg-cream"
          >
            ✓ Review claims
            {pendingCount > 0 && (
              <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-bubblegum border-[1.5px] border-graphite">
                {pendingCount}
              </span>
            )}
          </a>
          <a
            href="/admin/bingo/photos"
            className="text-xs font-bold text-graphite border-[1.5px] border-graphite rounded-full px-3 py-1.5 bg-paper hover:bg-cream"
          >
            🖼️ Photo cleanup
          </a>
        </div>
      </div>

      <BoardsList boards={boards} />
    </main>
  );
}
