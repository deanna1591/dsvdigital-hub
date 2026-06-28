import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/me";
import ProfileView from "./ProfileView";

export const dynamic = "force-dynamic";

export type ProfileDetails = {
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

export default async function ProfilePage() {
  const { userId } = await getCurrentUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  const profile = data as ProfileDetails | null;

  if (!profile) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-error">Couldn't load profile.</p>
      </main>
    );
  }

  return <ProfileView profile={profile} />;
}
