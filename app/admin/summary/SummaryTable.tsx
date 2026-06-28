"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SummaryRow } from "./page";

type SortKey = "name" | "y2023" | "y2024" | "y2025" | "y2026" | "total" | "total_php";

export default function SummaryTable({
  rows,
  totals,
  pointToPhp,
}: {
  rows: SummaryRow[];
  totals: { y2023: number; y2024: number; y2025: number; y2026: number; total: number; total_php: number };
  pointToPhp: number;
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [hideInactive, setHideInactive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isLive, setIsLive] = useState(false);
  const router = useRouter();
  const refreshTimer = useRef<NodeJS.Timeout | null>(null);

  // Realtime subscription: re-fetch the page whenever a new
  // point_activity is inserted, updated, or deleted. Debounced
  // so a burst of inserts doesn't trigger 10 refreshes.
  useEffect(() => {
    const supabase = createClient();

    const debouncedRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => {
        router.refresh();
        setLastUpdate(new Date());
      }, 800);
    };

    const channel = supabase
      .channel("admin-summary-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "point_activities" },
        debouncedRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "historical_year_points" },
        debouncedRefresh,
      )
      .subscribe((status) => {
        setIsLive(status === "SUBSCRIBED");
      });

    // Also refresh whenever the tab regains focus (fallback if Realtime
    // missed a change while the tab was backgrounded)
    const onFocus = () => {
      router.refresh();
      setLastUpdate(new Date());
    };
    window.addEventListener("focus", onFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [router]);

  // When the parent server component re-fetches and new rows arrive,
  // bump the timestamp so the "updated Xs ago" stays current.
  useEffect(() => {
    setLastUpdate(new Date());
  }, [rows]);

  const filtered = useMemo(() => {
    let result = [...rows];
    if (hideInactive) result = result.filter((r) => r.is_active);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r) => r.name.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      let aVal: string | number = a[sortKey];
      let bVal: string | number = b[sortKey];
      if (sortKey === "name") {
        aVal = (aVal as string).toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return result;
  }, [rows, search, sortKey, sortDir, hideInactive]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  function downloadCSV() {
    const header = ["Name", "2023", "2024", "2025", "2026", "Total Points", "Total PHP"];
    const lines = [header.join(",")];
    for (const r of filtered) {
      lines.push(
        [
          `"${r.name.replace(/"/g, '""')}"`,
          r.y2023,
          r.y2024,
          r.y2025,
          r.y2026,
          r.total,
          r.total_php,
        ].join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dsv-summary-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {/* Live indicator */}
      <div className="mb-3 flex items-center gap-2 text-xs">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border-[1.5px] border-graphite font-bold ${
            isLive ? "bg-good/20 text-good" : "bg-line text-ink-soft"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isLive ? "bg-good animate-pulse" : "bg-ink-soft"}`} />
          {isLive ? "Live" : "Offline"}
        </span>
        <span className="text-ink-soft">
          Last update: <RelativeTime date={lastUpdate} />
        </span>
        <button
          onClick={() => {
            router.refresh();
            setLastUpdate(new Date());
          }}
          className="ml-auto text-bronze font-bold underline-offset-2 hover:underline"
        >
          ↻ Refresh now
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total points 2026" value={totals.y2026.toLocaleString()} accent="bg-bubblegum" />
        <StatCard label="Lifetime points" value={totals.total.toLocaleString()} accent="bg-lavender" />
        <StatCard label="PHP value" value={`₱${totals.total_php.toLocaleString()}`} accent="bg-goldrush" />
        <StatCard label="People" value={filtered.length.toString()} accent="bg-cotton" />
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name…"
          className="input flex-1 max-w-xs text-sm"
        />
        <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
          <input
            type="checkbox"
            checked={hideInactive}
            onChange={(e) => setHideInactive(e.target.checked)}
            className="w-4 h-4 accent-lavender"
          />
          Hide inactive
        </label>
        <button onClick={downloadCSV} className="btn btn-ghost text-xs ml-auto">
          ⬇ Export CSV
        </button>
      </div>

      {/* Table */}
      <div className="bg-paper border-[1.5px] border-graphite rounded-y2k shadow-[3px_3px_0_#272727] overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-cream border-b-[1.5px] border-graphite text-left">
              <Th onClick={() => toggleSort("name")} active={sortKey === "name"} dir={sortDir}>
                Employee
              </Th>
              <Th onClick={() => toggleSort("y2023")} active={sortKey === "y2023"} dir={sortDir} numeric>
                2023
              </Th>
              <Th onClick={() => toggleSort("y2024")} active={sortKey === "y2024"} dir={sortDir} numeric>
                2024
              </Th>
              <Th onClick={() => toggleSort("y2025")} active={sortKey === "y2025"} dir={sortDir} numeric>
                2025
              </Th>
              <Th onClick={() => toggleSort("y2026")} active={sortKey === "y2026"} dir={sortDir} numeric>
                2026
              </Th>
              <Th onClick={() => toggleSort("total")} active={sortKey === "total"} dir={sortDir} numeric>
                Total
              </Th>
              <Th onClick={() => toggleSort("total_php")} active={sortKey === "total_php"} dir={sortDir} numeric>
                PHP
              </Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-ink-soft italic">
                  No matches
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr
                  key={r.id}
                  className={`border-b border-line hover:bg-cream/40 ${
                    !r.is_active ? "opacity-50" : ""
                  }`}
                >
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <Cell value={r.y2023} />
                  <Cell value={r.y2024} />
                  <Cell value={r.y2025} />
                  <Cell value={r.y2026} highlight />
                  <td className="px-3 py-2 text-right tabular-nums font-bold">
                    {r.total.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-bold text-bronze">
                    ₱{r.total_php.toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="bg-graphite text-paper border-t-[1.5px] border-graphite font-bold">
              <td className="px-3 py-2.5">Totals (visible rows)</td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {filtered.reduce((s, r) => s + r.y2023, 0).toLocaleString()}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {filtered.reduce((s, r) => s + r.y2024, 0).toLocaleString()}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {filtered.reduce((s, r) => s + r.y2025, 0).toLocaleString()}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {filtered.reduce((s, r) => s + r.y2026, 0).toLocaleString()}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {filtered.reduce((s, r) => s + r.total, 0).toLocaleString()}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                ₱{filtered.reduce((s, r) => s + r.total_php, 0).toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-[11px] text-ink-faint italic mt-3">
        Computed at ₱{pointToPhp} per point. 2026 figures update in real time as employees earn points;
        prior years are static snapshots from the matrix.
      </p>
    </div>
  );
}

function Th({
  onClick,
  active,
  dir,
  numeric,
  children,
}: {
  onClick: () => void;
  active: boolean;
  dir: "asc" | "desc";
  numeric?: boolean;
  children: React.ReactNode;
}) {
  return (
    <th
      onClick={onClick}
      className={`px-3 py-2.5 text-[11px] tracking-[0.1em] uppercase font-bold cursor-pointer hover:bg-cotton/50 ${
        numeric ? "text-right" : ""
      }`}
    >
      {children}
      {active && <span className="ml-1">{dir === "asc" ? "↑" : "↓"}</span>}
    </th>
  );
}

function Cell({ value, highlight }: { value: number; highlight?: boolean }) {
  return (
    <td
      className={`px-3 py-2 text-right tabular-nums ${
        value === 0 ? "text-ink-faint" : highlight ? "font-bold text-bronze" : ""
      }`}
    >
      {value === 0 ? "—" : value.toLocaleString()}
    </td>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className={`${accent} border-[1.5px] border-graphite rounded-y2k p-3 shadow-[2px_2px_0_#272727]`}>
      <div className="text-[10px] tracking-[0.15em] uppercase font-bold">{label}</div>
      <div className="font-serif text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function RelativeTime({ date }: { date: Date }) {
  const [text, setText] = useState(() => formatRelative(date));

  useEffect(() => {
    const tick = () => setText(formatRelative(date));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [date]);

  return <span>{text}</span>;
}

function formatRelative(d: Date): string {
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return d.toLocaleTimeString();
}
