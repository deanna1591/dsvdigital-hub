import { createClient } from "@/lib/supabase/server";
import CatalogManager from "./components/CatalogManager";
import type { CatalogItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("catalog_items")
    .select("*")
    .order("is_active", { ascending: false })
    .order("sort_order", { ascending: true });

  const items = (data || []) as CatalogItem[];

  return (
    <main className="max-w-[1280px] mx-auto p-6 sm:p-8 pt-7">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h2 className="font-serif text-3xl font-semibold mb-1">Reward Catalog</h2>
          <p className="text-sm text-ink-soft">
            {items.filter((i) => i.is_active).length} active item{items.filter((i) => i.is_active).length === 1 ? "" : "s"} ·{" "}
            {items.filter((i) => !i.is_active).length} archived
          </p>
        </div>
      </div>

      <CatalogManager items={items} />
    </main>
  );
}
