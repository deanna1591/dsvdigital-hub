"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Mission, MissionType, ProofType } from "@/lib/types";
import { addMission, updateMission, toggleMissionActive, deleteMission, type MissionInput } from "../actions";

const COLOR_PRESETS = [
  { name: "Teal", hex: "#4ba3a3" },
  { name: "Coral", hex: "#d97435" },
  { name: "Rose", hex: "#d65a5a" },
  { name: "Forest", hex: "#2f6650" },
  { name: "Royal", hex: "#9b80b8" },
  { name: "Sunshine", hex: "#e8a635" },
  { name: "Pink", hex: "#c95d8f" },
  { name: "Ocean", hex: "#4a7a9e" },
  { name: "Earth", hex: "#a07050" },
  { name: "Ink", hex: "#1f2238" },
];

const EMOJI_SUGGESTIONS = ["🎯", "⭐", "🚪", "📷", "💼", "👥", "🎬", "📸", "📝", "🎙️", "📊", "🎁", "💬", "🏆", "🚀"];

const PLATFORMS = [
  { value: "", label: "— None / Any —" },
  { value: "instagram", label: "Instagram" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "tiktok", label: "TikTok" },
  { value: "x", label: "X / Twitter" },
  { value: "facebook", label: "Facebook" },
  { value: "glassdoor", label: "Glassdoor" },
  { value: "trustpilot", label: "Trustpilot" },
  { value: "google", label: "Google Reviews" },
];

const TYPE_LABELS: Record<MissionType, string> = {
  "social-post": "Social Post",
  "review": "Review",
  "survey": "Survey",
  "video": "Video Testimonial",
  "referral": "Referral",
  "custom": "Custom Mission",
};

const PROOF_LABELS: Record<ProofType, string> = {
  "url": "URL link",
  "screenshot": "Screenshot URL (e.g. uploaded to Drive)",
  "text": "Text description",
  "none": "No proof required",
};

const EMPTY: MissionInput = {
  title: "",
  description: "",
  points: 25,
  mission_type: "custom",
  platform: "",
  proof_type: "url",
  cover_color: "#4ba3a3",
  cover_emoji: "🎯",
  external_link: "",
  instructions: "",
  is_pinned: false,
  is_active: true,
  max_per_user: 1,
  expires_at: "",
  sort_order: 100,
};

