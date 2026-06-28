"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  inviteEmployee,
  updateEmployee,
  deactivateEmployee,
  reactivateEmployee,
  resendInvite,
} from "./actions";
import type { Employee } from "./page";

const STATUS_LABELS: Record<string, string> = {
  fulltime: "Full-time",
  parttime: "Part-time",
  contractor: "Contractor",
  intern: "Intern",
  leave: "On leave",
  former: "Former",
};

const STATUS_PILL: Record<string, string> = {
  fulltime: "bg-good text-paper",
  parttime: "bg-lavender",
  contractor: "bg-bubblegum",
  intern: "bg-goldrush",
  leave: "bg-cream",
  former: "bg-line text-ink-soft",
};

export default function TeamList({ employees }: { employees: Employee[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("active");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filtered = employees.filter((e) => {
    if (filter === "active" && !e.is_active) return false;
    if (filter === "inactive" && e.is_active) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        e.name.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q) ||
        e.company_client?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function handleInvite(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await inviteEmployee(formData);
      if ("error" in res) setError(res.error);
      else {
        showToast(`✓ Invite sent`);
        setInviting(false);
        router.refresh();
      }
    });
  }

  function handleUpdate(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await updateEmployee(formData);
      if ("error" in res) setError(res.error);
      else {
        showToast("✓ Profile updated");
        setEditing(null);
        router.refresh();
      }
    });
  }

  function handleDeactivate(emp: Employee) {
    if (!confirm(`Deactivate ${emp.name}? They won't be able to log in but all their data is kept.`)) return;
    startTransition(async () => {
      const res = await deactivateEmployee(emp.id);
      if ("error" in res) setError(res.error);
      else {
        showToast("Deactivated");
        router.refresh();
      }
    });
  }

  function handleReactivate(emp: Employee) {
    startTransition(async () => {
      const res = await reactivateEmployee(emp.id);
      if ("error" in res) setError(res.error);
      else {
        showToast("Reactivated");
        router.refresh();
      }
    });
  }

  function handleResend(emp: Employee) {
    if (!emp.email) {
      setError("No email on file");
      return;
    }
    startTransition(async () => {
      const res = await resendInvite(emp.email!);
      if ("error" in res) setError(res.error);
      else showToast("✓ Invite resent");
    });
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-5 flex items-center gap-2 flex-wrap">
        <div className="flex gap-1">
          {(["active", "all", "inactive"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-bold rounded-full border-[1.5px] border-graphite transition-colors ${
                filter === f ? "bg-graphite text-paper" : "bg-paper hover:bg-cream"
              }`}
            >
              {f === "active" ? "Active" : f === "inactive" ? "Inactive" : "All"}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or company…"
          className="input flex-1 max-w-xs text-sm"
        />
        <span className="text-xs text-ink-soft ml-auto">
          {filtered.length} {filtered.length === 1 ? "person" : "people"}
        </span>
        <button onClick={() => setInviting(true)} className="btn text-sm">
          + Invite
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-error/10 border-[1.5px] border-error text-error text-sm rounded-lg">
          {error}
        </div>
      )}

      {toast && (
        <div className="fixed top-4 right-4 z-[200] bg-graphite text-paper px-4 py-2 rounded-y2k shadow-[3px_3px_0_#E6ABE1] font-bold text-sm">
          {toast}
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-paper border-[1.5px] border-dashed border-line rounded-y2k p-8 text-center text-ink-soft">
          <p className="text-sm">No matches. Try widening your filter.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((emp) => (
            <li
              key={emp.id}
              className={`bg-paper border-[1.5px] border-graphite rounded-y2k shadow-[2px_2px_0_#272727] p-4 ${
                !emp.is_active ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="w-14 h-14 rounded-full border-[1.5px] border-graphite overflow-hidden bg-cream shrink-0 flex items-center justify-center">
                  {emp.photo_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={emp.photo_url} alt={emp.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-serif font-bold text-lg">{emp.name.slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <strong className="font-serif font-semibold text-base">{emp.name}</strong>
                    {emp.role === "admin" && (
                      <span className="text-[10px] tracking-[0.1em] uppercase font-bold px-2 py-0.5 rounded-full bg-graphite text-paper">
                        Admin
                      </span>
                    )}
                    {emp.employment_status && (
                      <span
                        className={`text-[10px] tracking-[0.1em] uppercase font-bold px-2 py-0.5 rounded-full border-[1.5px] border-graphite ${
                          STATUS_PILL[emp.employment_status] ?? "bg-cream"
                        }`}
                      >
                        {STATUS_LABELS[emp.employment_status] ?? emp.employment_status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-soft mt-0.5 truncate">{emp.email ?? "no email"}</p>
                  {emp.company_client && (
                    <p className="text-xs text-ink-soft mt-0.5 truncate">📍 {emp.company_client}</p>
                  )}
                  {emp.member_since && (
                    <p className="text-[10px] text-ink-faint mt-1">
                      Member since {formatDate(emp.member_since)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-3 flex-wrap text-xs">
                <button
                  onClick={() => setEditing(emp)}
                  disabled={pending}
                  className="font-bold text-graphite underline-offset-2 hover:underline"
                >
                  ✏️ Edit
                </button>
                {emp.is_active && emp.email && (
                  <button
                    onClick={() => handleResend(emp)}
                    disabled={pending}
                    className="font-bold text-bronze underline-offset-2 hover:underline"
                  >
                    📧 Resend invite
                  </button>
                )}
                {emp.is_active ? (
                  emp.role !== "admin" && (
                    <button
                      onClick={() => handleDeactivate(emp)}
                      disabled={pending}
                      className="font-bold text-error underline-offset-2 hover:underline ml-auto"
                    >
                      🚪 Deactivate
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => handleReactivate(emp)}
                    disabled={pending}
                    className="font-bold text-good underline-offset-2 hover:underline ml-auto"
                  >
                    ↺ Reactivate
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Invite modal */}
      {inviting && (
        <EmployeeForm
          mode="invite"
          onClose={() => setInviting(false)}
          onSubmit={handleInvite}
          pending={pending}
        />
      )}

      {/* Edit modal */}
      {editing && (
        <EmployeeForm
          mode="edit"
          employee={editing}
          onClose={() => setEditing(null)}
          onSubmit={handleUpdate}
          pending={pending}
        />
      )}
    </div>
  );
}

function EmployeeForm({
  mode,
  employee,
  onClose,
  onSubmit,
  pending,
}: {
  mode: "invite" | "edit";
  employee?: Employee;
  onClose: () => void;
  onSubmit: (fd: FormData) => void;
  pending: boolean;
}) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(
    employee?.photo_url ?? null,
  );
  const [photoError, setPhotoError] = useState<string | null>(null);

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    setPhotoError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setPhotoError("Photo over 2 MB");
      e.target.value = "";
      return;
    }
    setPhotoPreview(URL.createObjectURL(file));
  }

  return (
    <div
      className="fixed inset-0 z-[150] bg-graphite/60 flex items-center justify-center p-5"
      onClick={() => !pending && onClose()}
    >
      <form
        action={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-paper rounded-y2k max-w-lg w-full border-[1.5px] border-graphite overflow-hidden shadow-[4px_4px_0_#272727] max-h-[90vh] flex flex-col"
      >
        <div className="px-5 pt-4 pb-3 border-b-[1.5px] border-graphite bg-cream">
          <h3 className="font-serif text-lg font-semibold">
            {mode === "invite" ? "Invite a new employee" : "Edit profile"}
          </h3>
          {mode === "invite" && (
            <p className="text-xs text-ink-soft mt-0.5">
              They'll get an email with a magic link to set their password.
            </p>
          )}
        </div>

        <div className="px-5 py-4 overflow-y-auto space-y-3">
          {employee?.id && <input type="hidden" name="id" value={employee.id} />}

          {/* Photo */}
          <div className="flex items-start gap-3">
            <div className="w-20 h-20 rounded-full border-[1.5px] border-graphite overflow-hidden bg-cream shrink-0 flex items-center justify-center">
              {photoPreview ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl text-ink-faint">👤</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <label className="label" htmlFor="emp-photo">Employee photo (optional, 2 MB max)</label>
              <input
                id="emp-photo"
                name="photo"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handlePhoto}
                className="block w-full text-xs text-ink-soft file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-[1.5px] file:border-graphite file:bg-paper file:text-xs file:font-bold file:cursor-pointer"
              />
              {photoError && <p className="text-[10px] text-error mt-1">{photoError}</p>}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="label" htmlFor="emp-name">Name *</label>
            <input
              id="emp-name"
              name="name"
              type="text"
              defaultValue={employee?.name ?? ""}
              className="input"
              required
              maxLength={80}
            />
          </div>

          {/* Email */}
          <div>
            <label className="label" htmlFor="emp-email">Email {mode === "invite" ? "*" : ""}</label>
            <input
              id="emp-email"
              name="email"
              type="email"
              defaultValue={employee?.email ?? ""}
              className="input"
              required={mode === "invite"}
              disabled={mode === "edit"}
            />
            {mode === "edit" && (
              <p className="text-[10px] text-ink-faint mt-1 italic">
                Email is the login identity — not editable here. Deactivate and re-invite if it needs to change.
              </p>
            )}
          </div>

          {/* Company / Client */}
          <div>
            <label className="label" htmlFor="emp-company">Company / Client served</label>
            <input
              id="emp-company"
              name="company_client"
              type="text"
              defaultValue={employee?.company_client ?? ""}
              className="input"
              placeholder="e.g. Klook, Acme Corp, Internal team"
              maxLength={80}
            />
          </div>

          {/* Status */}
          <div>
            <label className="label" htmlFor="emp-status">Employment status</label>
            <select
              id="emp-status"
              name="employment_status"
              defaultValue={employee?.employment_status ?? ""}
              className="input"
            >
              <option value="">— Not set —</option>
              <option value="fulltime">Full-time</option>
              <option value="parttime">Part-time</option>
              <option value="contractor">Contractor</option>
              <option value="intern">Intern</option>
              <option value="leave">On leave</option>
              <option value="former">Former employee</option>
            </select>
          </div>

          {/* Phone */}
          <div>
            <label className="label" htmlFor="emp-phone">Phone number</label>
            <input
              id="emp-phone"
              name="phone"
              type="tel"
              defaultValue={employee?.phone ?? ""}
              className="input"
              placeholder="+63 917 ..."
              maxLength={30}
            />
          </div>

          {/* Member since */}
          <div>
            <label className="label" htmlFor="emp-since">Member since</label>
            <input
              id="emp-since"
              name="member_since"
              type="date"
              defaultValue={employee?.member_since ?? new Date().toISOString().slice(0, 10)}
              className="input"
            />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-line bg-cream flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={pending} className="btn btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={pending} className="btn">
            {pending ? "Saving…" : mode === "invite" ? "Send invite" : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}
