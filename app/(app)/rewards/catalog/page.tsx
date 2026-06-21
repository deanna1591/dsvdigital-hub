import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/me";
import CatalogGrid from "@/app/dashboard/components/CatalogGrid";
import type { CatalogItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const { me } = await getCurrentUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("catalog_items")
    .select("*")
    .eq("is_active", true)
    .order("points", { ascending: true });

  const catalog = (data ?? []) as CatalogItem[];

  return <CatalogGrid catalog={catalog} balance={me.balance} />;
}
