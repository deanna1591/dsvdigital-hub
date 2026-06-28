import Link from "next/link";
import BulkInvite from "./BulkInvite";

export const dynamic = "force-dynamic";

export default function BulkInvitePage() {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link
        href="/admin/team"
        className="text-xs text-ink-soft hover:text-graphite font-semibold mb-3 inline-block"
      >
        ← Team
      </Link>

      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold">Bulk invite</h1>
        <p className="text-sm text-ink-soft mt-1">
          Paste a CSV from your spreadsheet to onboard the whole team at once.
        </p>
      </div>

      <BulkInvite />
    </main>
  );
}
