import { logout } from "@/app/login/actions";
import { getCurrentUserOrNull } from "@/lib/data/me";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const { me } = await getCurrentUserOrNull();
  if (me) redirect("/today");

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-cotton relative overflow-hidden">
      <div className="absolute top-10 left-10 w-60 h-60 bg-lavender/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-bubblegum/40 rounded-full blur-3xl pointer-events-none" />

      <div className="bg-paper border-[1.5px] border-graphite rounded-y2k p-8 max-w-md text-center shadow-[6px_6px_0_#E6ABE1] relative">
        <div className="text-5xl mb-4">👋</div>
        <h1 className="font-serif text-2xl font-semibold mb-2">Hi there!</h1>
        <p className="text-sm text-ink-soft mb-6 leading-relaxed">
          Your account exists, but your employee profile hasn't been activated yet. An admin needs to add you to the team roster.
        </p>
        <p className="text-xs text-ink-faint mb-6">
          If you're an admin yourself, go to <strong>SQL Editor</strong> in Supabase and run an INSERT into <code className="bg-cream px-1 rounded">public.profiles</code>.
        </p>
        <form action={logout}>
          <button type="submit" className="btn btn-ghost text-sm">Sign out</button>
        </form>
      </div>
    </div>
  );
}
