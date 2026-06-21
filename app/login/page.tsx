import { login, signup } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  return <LoginForm searchParams={searchParams} />;
}

async function LoginForm({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-cotton relative overflow-hidden">
      {/* Decorative Y2K blobs */}
      <div className="absolute top-10 left-10 w-60 h-60 bg-lavender/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-bubblegum/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-48 h-48 bg-goldrush/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-12 h-12 bg-graphite text-paper flex items-center justify-center font-serif font-bold italic text-2xl rounded-lg border-[1.5px] border-graphite shadow-[3px_3px_0_#E8B044]">
            D
          </div>
          <div>
            <h1 className="font-serif text-2xl font-semibold tracking-tight">DSV Portal</h1>
            <p className="text-[10px] tracking-[0.18em] uppercase text-ink-soft font-bold">
              Points · Engagement
            </p>
          </div>
        </div>

        {/* Sign-in card */}
        <div className="bg-paper border-[1.5px] border-graphite rounded-y2k p-7 sm:p-8 shadow-[6px_6px_0_#E6ABE1]">
          <h2 className="font-serif text-2xl font-semibold mb-1">Welcome back 👋</h2>
          <p className="text-sm text-ink-soft mb-6">Sign in with your work email.</p>

          {params.error && (
            <div className="mb-4 p-3 bg-error/10 border-[1.5px] border-error text-error text-sm rounded-lg font-medium">
              ⚠️ {params.error}
            </div>
          )}
          {params.message && (
            <div className="mb-4 p-3 bg-good/15 border-[1.5px] border-good text-good text-sm rounded-lg font-medium">
              ✓ {params.message}
            </div>
          )}

          <form className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="input"
                placeholder="you@dsvdigital.com"
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="input"
                placeholder="••••••••"
                minLength={6}
                autoComplete="current-password"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button formAction={login} className="btn flex-1">Sign in</button>
              <button formAction={signup} className="btn btn-ghost flex-1">Create account</button>
            </div>
          </form>
        </div>

        <p className="text-xs text-center text-ink-soft mt-6 leading-relaxed">
          New here? Create an account with your work email.<br />
          An admin will activate your access.
        </p>
      </div>
    </div>
  );
}
