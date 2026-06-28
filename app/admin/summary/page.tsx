import { createClient } from "@/lib/supabase/server";
import SummaryTable from "./SummaryTable";

export const dynamic = "force-dynamic";

const POINT_TO_PHP = 5; // Conversion rate from the matrix sheet

export type SummaryRow = {
  id: string;
  name: string;
  is_active: boolean;
  y2023: number;
  y2024: number;
  y2025: number;
  y2026: number;
  total: number;
  total_php: number;
};

export default async function AdminSummaryPage() {
  const supabase = await createClient();

  // Fetch profiles, historical snapshots, and current-year point activities in parallel
  const [profilesRes, historicalRes, currentYearRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, name, is_active, role")
      .order("name"),
    supabase
      .from("historical_year_points")
      .select("employee_id, year, points"),
    supabase
      .from("point_activities")
      .select("employee_id, points, created_at")
      .gte("created_at", "2026-01-01")
      .lt("created_at", "2027-01-01"),
  ]);

  const profiles = profilesRes.data ?? [];
  const historical = historicalRes.data ?? [];
  const current = currentYearRes.data ?? [];

  // Build a per-employee map of yearly totals
  const rows: SummaryRow[] = profiles
    .filter((p: { role: string }) => p.role === "employee")
    .map((p: { id: string; name: string; is_active: boolean }) => {
      const y2023 = historical
        .filter((h: { employee_id: string; year: number }) => h.employee_id === p.id && h.year === 2023)
        .reduce((sum: number, h: { points: number }) => sum + h.points, 0);
      const y2024 = historical
        .filter((h: { employee_id: string; year: number }) => h.employee_id === p.id && h.year === 2024)
        .reduce((sum: number, h: { points: number }) => sum + h.points, 0);
      const y2025 = historical
        .filter((h: { employee_id: string; year: number }) => h.employee_id === p.id && h.year === 2025)
        .reduce((sum: number, h: { points: number }) => sum + h.points, 0);
      const y2026 = current
        .filter((c: { employee_id: string }) => c.employee_id === p.id)
        .reduce((sum: number, c: { points: number }) => sum + c.points, 0);
      const total = y2023 + y2024 + y2025 + y2026;
      return {
        id: p.id,
        name: p.name,
        is_active: p.is_active,
        y2023,
        y2024,
        y2025,
        y2026,
        total,
        total_php: total * POINT_TO_PHP,
      };
    });

  // Aggregate totals across the company
  const totals = rows.reduce(
    (acc, r) => ({
      y2023: acc.y2023 + r.y2023,
      y2024: acc.y2024 + r.y2024,
      y2025: acc.y2025 + r.y2025,
      y2026: acc.y2026 + r.y2026,
      total: acc.total + r.total,
      total_php: acc.total_php + r.total_php,
    }),
    { y2023: 0, y2024: 0, y2025: 0, y2026: 0, total: 0, total_php: 0 },
  );

  return (
    <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8">
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-semibold">Summary of points</h1>
        <p className="text-sm text-ink-soft mt-1">
          Multi-year point totals per employee. Historical years (2023-2025) are loaded from
          the matrix; 2026 is live from this portal. PHP value is calculated at ₱{POINT_TO_PHP} per point.
        </p>
      </div>

      <SummaryTable rows={rows} totals={totals} pointToPhp={POINT_TO_PHP} />
    </main>
  );
}
