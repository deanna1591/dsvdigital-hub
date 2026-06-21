"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" as const, supabase: null };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { error: "Not authorized" as const, supabase: null };
  return { error: null, supabase };
}

export type ItemInput = {
  name: string;
  icon: string;
  points: number;
  peso_value: number;
  source_url: string;
  sort_order: number;
  is_active: boolean;
};

function validate(input: ItemInput): string | null {
  if (!input.name.trim()) return "Name is required";
  if (!input.icon.trim()) return "Icon is required (use an emoji like 🎁)";
  if (!Number.isFinite(input.points) || input.points <= 0) return "Points must be greater than 0";
  if (!Number.isFinite(input.peso_value) || input.peso_value < 0) return "Peso value must be 0 or more";
  if (input.source_url && !/^https?:\/\//i.test(input.source_url.trim())) return "Source URL must start with http:// or https://";
  return null;
}

export async function addItem(input: ItemInput): Promise<{ error?: string } | void> {
  const { error: authErr, supabase } = await requireAdmin();
  if (authErr || !supabase) return { error: authErr || "Auth failed" };

  const invalid = validate(input);
  if (invalid) return { error: invalid };

  const { error } = await supabase.from("catalog_items").insert({
    name: input.name.trim(),
    icon: input.icon.trim(),
    points: Math.round(input.points),
    peso_value: Math.round(input.peso_value),
    source_url: input.source_url.trim() || null,
    sort_order: Math.round(input.sort_order),
    is_active: input.is_active,
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/catalog");
  revalidatePath("/dashboard");
}

export async function updateItem(id: string, input: ItemInput): Promise<{ error?: string } | void> {
  const { error: authErr, supabase } = await requireAdmin();
  if (authErr || !supabase) return { error: authErr || "Auth failed" };

  const invalid = validate(input);
  if (invalid) return { error: invalid };

  const { error } = await supabase
    .from("catalog_items")
    .update({
      name: input.name.trim(),
      icon: input.icon.trim(),
      points: Math.round(input.points),
      peso_value: Math.round(input.peso_value),
      source_url: input.source_url.trim() || null,
      sort_order: Math.round(input.sort_order),
      is_active: input.is_active,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/catalog");
  revalidatePath("/dashboard");
}

export async function toggleActive(id: string, nextValue: boolean): Promise<{ error?: string } | void> {
  const { error: authErr, supabase } = await requireAdmin();
  if (authErr || !supabase) return { error: authErr || "Auth failed" };

  const { error } = await supabase
    .from("catalog_items")
    .update({ is_active: nextValue })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/admin/catalog");
  revalidatePath("/dashboard");
}

export async function deleteItem(id: string): Promise<{ error?: string } | void> {
  const { error: authErr, supabase } = await requireAdmin();
  if (authErr || !supabase) return { error: authErr || "Auth failed" };

  // Check if any orders reference this item — if so, soft-delete (deactivate) instead
  const { count } = await supabase
    .from("redemption_orders")
    .select("id", { count: "exact", head: true })
    .eq("item_id", id);

  if (count && count > 0) {
    // Soft-delete to preserve order history
    const { error } = await supabase.from("catalog_items").update({ is_active: false }).eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/admin/catalog");
    revalidatePath("/dashboard");
    return { error: `Item has ${count} order(s) — archived instead of deleted to preserve history.` };
  }

  const { error } = await supabase.from("catalog_items").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/catalog");
  revalidatePath("/dashboard");
}
