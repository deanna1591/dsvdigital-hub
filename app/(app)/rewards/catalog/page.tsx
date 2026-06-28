import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/me";
import CatalogGrid from "@/app/dashboard/components/CatalogGrid";
import type { CatalogItem } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const { me, userId } = await getCurrentUser();
  const supabase = await createClient();

  const [catalogRes, profileRes] = await Promise.all([
    supabase
      .from("catalog_items")
      .select("*")
      .eq("is_active", true)
      .order("points", { ascending: true }),
    supabase
      .from("profiles")
      .select("name, phone")
      .eq("id", userId)
      .single(),
  ]);

  const catalog = (catalogRes.data ?? []) as CatalogItem[];
  const profile = profileRes.data ?? { name: me.name, phone: null };

  return (
    <CatalogGrid
      catalog={catalog}
      balance={me.balance}
      defaultName={profile.name ?? me.name}
      defaultPhone={profile.phone ?? ""}
    />
  );
}
