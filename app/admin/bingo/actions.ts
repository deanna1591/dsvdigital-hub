"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (data?.role !== "admin") redirect("/today");
  return supabase;
}

export async function createBoard(formData: FormData) {
  const supabase = await requireAdmin();
  const title = String(formData.get("title") || "").trim();
  const theme = String(formData.get("theme") || "🎲").trim() || "🎲";
  const startDate = String(formData.get("start_date") || "");
  const endDate = String(formData.get("end_date") || "");

  if (!title || !startDate || !endDate) {
    return { error: "Title, start date, and end date are required" };
  }
  if (new Date(endDate) < new Date(startDate)) {
    return { error: "End date must be on or after start date" };
  }

  const month = startDate.slice(0, 7); // YYYY-MM

  const { data: board, error } = await supabase
    .from("bingo_boards")
    .insert({
      title,
      theme,
      start_date: startDate,
      end_date: endDate,
      month,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !board) {
    return { error: error?.message ?? "Failed to create board" };
  }

  // Pre-seed with 25 blank squares so the editor has structure
  const squares: Array<{
    board_id: string;
    col: number;
    row: number;
    name: string;
    emoji: string;
    prompt: string;
    is_free: boolean;
    is_lucky: boolean;
  }> = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const isCenter = r === 2 && c === 2;
      squares.push({
        board_id: board.id,
        col: c,
        row: r,
        name: isCenter ? "★ FREE ★" : "New square",
        emoji: isCenter ? "⭐" : "✨",
        prompt: isCenter ? "" : "Describe what to do",
        is_free: isCenter,
        is_lucky: false,
      });
    }
  }
  const { error: seedErr } = await supabase.from("bingo_board_squares").insert(squares);
  if (seedErr) {
    // Best-effort: continue, admin can re-seed
    console.error("[bingo] couldn't pre-seed squares:", seedErr);
  }

  revalidatePath("/admin/bingo");
  return { ok: true, id: board.id };
}

export async function updateBoardMeta(boardId: string, formData: FormData) {
  const supabase = await requireAdmin();
  const title = String(formData.get("title") || "").trim();
  const theme = String(formData.get("theme") || "🎲").trim() || "🎲";
  const startDate = String(formData.get("start_date") || "");
  const endDate = String(formData.get("end_date") || "");

  if (!title || !startDate || !endDate) {
    return { error: "Title, start, end required" };
  }

  const { error } = await supabase
    .from("bingo_boards")
    .update({
      title,
      theme,
      start_date: startDate,
      end_date: endDate,
      month: startDate.slice(0, 7),
    })
    .eq("id", boardId);
  if (error) return { error: error.message };

  revalidatePath(`/admin/bingo/${boardId}`);
  revalidatePath("/admin/bingo");
  return { ok: true };
}

export async function updateSquare(formData: FormData) {
  const supabase = await requireAdmin();
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const emoji = String(formData.get("emoji") || "").trim() || "✨";
  const prompt = String(formData.get("prompt") || "").trim();
  const isFree = formData.get("is_free") === "on";
  const isLucky = formData.get("is_lucky") === "on";

  if (!id || !name) return { error: "Square id and name required" };

  // If marking this as free, unset is_free on any other square in the same board
  if (isFree) {
    const { data: cur } = await supabase
      .from("bingo_board_squares")
      .select("board_id")
      .eq("id", id)
      .single();
    if (cur) {
      await supabase
        .from("bingo_board_squares")
        .update({ is_free: false })
        .eq("board_id", cur.board_id)
        .neq("id", id);
    }
  }
  // Same for is_lucky — only one lucky square per board
  if (isLucky) {
    const { data: cur } = await supabase
      .from("bingo_board_squares")
      .select("board_id")
      .eq("id", id)
      .single();
    if (cur) {
      await supabase
        .from("bingo_board_squares")
        .update({ is_lucky: false })
        .eq("board_id", cur.board_id)
        .neq("id", id);
    }
  }

  const { error } = await supabase
    .from("bingo_board_squares")
    .update({ name, emoji, prompt, is_free: isFree, is_lucky: isLucky })
    .eq("id", id);
  if (error) return { error: error.message };

  // Revalidate the editor (caller knows the board id from context)
  return { ok: true };
}

export async function publishBoard(boardId: string) {
  const supabase = await requireAdmin();

  // Demote any other live boards in the same time window
  await supabase
    .from("bingo_boards")
    .update({ status: "archived" })
    .eq("status", "live")
    .neq("id", boardId);

  const { error } = await supabase
    .from("bingo_boards")
    .update({ status: "live" })
    .eq("id", boardId);
  if (error) return { error: error.message };

  revalidatePath("/admin/bingo");
  revalidatePath("/achievements/bingo");
  return { ok: true };
}

export async function archiveBoard(boardId: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("bingo_boards")
    .update({ status: "archived" })
    .eq("id", boardId);
  if (error) return { error: error.message };
  revalidatePath("/admin/bingo");
  revalidatePath("/achievements/bingo");
  return { ok: true };
}

export async function unpublishBoard(boardId: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("bingo_boards")
    .update({ status: "draft" })
    .eq("id", boardId);
  if (error) return { error: error.message };
  revalidatePath("/admin/bingo");
  revalidatePath("/achievements/bingo");
  return { ok: true };
}

export async function deleteBoard(boardId: string) {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("bingo_boards").delete().eq("id", boardId);
  if (error) return { error: error.message };
  revalidatePath("/admin/bingo");
  return { ok: true };
}
