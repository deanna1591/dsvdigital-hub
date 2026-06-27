import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { BingoBoardRow, BingoBoardSquareRow } from "@/lib/types";
import BoardEditor from "./BoardEditor";

export const dynamic = "force-dynamic";

export default async function BingoBoardEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [boardRes, squaresRes] = await Promise.all([
    supabase.from("bingo_boards").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("bingo_board_squares")
      .select("*")
      .eq("board_id", id)
      .order("row", { ascending: true })
      .order("col", { ascending: true }),
  ]);

  const board = boardRes.data as BingoBoardRow | null;
  if (!board) notFound();

  const squares = (squaresRes.data ?? []) as BingoBoardSquareRow[];

  return (
    <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8">
      <Link
        href="/admin/bingo"
        className="text-xs text-ink-soft hover:text-graphite font-semibold mb-3 inline-block"
      >
        ← All boards
      </Link>

      <BoardEditor board={board} squares={squares} />
    </main>
  );
}
