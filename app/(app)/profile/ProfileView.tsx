"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMyProfile } from "@/app/admin/team/actions";
import type { ProfileDetails } from "./page";

const STATUS_LABELS: Record<string, string> = {
  fulltime: "Full-time",
  parttime: "Part-time",
  contractor: "Contractor",
  intern: "Intern",
  leave: "On leave",
  former: "Former",
};

export default function ProfileView({ profile }: { profile: ProfileDetails }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(profile.photo_url);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await updateMyProfile(formData);
      if ("error" in res) setError(res.error);
      else {
        setToast("✓ Profile updated");
        setTimeout(() => setToast(null), 2500);
        setEditing(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="max-w-2xl mx-auto">
      {toast && (
        <div className="fixed top-4 right-4 z-[200] bg-graphite text-paper px-4 py-2 rounded-y2k shadow-[3px_3px_0_#E6ABE1] font-bold text-sm">
          {toast}
        </div>
      )}

      {!editing ? (
        <div className="bg-paper border-[1.5px] border-graphite rounded-y2k shadow-[4px_4px_0_#E6ABE1] p-6 sm:p-8">
          <div className="flex items-start gap-5 mb-6 flex-wrap">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full border-[1.5px] border-graphite overflow-hidden bg-cream shrink-0 flex items-center justify-center shadow-[3px_3px_0_#272727]">
              {profile.photo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={profile.photo_url} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <span className="font-serif font-bold text-3xl">{profile.name.slice(0, 1).toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] tracking-[0.2em] uppercase text-ink-soft font-bold">Profile</span>
              <h1 className="font-serif text-3xl font-semibold mt-0.5">{profile.name}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {profile.role === "admin" && (
                  <span className="text-[10px] tracking-[0.1em] uppercase font-bold px-2 py-0.5 rounded-full bg-graphite text-paper">
                    Admin
                  </span>
                )}
                {profile.employment_status && (
                  <span className="text-[10px] tracking-[0.1em] uppercase font-bold px-2 py-0.5 rounded-full bg-lavender border-[1.5px] border-graphite">
                    {STATUS_LABELS[profile.employment_status] ?? profile.employment_status}
                  </span>
                )}
              </div>
            </div>
            <button onClick={() => setEditing(true)} className="btn btn-ghost text-xs">
              ✏️ Edit
            </button>
          </div>

          <dl className="space-y-3 border-t border-line pt-5">
            <Row label="Email" value={profile.email} />
            <Row label="Phone" value={profile.phone} />
            <Row label="Company / Client served" value={profile.company_client} />
            <Row
              label="Member since"
              value={profile.member_since ? formatDate(profile.member_since) : null}
            />
          </dl>

          <p className="text-[11px] text-ink-faint italic mt-5">
            You can update your photo and phone yourself. Other details are managed by admins —
            ping HR if anything needs to change.
          </p>
        </div>
      ) : (
        <form
          action={handleSubmit}
          className="bg-paper border-[1.5px] border-graphite rounded-y2k shadow-[4px_4px_0_#E6ABE1] p-6 sm:p-8"
        >
          <div className="mb-5">
            <span className="text-[10px] tracking-[0.2em] uppercase text-ink-soft font-bold">Edit your profile</span>
            <h1 className="font-serif text-2xl font-semibold mt-0.5">Make it yours</h1>
            <p className="text-sm text-ink-soft mt-1">Photo and phone only. Other details are managed by admins.</p>
          </div>

          <div className="flex items-start gap-4 mb-4">
            <div className="w-20 h-20 rounded-full border-[1.5px] border-graphite overflow-hidden bg-cream shrink-0 flex items-center justify-center">
              {photoPreview ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl text-ink-faint">👤</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <label className="label" htmlFor="photo">Photo (2 MB max)</label>
              <input
                id="photo"
                name="photo"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handlePhoto}
                className="block w-full text-xs text-ink-soft file:mr-2 file:py-1 file:px-2 file:rounded-full file:border-[1.5px] file:border-graphite file:bg-paper file:text-xs file:font-bold file:cursor-pointer"
              />
              {photoError && <p className="text-[10px] text-error mt-1">{photoError}</p>}
            </div>
          </div>

          <div className="mb-4">
            <label className="label" htmlFor="phone">Phone number</label>
            <input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={profile.phone ?? ""}
              className="input"
              placeholder="+63 917 ..."
              maxLength={30}
            />
          </div>

          {error && (
            <div className="mb-3 p-2 bg-error/10 border-[1.5px] border-error text-error text-xs rounded">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="btn flex-1">
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setPhotoPreview(profile.photo_url);
              }}
              disabled={pending}
              className="btn btn-ghost flex-1"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline gap-3 flex-wrap">
      <dt className="text-[11px] tracking-[0.18em] uppercase text-ink-soft font-bold min-w-[160px]">
        {label}
      </dt>
      <dd className="text-sm font-medium">
        {value ? value : <span className="text-ink-faint italic">Not set</span>}
      </dd>
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
