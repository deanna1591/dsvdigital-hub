import { createClient } from "@/lib/supabase/server";
import TeamList from "./TeamList";

export const dynamic = "force-dynamic";

export type Employee = {
  id: string;
  name: string;
  email: string | null;
  photo_url: string | null;
  role: "employee" | "admin";
  company_client: string | null;
  employment_status: string | null;
  phone: string | null;
  member_since: string | null;
  is_active: boolean;
  created_at: string;
};

export default async function AdminTeamPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  const employees = (data ?? []) as Employee[];

  return (
    <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold">Team</h1>
        <p className="text-sm text-ink-soft mt-1">
          Invite new employees and manage existing profiles. Invitees get an
          email with a magic link to set their password.
        </p>
      </div>

      <TeamList employees={employees} />
    </main>
  );
}
