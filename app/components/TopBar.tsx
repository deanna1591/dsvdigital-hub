import Link from "next/link";
import { logout } from "@/app/login/actions";
import type { EmployeeBalance } from "@/lib/types";

export default function TopBar({ me, currentView }: { me: EmployeeBalance; currentView: "employee" | "admin" }) {
  const isAdmin = me.role === "admin";
  return (
    <header className="bg-paper border-b-[1.5px] border-ink px-6 sm:px-8 py-4 sticky top-0 z-10 flex items-center justify-between flex-wrap gap-3">
      <Link href="/dashboard" className="flex items-center gap-3">
        <div className="w-9 h-9 bg-ink text-paper flex items-center justify-center font-serif font-extrabold italic text-xl rounded-md">
          D
        </div>
        <div>
          <h1 className="font-serif text-xl font-semibold leading-tight">DSV Portal</h1>
          <p className="text-[10px] tracking-[0.18em] uppercase text-ink-soft font-bold">
            Points & Redemption
          </p>
        </div>
      </Link>

      {isAdmin && (
        <div className="flex gap-1 bg-cream border border-ink p-0.5 rounded-md">
          <Link
            href="/dashboard"
            className={`px-4 py-1.5 text-xs font-semibold rounded-sm ${
              currentView === "employee" ? "bg-ink text-paper" : "text-ink-soft"
            }`}
          >
            Employee
          </Link>
          <Link
            href="/admin"
            className={`px-4 py-1.5 text-xs font-semibold rounded-sm ${
              currentView === "admin" ? "bg-ink text-paper" : "text-ink-soft"
            }`}
          >
            Admin
          </Link>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-cream border border-line rounded-full text-sm">
          <div className="w-7 h-7 bg-accent text-paper rounded-full flex items-center justify-center font-bold text-xs">
            {me.name.charAt(0).toUpperCase()}
          </div>
          <span className="font-medium hidden sm:inline">{me.name}</span>
        </div>
        <form action={logout}>
          <button className="text-xs text-ink-soft hover:text-ink font-medium" type="submit">
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
