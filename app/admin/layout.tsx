import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TopBar from "@/app/components/TopBar";
import AdminNav from "./components/AdminNav";
import type { EmployeeBalance } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("employee_balances")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!me || me.role !== "admin") redirect("/dashboard");

  return (
    <>
      <TopBar me={me as EmployeeBalance} currentView="admin" />
      <div className="max-w-[1280px] mx-auto px-6 sm:px-8 pt-6">
        <AdminNav />
      </div>
      {children}
    </>
  );
}
