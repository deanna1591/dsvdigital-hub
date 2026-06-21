import TopBar from "@/app/components/TopBar";
import CategorizedNav from "@/components/categorized-nav";
import { getCurrentUser } from "@/lib/data/me";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { me, userId } = await getCurrentUser();
  return (
    <>
      <TopBar me={me} userId={userId} currentView="employee" />
      <CategorizedNav />
      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>
    </>
  );
}
