import { updatePassword } from "../actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-cotton relative overflow-hidden">
      <div className="absolute top-10 left-10 w-60 h-60 bg-lavender/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-bubblegum/40 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-24 h-24 bg-paper rounded-2xl border-[1.5px] border-graphite shadow-[4px_4px_0_#E8B044] flex items-center justify-center p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-icon.png" alt="DSV Digital" className="w-full h-full object-contain" />
          </div>
          <div className="text-center">
            <h1 className="font-serif text-2xl font-semibold tracking-tight">DSV Digital Hub</h1>
          </div>
        </div>

        <div className="bg-paper border-[1.5px] border-graphite rounded-y2k p-7 sm:p-8 shadow-[6px_6px_0_#E6ABE1]">
          <h2 className="font-serif text-2xl font-semibold mb-1">Set a new password</h2>
          <p className="text-sm text-ink-soft mb-6">
            {user
              ? `Welcome${user.user_metadata?.name ? `, ${user.user_metadata.name.split(" ")[0]}` : ""}! Pick a password you'll remember.`
              : "Your recovery link looks expired or invalid. Request a new one."}
          </p>

          {params.error && (
            <div className="mb-4 p-3 bg-error/10 border-[1.5px] border-error text-error text-sm rounded-lg font-medium">
              ⚠️ {params.error}
            </div>
          )}

          {user ? (
            <form action={updatePassword} className="space-y-4">
              <div>
                <label className="label" htmlFor="password">New password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  className="input"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <p className="text-[11px] text-ink-soft mt-1">At least 6 characters.</p>
              </div>
              <div>
                <label className="label" htmlFor="confirm">Confirm new password</label>
                <input
                  id="confirm"
                  name="confirm"
                  type="password"
                  required
                  minLength={6}
                  className="input"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
              <button type="submit" className="btn w-full">
                Set password & sign in
              </button>
            </form>
          ) : (
            <a href="/login/forgot-password" className="btn w-full block text-center">
              Request a new reset link
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
