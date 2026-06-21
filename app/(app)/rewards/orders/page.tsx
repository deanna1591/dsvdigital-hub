import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/me";
import OrdersTable from "@/app/dashboard/components/OrdersTable";
import type { RedemptionOrder } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const { userId } = await getCurrentUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("redemption_orders")
    .select("*")
    .eq("employee_id", userId)
    .order("created_at", { ascending: false });

  const orders = (data ?? []) as RedemptionOrder[];
  return <OrdersTable orders={orders} />;
}
