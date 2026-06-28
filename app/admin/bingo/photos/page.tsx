import { createClient } from "@/lib/supabase/server";
import type { BingoBoardRow } from "@/lib/types";
import Link from "next/link";
import PhotoCleanup from "./PhotoCleanup";

export const dynamic = "force-dynamic";

type PhotoSummary = {
  board: BingoBoardRow;
  photos: Array<{
    claim_id: string;
    photo_url: string;
    employee_name: string | null;
    square_name: string;
    created_at: string;
  }>;
};

export default async function AdminBingoPhotosPage() {
  const supabase = await createClient();

  // All boards with their photo claims joined via squares
  const { data: claimsData } = await supabase
    .from("bingo_board_claims")
    .select(`
      id,
      photo_url,
      created_at,
      bingo_board_squares!inner (
        id,
        name,
        board_id,
        bingo_boards!inner (id, title, theme, status, start_date, end_date, month, created_at)
      ),
      profiles!bingo_board_claims_employee_id_fkey (name)
    `)
    .not("photo_url", "is", null)
    .order("created_at", { ascending: false });

  type ClaimRow = {
    id: string;
    photo_url: string;
    created_at: string;
    bingo_board_squares: {
      id: string;
      name: string;
      board_id: string;
      bingo_boards: BingoBoardRow;
    };
    profiles: { name: string | null } | null;
  };

  const claims = (claimsData ?? []) as unknown as ClaimRow[];

  // Group by board
  const byBoard = new Map<string, PhotoSummary>();
  for (const c of claims) {
    const board = c.bingo_board_squares.bingo_boards;
    const key = board.id;
    if (!byBoard.has(key)) {
      byBoard.set(key, { board, photos: [] });
    }
    byBoard.get(key)!.photos.push({
      claim_id: c.id,
      photo_url: c.photo_url,
      employee_name: c.profiles?.name ?? null,
      square_name: c.bingo_board_squares.name,
      created_at: c.created_at,
    });
  }

  // Sort groups: live first, then drafts, then past — newest first
  const groups = Array.from(byBoard.values()).sort((a, b) => {
    const order = { live: 0, draft: 1, past: 2 } as const;
    const aOrder = order[a.board.status as keyof typeof order] ?? 3;
    const bOrder = order[b.board.status as keyof typeof order] ?? 3;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return new Date(b.board.start_date).getTime() - new Date(a.board.start_date).getTime();
  });

  const totalPhotos = claims.length;

  return (
    <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8">
      <Link
        href="/admin/bingo"
        className="text-xs text-ink-soft hover:text-graphite font-semibold mb-3 inline-block"
      >
        ← All boards
      </Link>

      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold">Photo cleanup</h1>
        <p className="text-sm text-ink-soft mt-1">
          Bingo proof photos are stored in Supabase Storage and count toward the free plan's 1 GB limit.
          Delete them after each round to keep things tidy.
        </p>
      </div>

      <PhotoCleanup groups={groups} totalPhotos={totalPhotos} />
    </main>
  );
}