export default function MissionsManager({ missions }: { missions: Mission[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MissionInput>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(m: Mission) {
    setEditingId(m.id);
    setForm({
      title: m.title,
      description: m.description,
      points: m.points,
      mission_type: m.mission_type,
      platform: m.platform || "",
      proof_type: m.proof_type,
      cover_color: m.cover_color,
      cover_emoji: m.cover_emoji,
      external_link: m.external_link || "",
      instructions: m.instructions || "",
      is_pinned: m.is_pinned,
      is_active: m.is_active,
      max_per_user: m.max_per_user,
      expires_at: m.expires_at ? m.expires_at.slice(0, 10) : "",
      sort_order: m.sort_order,
    });
    setError(null);
    setModalOpen(true);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = editingId ? await updateMission(editingId, form) : await addMission(form);
      if (res?.error) setError(res.error);
      else {
        setModalOpen(false);
        router.refresh();
      }
    });
  }

  function onToggle(m: Mission) {
    startTransition(async () => {
      const res = await toggleMissionActive(m.id, !m.is_active);
      if (res?.error) alert(res.error);
      router.refresh();
    });
  }

  function onDelete(m: Mission) {
    if (!confirm(`Delete "${m.title}"? If it has submissions, it will be archived instead.`)) return;
    startTransition(async () => {
      const res = await deleteMission(m.id);
      if (res?.error) alert(res.error);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex justify-end mb-5">
        <button className="btn" onClick={openAdd}>+ Add New Mission</button>
      </div>

      {missions.length === 0 ? (
        <div className="bg-paper border border-line rounded-xl p-16 text-center">
          <div className="text-5xl mb-3">🎯</div>
          <p className="text-ink-soft mb-4">No missions yet.</p>
          <button className="btn" onClick={openAdd}>Create your first mission</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {missions.map((m) => (
            <MissionCard
              key={m.id}
              mission={m}
              onEdit={() => openEdit(m)}
              onToggle={() => onToggle(m)}
              onDelete={() => onDelete(m)}
              disabled={pending}
            />
          ))}
        </div>
      )}

      {modalOpen && <MissionFormModal form={form} setForm={setForm} editingId={editingId} error={error} pending={pending} onSubmit={submit} onClose={() => !pending && setModalOpen(false)} />}
    </>
  );
}

function MissionCard({
  mission: m,
  onEdit,
  onToggle,
  onDelete,
  disabled,
}: {
  mission: Mission;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const gradient = `linear-gradient(135deg, ${m.cover_color} 0%, ${darken(m.cover_color, 25)} 100%)`;
  const expiresSoon = m.expires_at && (new Date(m.expires_at).getTime() - Date.now()) < 7 * 24 * 60 * 60 * 1000;
  return (
    <div className={`rounded-xl overflow-hidden border-[1.5px] border-ink shadow-[4px_4px_0_#1f2238] ${!m.is_active ? "opacity-50" : ""}`}>
      <div className="relative h-44 p-5 text-white flex flex-col justify-between" style={{ background: gradient }}>
        <div className="flex justify-between items-start gap-2">
          <div className="flex gap-1.5 flex-wrap">
            {m.is_pinned && (
              <span className="bg-amber-500/90 text-white text-[10px] px-2 py-0.5 rounded-md font-bold tracking-wider uppercase">
                📌 Pinned
              </span>
            )}
            {m.is_active && (
              <span className="bg-black/30 text-white text-[10px] px-2 py-0.5 rounded-md font-bold tracking-wider uppercase">
                Ongoing
              </span>
            )}
            {!m.is_active && (
              <span className="bg-black/40 text-white text-[10px] px-2 py-0.5 rounded-md font-bold tracking-wider uppercase">
                Archived
              </span>
            )}
            {expiresSoon && (
              <span className="bg-warn text-white text-[10px] px-2 py-0.5 rounded-md font-bold tracking-wider uppercase">
                ⏳ Expires soon
              </span>
            )}
          </div>
          <div className="text-3xl drop-shadow-lg">{m.cover_emoji}</div>
        </div>

        <div>
          <div className="text-[10px] tracking-[0.2em] uppercase opacity-80 font-bold mb-1">Mission</div>
          <h3 className="font-serif text-lg font-semibold leading-tight drop-shadow-sm line-clamp-2">{m.title}</h3>
        </div>
      </div>

      <div className="bg-paper border-t-[1.5px] border-ink p-4 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-serif font-bold text-base text-ink">{m.points} Points</span>
          <span className="text-[10px] text-ink-soft uppercase tracking-wider font-bold">{TYPE_LABELS[m.mission_type]}</span>
        </div>
        <div className="flex gap-1">
          <button className="btn btn-sm btn-ghost" disabled={disabled} onClick={onEdit}>Edit</button>
          <button className="btn btn-sm btn-ghost" disabled={disabled} onClick={onToggle}>
            {m.is_active ? "Archive" : "Restore"}
          </button>
          <button className="btn btn-sm btn-warn" disabled={disabled} onClick={onDelete}>×</button>
        </div>
      </div>
    </div>
  );
}

function MissionFormModal({
  form,
  setForm,
  editingId,
  error,
  pending,
  onSubmit,
  onClose,
}: {
  form: MissionInput;
  setForm: (f: MissionInput) => void;
  editingId: string | null;
  error: string | null;
  pending: boolean;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-ink/60 flex items-center justify-center z-[100] p-5" onClick={onClose}>
      <div
        className="bg-paper rounded-xl max-w-2xl w-full border-[1.5px] border-ink overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-4 border-b border-dashed border-line">
          <h3 className="font-serif text-[22px] font-semibold">
            {editingId ? "Edit mission" : "Create new mission"}
          </h3>
        </div>

        <div className="px-6 py-5 overflow-y-auto space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Mission Type</label>
              <select className="input" value={form.mission_type} onChange={(e) => setForm({ ...form, mission_type: e.target.value as MissionType })}>
                <option value="social-post">Social Post</option>
                <option value="review">Review</option>
                <option value="referral">Referral</option>
                <option value="video">Video Testimonial</option>
                <option value="survey">Survey</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="label">Platform <span className="text-ink-faint normal-case font-normal tracking-normal">(optional)</span></label>
              <select className="input" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
                {PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Title</label>
            <input type="text" className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Leave a 5-star Glassdoor review" />
          </div>

          <div>
            <label className="label">Short Description</label>
            <textarea className="input min-h-[60px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="One-sentence pitch employees see on the mission card." />
          </div>

          <div>
            <label className="label">Step-by-step Instructions <span className="text-ink-faint normal-case font-normal tracking-normal">(shown in detail view)</span></label>
            <textarea className="input min-h-[80px]" value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} placeholder="e.g. 1. Go to Glassdoor → 2. Find DSV Digital → 3. Write a 5-star review → 4. Paste the URL here when published." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Cover Emoji</label>
              <div className="flex items-center gap-2">
                <input type="text" className="input flex-1" value={form.cover_emoji} onChange={(e) => setForm({ ...form, cover_emoji: e.target.value })} />
                <div className="text-3xl bg-cream border border-line rounded-md w-12 h-12 flex items-center justify-center">{form.cover_emoji}</div>
              </div>
              <div className="flex gap-1 mt-2 flex-wrap">
                {EMOJI_SUGGESTIONS.map((emo) => (
                  <button key={emo} type="button" className="text-lg bg-cream hover:bg-line border border-line rounded w-8 h-8" onClick={() => setForm({ ...form, cover_emoji: emo })}>{emo}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Cover Color</label>
              <div className="flex items-center gap-2">
                <input type="color" className="input h-[42px] p-1 w-16" value={form.cover_color} onChange={(e) => setForm({ ...form, cover_color: e.target.value })} />
                <input type="text" className="input flex-1" value={form.cover_color} onChange={(e) => setForm({ ...form, cover_color: e.target.value })} />
              </div>
              <div className="flex gap-1 mt-2 flex-wrap">
                {COLOR_PRESETS.map((c) => (
                  <button key={c.hex} type="button" className="w-7 h-7 rounded-md border border-line hover:scale-110 transition-transform" style={{ background: c.hex }} title={c.name} onClick={() => setForm({ ...form, cover_color: c.hex })} />
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Points Reward</label>
              <input type="number" className="input" value={form.points} min={1} onChange={(e) => setForm({ ...form, points: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Proof Type</label>
              <select className="input" value={form.proof_type} onChange={(e) => setForm({ ...form, proof_type: e.target.value as ProofType })}>
                {Object.entries(PROOF_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="label">External Link <span className="text-ink-faint normal-case font-normal tracking-normal">(optional — where to do the task)</span></label>
            <input type="url" className="input" value={form.external_link} onChange={(e) => setForm({ ...form, external_link: e.target.value })} placeholder="https://www.glassdoor.com/..." />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="label">Sort</label>
              <input type="number" className="input" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Max / user</label>
              <input type="number" className="input" value={form.max_per_user} min={0} onChange={(e) => setForm({ ...form, max_per_user: Number(e.target.value) })} />
              <p className="text-[9px] text-ink-faint mt-1">0 = unlimited</p>
            </div>
            <div>
              <label className="label">Expires</label>
              <input type="date" className="input" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
            </div>
            <div>
              <label className="label">Flags</label>
              <div className="flex flex-col gap-1 pt-1">
                <label className="text-xs flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={form.is_pinned} onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })} /> Pinned
                </label>
                <label className="text-xs flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active
                </label>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-warn/10 border border-warn text-warn text-sm p-3 rounded">{error}</div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-line bg-cream flex justify-end gap-2">
          <button className="btn btn-ghost" onClick={onClose} disabled={pending}>Cancel</button>
          <button className="btn" onClick={onSubmit} disabled={pending}>
            {pending ? "Saving..." : editingId ? "Save changes" : "Create mission"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Color util
function darken(hex: string, percent: number): string {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  let r = (num >> 16) - Math.round(255 * percent / 100);
  let g = ((num >> 8) & 0x00FF) - Math.round(255 * percent / 100);
  let b = (num & 0x0000FF) - Math.round(255 * percent / 100);
  r = Math.max(0, r);
  g = Math.max(0, g);
  b = Math.max(0, b);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
