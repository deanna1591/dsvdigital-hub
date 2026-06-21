"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { awardPoints } from "../actions";
import type { EmployeeBalance, PointCategory } from "@/lib/types";

export default function AwardPointsForm({
  employees,
  categories,
}: {
  employees: EmployeeBalance[];
  categories: PointCategory[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [employeeId, setEmployeeId] = useState(employees[0]?.id || "");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [points, setPoints] = useState(categories[0]?.default_points || 5);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  function onCategoryChange(id: string) {
    setCategoryId(id);
    const cat = categories.find((c) => c.id === id);
    if (cat) setPoints(cat.default_points);
  }

  function submit() {
    setMsg(null);
    startTransition(async () => {
      const res = await awardPoints({ employeeId, categoryId, points: Number(points), note });
      if (res?.error) {
        setMsg({ type: "err", text: res.error });
      } else {
        setMsg({ type: "ok", text: `+${points} pts awarded` });
        setNote("");
        router.refresh();
      }
    });
  }

  return (
    <div className="p-5 space-y-3.5">
      <div>
        <label className="label">Employee</label>
        <select className="input" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Category</label>
        <select className="input" value={categoryId} onChange={(e) => onCategoryChange(e.target.value)}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.default_points} pts default)
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Points to Award</label>
        <input
          type="number"
          className="input"
          value={points}
          min={1}
          onChange={(e) => setPoints(Number(e.target.value))}
        />
      </div>

      <div>
        <label className="label">Note (optional)</label>
        <input
          type="text"
          className="input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. June Hometown Snapshot"
        />
      </div>

      {msg && (
        <p className={`text-sm p-2 rounded ${msg.type === "ok" ? "bg-good/10 text-good" : "bg-warn/10 text-warn"}`}>
          {msg.text}
        </p>
      )}

      <button className="btn w-full" disabled={pending} onClick={submit}>
        {pending ? "Awarding..." : "Award Points"}
      </button>
    </div>
  );
}
