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
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-12 h-12 bg-ink text-paper flex items-center justify-center font-serif font-extrabold italic text-2xl rounded-lg">
            D
          </div>
          <div>
            <h1 className="font-serif text-2xl font-semibold">DSV Portal</h1>
            <p className="text-[10px] tracking-[0.18em] uppercase text-ink-soft font-bold">
              Points & Redemption
            </p>
          </div>
        </div>

        <div className="bg-paper border-[1.5px] border-ink rounded-xl p-8 shadow-[6px_6px_0_#d97435]">
          <h2 className="font-serif text-2xl font-semibold mb-1">Welcome back 👋</h2>
          <p className="text-sm text-ink-soft mb-6">Sign in with your work email.</p>

          {params.error && (
            <div className="mb-4 p-3 bg-warn/10 border border-warn text-warn text-sm rounded">
              {params.error}
            </div>
          )}
          {params.message && (
            <div className="mb-4 p-3 bg-good/10 border border-good text-good text-sm rounded">
              {params.message}
            </div>
          )}

          <form className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required className="input" placeholder="you@dsvdigital.com" />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input id="password" name="password" type="password" required className="input" placeholder="••••••••" minLength={6} />
            </div>
            <div className="flex gap-2 pt-2">
              <button formAction={login} className="btn flex-1">Sign in</button>
              <button formAction={signup} className="btn btn-ghost flex-1">Create account</button>
            </div>
          </form>
        </div>

        <p className="text-xs text-center text-ink-soft mt-6">
          New here? Create an account with your work email. An admin will activate your access.
        </p>
      </div>
    </div>
  );
}
