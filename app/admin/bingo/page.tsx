import { createClient } from "@/lib/supabase/server";
import type { BingoBoardRow } from "@/lib/types";
import BoardsList from "./BoardsList";

export const dynamic = "force-dynamic";

export default async function AdminBingoPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("bingo_boards")
    .select("*")
    .order("created_at", { ascending: false });

  const boards = (data ?? []) as BingoBoardRow[];

  return (
    <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Bingo Boards</h1>
          <p className="text-sm text-ink-soft mt-1">
            Create, edit, and publish bingo boards. Only one board can be live at a time.
          </p>
        </div>
        <a
          href="/admin/bingo/photos"
          className="text-xs font-bold text-graphite border-[1.5px] border-graphite rounded-full px-3 py-1.5 bg-paper hover:bg-cream"
        >
          🖼️ Photo cleanup
        </a>
      </div>

      <BoardsList boards={boards} />
    </main>
  );
}
