import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import ClaimsReview from "./ClaimsReview";

export const dynamic = "force-dynamic";

export type ReviewClaim = {
  id: string;
  status: "pending" | "approved" | "rejected";
  photo_url: string | null;
  proof_text: string | null;
  rejection_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  employee_name: string | null;
  square_name: string;
  square_emoji: string;
  square_points: number;
  square_is_lucky: boolean;
  board_title: string;
  board_theme: string;
};

export default async function AdminBingoClaimsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bingo_board_claims")
    .select(`
      id,
      status,
      photo_url,
      proof_text,
      rejection_note,
      created_at,
      reviewed_at,
      bingo_board_squares!inner (
        name,
        emoji,
        points,
        is_lucky,
        bingo_boards!inner (title, theme)
      ),
      profiles!bingo_board_claims_employee_id_fkey (name)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8">
        <p className="text-error">Couldn't load claims: {error.message}</p>
      </main>
    );
  }

  type Raw = {
    id: string;
    status: "pending" | "approved" | "rejected";
    photo_url: string | null;
    proof_text: string | null;
    rejection_note: string | null;
    created_at: string;
    reviewed_at: string | null;
    bingo_board_squares: {
      name: string;
      emoji: string;
      points: number;
      is_lucky: boolean;
      bingo_boards: { title: string; theme: string };
    };
    profiles: { name: string | null } | null;
  };

  const rows = (data ?? []) as unknown as Raw[];
  const claims: ReviewClaim[] = rows.map((r) => ({
    id: r.id,
    status: r.status,
    photo_url: r.photo_url,
    proof_text: r.proof_text,
    rejection_note: r.rejection_note,
    created_at: r.created_at,
    reviewed_at: r.reviewed_at,
    employee_name: r.profiles?.name ?? null,
    square_name: r.bingo_board_squares.name,
    square_emoji: r.bingo_board_squares.emoji,
    square_points: r.bingo_board_squares.points,
    square_is_lucky: r.bingo_board_squares.is_lucky,
    board_title: r.bingo_board_squares.bingo_boards.title,
    board_theme: r.bingo_board_squares.bingo_boards.theme,
  }));

  const pending = claims.filter((c) => c.status === "pending");
  const approved = claims.filter((c) => c.status === "approved");
  const rejected = claims.filter((c) => c.status === "rejected");

  return (
    <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8">
      <Link
        href="/admin/bingo"
        className="text-xs text-ink-soft hover:text-graphite font-semibold mb-3 inline-block"
      >
        ← All boards
      </Link>

      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold">Bingo submissions</h1>
        <p className="text-sm text-ink-soft mt-1">
          Review and approve employee bingo claims. Approval awards points
          automatically.
        </p>
      </div>

      <ClaimsReview pending={pending} approved={approved} rejected={rejected} />
    </main>
  );
}
