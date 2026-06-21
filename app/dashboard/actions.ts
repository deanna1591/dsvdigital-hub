"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function redeemItem(itemId: string): Promise<{ error?: string } | void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  // Fetch item + balance atomically-ish (re-check on insert)
  const [itemRes, balRes] = await Promise.all([
    supabase.from("catalog_items").select("*").eq("id", itemId).eq("is_active", true).single(),
    supabase.from("employee_balances").select("balance").eq("id", user.id).single(),
  ]);

  if (itemRes.error || !itemRes.data) return { error: "Item not found" };
  if (balRes.error || !balRes.data) return { error: "Could not load balance" };

  const item = itemRes.data;
  const balance = balRes.data.balance;

  if (balance < item.points) return { error: "Insufficient points" };

  const { error } = await supabase.from("redemption_orders").insert({
    employee_id: user.id,
    item_id: item.id,
    item_name: item.name,
    item_icon: item.icon,
    points_spent: item.points,
    peso_value: item.peso_value,
    status: "pending",
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
}

export async function submitMission({
  missionId,
  proofUrl,
  proofText,
}: {
  missionId: string;
  proofUrl: string;
  proofText: string;
}): Promise<{ error?: string } | void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  // Check mission exists + still active
  const { data: mission, error: mErr } = await supabase
    .from("missions")
    .select("*")
    .eq("id", missionId)
    .eq("is_active", true)
    .single();
  if (mErr || !mission) return { error: "Mission not found or inactive" };

  // Check expiry
  if (mission.expires_at && new Date(mission.expires_at).getTime() < Date.now()) {
    return { error: "This mission has expired" };
  }

  // Check user hasn't exceeded max submissions
  if (mission.max_per_user > 0) {
    const { count } = await supabase
      .from("mission_submissions")
      .select("id", { count: "exact", head: true })
      .eq("mission_id", missionId)
      .eq("employee_id", user.id)
      .in("status", ["pending", "approved"]);

    if (count && count >= mission.max_per_user) {
      return { error: `You've already submitted this mission ${count} time(s) (limit: ${mission.max_per_user})` };
    }
  }

  // URL validation
  if (proofUrl && !/^https?:\/\//i.test(proofUrl)) {
    return { error: "Proof URL must start with http:// or https://" };
  }

  const { error } = await supabase.from("mission_submissions").insert({
    mission_id: missionId,
    employee_id: user.id,
    proof_url: proofUrl || null,
    proof_text: proofText || null,
    status: "pending",
  });

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
}

// ============ DAILY SPARK ============

export async function claimTodaysSpark({
  sparkId,
  proofUrl,
  proofText,
}: {
  sparkId: string;
  proofUrl: string;
  proofText: string;
}): Promise<{ error?: string } | void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  // Get today's date in server timezone (UTC). Adjust if you want strict PH timezone.
  const today = new Date().toISOString().slice(0, 10);

  // Verify the spark provided IS today's spark (gatekeeping check)
  const dayOfYear = getDayOfYear(new Date());
  const { data: todaysSpark, error: sErr } = await supabase
    .from("daily_sparks")
    .select("*")
    .eq("day_of_year", dayOfYear)
    .eq("is_active", true)
    .single();

  if (sErr || !todaysSpark) return { error: "No spark available today" };
  if (todaysSpark.id !== sparkId) return { error: "That spark is not today's — you can only claim today's spark" };

  if (proofUrl && !/^https?:\/\//i.test(proofUrl)) {
    return { error: "Proof URL must start with http:// or https://" };
  }

  // Insert claim (unique on employee_id + claim_date — DB enforces one per day)
  const { error } = await supabase.from("daily_spark_claims").insert({
    spark_id: todaysSpark.id,
    employee_id: user.id,
    claim_date: today,
    proof_url: proofUrl || null,
    proof_text: proofText || null,
    status: "pending",
  });

  if (error) {
    if (error.code === "23505") return { error: "You've already claimed today's spark!" };
    return { error: error.message };
  }
  revalidatePath("/dashboard");
}

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// ============ BINGO ============

export async function claimBingoSquare({
  squareId,
  proofUrl,
  proofText,
}: {
  squareId: string;
  proofUrl: string;
  proofText: string;
}): Promise<{ error?: string } | void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  // Verify the square belongs to an active event with valid date range
  const { data: square, error: sErr } = await supabase
    .from("bingo_squares")
    .select("*, event:bingo_events(*)")
    .eq("id", squareId)
    .single();
  if (sErr || !square) return { error: "Bingo square not found" };

  const event = square.event as { is_active: boolean; start_date: string; end_date: string; id: string };
  if (!event.is_active) return { error: "This bingo event is not active" };
  const today = new Date().toISOString().slice(0, 10);
  if (today < event.start_date) return { error: "This bingo event hasn't started yet" };
  if (today > event.end_date) return { error: "This bingo event has ended" };

  if (proofUrl && !/^https?:\/\//i.test(proofUrl)) {
    return { error: "Proof URL must start with http:// or https://" };
  }

  const { error } = await supabase.from("bingo_claims").insert({
    event_id: event.id,
    square_id: square.id,
    employee_id: user.id,
    proof_url: proofUrl || null,
    proof_text: proofText || null,
    status: "pending",
  });

  if (error) {
    if (error.code === "23505") return { error: "You've already claimed this square!" };
    return { error: error.message };
  }
  revalidatePath("/dashboard");
}

// ============ SLOT MACHINE ============

import type { SlotPullResult } from "@/lib/types";

export async function pullSlotMachine(): Promise<{ result?: SlotPullResult; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  // Call the SECURITY DEFINER RPC — it handles balance check, RNG, deduct, award, log
  const { data, error } = await supabase.rpc("pull_slot_machine");

  if (error) {
    return { error: error.message };
  }

  if (!data || data.length === 0) {
    return { error: "Spin returned no result" };
  }

  const row = data[0];
  revalidatePath("/dashboard");
  return {
    result: {
      spin_id: row.spin_id,
      reel_1: row.reel_1,
      reel_2: row.reel_2,
      reel_3: row.reel_3,
      win_type: row.win_type,
      win_label: row.win_label,
      payout_points: row.payout_points,
      new_balance: row.new_balance,
    },
  };
}
