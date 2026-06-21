import Link from "next/link";
import { logout } from "@/app/login/actions";
import type { EmployeeBalance } from "@/lib/types";

export default function TopBar({ me, currentView }: { me: EmployeeBalance; currentView: "employee" | "admin" }) {
  const isAdmin = me.role === "admin";
  return (
    <header className="bg-paper border-b-[1.5px] border-graphite px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-50 shadow-[0_2px_0_rgba(39,39,39,0.04)]">
      <div className="max-w-[1280px] mx-auto flex items-center justify-between flex-wrap gap-3">
        <Link href="/dashboard" className="flex items-center gap-2.5 sm:gap-3 group">
          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-graphite text-paper flex items-center justify-center font-serif font-bold italic text-xl rounded-lg border-[1.5px] border-graphite shadow-[2px_2px_0_#E8B044] group-hover:shadow-[3px_3px_0_#E8B044] group-hover:-translate-x-px group-hover:-translate-y-px transition-all">
            D
          </div>
          <div>
            <h1 className="font-serif text-lg sm:text-xl font-semibold leading-tight tracking-tight">DSV Portal</h1>
            <p className="text-[10px] tracking-[0.18em] uppercase text-ink-soft font-bold hidden sm:block">
              Points · Engagement
            </p>
          </div>
        </Link>

        {isAdmin && (
          <div className="flex gap-1 bg-cotton border-[1.5px] border-graphite p-1 rounded-full">
            <Link
              href="/dashboard"
              className={`px-3 sm:px-4 py-1 text-xs font-bold rounded-full transition-all ${
                currentView === "employee" ? "bg-graphite text-paper" : "text-ink-soft hover:text-graphite"
              }`}
            >
              👤 Employee
            </Link>
            <Link
              href="/admin"
              className={`px-3 sm:px-4 py-1 text-xs font-bold rounded-full transition-all ${
                currentView === "admin" ? "bg-lavender text-graphite" : "text-ink-soft hover:text-graphite"
              }`}
            >
              🛠️ Admin
            </Link>
          </div>
        )}

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-cream border-[1.5px] border-graphite rounded-full text-sm">
            <div className="w-7 h-7 bg-lavender text-graphite rounded-full flex items-center justify-center font-bold text-xs border-[1.5px] border-graphite">
              {me.name.charAt(0).toUpperCase()}
            </div>
            <span className="font-semibold hidden sm:inline text-graphite">{me.name.split(" ")[0]}</span>
          </div>
          <form action={logout}>
            <button className="text-xs text-ink-soft hover:text-graphite font-semibold underline-offset-2 hover:underline transition-colors" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
