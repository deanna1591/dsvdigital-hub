"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CatalogItem } from "@/lib/types";
import { addItem, updateItem, toggleActive, deleteItem, type ItemInput } from "../actions";

const EMOJI_SUGGESTIONS = ["🎁", "🛵", "🔊", "🔋", "🥟", "🧇", "🧹", "🛏️", "🍟", "☕", "⌚", "🎧", "🍱", "👕", "📚", "🎮", "🌱", "💄", "🧴", "🥤"];

const EMPTY: ItemInput = {
  name: "",
  icon: "🎁",
  points: 100,
  peso_value: 500,
  source_url: "",
  sort_order: 100,
  is_active: true,
};

export default function CatalogManager({ items }: { items: CatalogItem[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ItemInput>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY);
    setError(null);
    setModalOpen(true);
  }

  function openEdit(item: CatalogItem) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      icon: item.icon,
      points: item.points,
      peso_value: item.peso_value,
      source_url: item.source_url || "",
      sort_order: item.sort_order,
      is_active: item.is_active,
    });
    setError(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (pending) return;
    setModalOpen(false);
  }

  function onPointsChange(pts: number) {
    // Auto-sync peso_value to points × 5 (standard rate) unless user already customized
    setForm((f) => {
      const standardPhp = pts * 5;
      const wasStandard = f.peso_value === f.points * 5;
      return {
        ...f,
        points: pts,
        peso_value: wasStandard ? standardPhp : f.peso_value,
      };
    });
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = editingId
        ? await updateItem(editingId, form)
        : await addItem(form);
      if (res?.error) {
        setError(res.error);
      } else {
        setModalOpen(false);
        router.refresh();
      }
    });
  }

  function onToggleActive(item: CatalogItem) {
    startTransition(async () => {
      const res = await toggleActive(item.id, !item.is_active);
      if (res?.error) alert(res.error);
      router.refresh();
    });
  }

  function onDelete(item: CatalogItem) {
    if (!confirm(`Delete "${item.name}"? If any orders reference this item, it will be archived instead.`)) return;
    startTransition(async () => {
      const res = await deleteItem(item.id);
      if (res?.error) alert(res.error);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex justify-end mb-5">
        <button className="btn" onClick={openAdd}>+ Add New Item</button>
      </div>

      <div className="bg-paper border border-line rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-cream border-b-[1.5px] border-ink">
            <tr>
              <Th>Item</Th>
              <Th>Points</Th>
              <Th>₱ Value</Th>
              <Th>Sort</Th>
              <Th>Status</Th>
              <Th className="text-right pr-5">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-12 text-center text-ink-faint text-sm">
                  No catalog items. Click "Add New Item" to create one.
                </td>
              </tr>
            ) : (
              items.map((item, i) => (
                <tr key={item.id} className={`hover:bg-ink/[0.03] ${i > 0 ? "border-t border-line" : ""} ${!item.is_active ? "opacity-50" : ""}`}>
                  <Td>
                    <span className="text-2xl mr-2 align-middle">{item.icon}</span>
                    <span className="font-medium">{item.name}</span>
                    {item.source_url && (
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-xs text-accent hover:underline align-middle"
                        title={`Source: ${item.source_url}`}
                      >
                        ↗ source
                      </a>
                    )}
                  </Td>
                  <Td>
                    <strong>{item.points}</strong> <span className="text-ink-faint text-xs">pts</span>
                  </Td>
                  <Td>₱{item.peso_value.toLocaleString()}</Td>
                  <Td className="text-ink-soft text-xs">{item.sort_order}</Td>
                  <Td>
                    {item.is_active ? (
                      <span className="pill pill-delivered">Active</span>
                    ) : (
                      <span className="pill pill-rejected">Archived</span>
                    )}
                  </Td>
                  <Td className="text-right pr-5">
                    <div className="flex gap-1.5 justify-end">
                      <button className="btn btn-sm btn-ghost" disabled={pending} onClick={() => openEdit(item)}>
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-ghost"
                        disabled={pending}
                        onClick={() => onToggleActive(item)}
                      >
                        {item.is_active ? "Archive" : "Restore"}
                      </button>
                      <button className="btn btn-sm btn-warn" disabled={pending} onClick={() => onDelete(item)}>
                        Delete
                      </button>
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-ink/60 flex items-center justify-center z-[100] p-5" onClick={closeModal}>
          <div
            className="bg-paper rounded-xl max-w-lg w-full border-[1.5px] border-ink overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-5 pb-4 border-b border-dashed border-line">
              <h3 className="font-serif text-[22px] font-semibold">
                {editingId ? "Edit catalog item" : "Add new catalog item"}
              </h3>
            </div>

            <div className="px-6 py-5 overflow-y-auto space-y-4">
              <div>
                <label className="label">Item Name</label>
                <input
                  type="text"
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Smart Watch, Tumbler, Tote Bag"
                />
              </div>

              <div>
                <label className="label">Icon (emoji)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    className="input flex-1"
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    placeholder="🎁"
                  />
                  <div className="text-4xl bg-cream border border-line rounded-md w-14 h-12 flex items-center justify-center">
                    {form.icon || "?"}
                  </div>
                </div>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {EMOJI_SUGGESTIONS.map((emo) => (
                    <button
                      key={emo}
                      type="button"
                      className="text-xl bg-cream hover:bg-line border border-line rounded-md w-9 h-9 flex items-center justify-center transition-colors"
                      onClick={() => setForm({ ...form, icon: emo })}
                    >
                      {emo}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Points Cost</label>
                  <input
                    type="number"
                    className="input"
                    value={form.points}
                    min={1}
                    onChange={(e) => onPointsChange(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="label">Peso Value</label>
                  <input
                    type="number"
                    className="input"
                    value={form.peso_value}
                    min={0}
                    onChange={(e) => setForm({ ...form, peso_value: Number(e.target.value) })}
                  />
                  <p className="text-[10px] text-ink-faint mt-1">
                    Standard: {form.points} pts × ₱5 = ₱{(form.points * 5).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <label className="label">Source URL <span className="text-ink-faint normal-case tracking-normal font-normal">(optional — where you source/buy this item)</span></label>
                <input
                  type="url"
                  className="input"
                  value={form.source_url}
                  onChange={(e) => setForm({ ...form, source_url: e.target.value })}
                  placeholder="https://lazada.com.ph/..."
                />
                <p className="text-[10px] text-ink-faint mt-1">Internal only — helps you remember where to buy when fulfilling orders. Not shown to employees.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Sort Order</label>
                  <input
                    type="number"
                    className="input"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                  />
                  <p className="text-[10px] text-ink-faint mt-1">Lower = appears first</p>
                </div>
                <div>
                  <label className="label">Status</label>
                  <div className="flex items-center gap-2 h-[42px]">
                    <input
                      id="active-toggle"
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <label htmlFor="active-toggle" className="text-sm font-medium cursor-pointer">
                      Active (visible to employees)
                    </label>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-warn/10 border border-warn text-warn text-sm p-3 rounded">
                  {error}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-line bg-cream flex justify-end gap-2">
              <button className="btn btn-ghost" onClick={closeModal} disabled={pending}>
                Cancel
              </button>
              <button className="btn" onClick={submit} disabled={pending}>
                {pending ? "Saving..." : editingId ? "Save changes" : "Add to catalog"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`text-left px-4 py-3 text-[10px] tracking-[0.15em] uppercase font-bold text-ink-soft ${className}`}>
      {children}
    </th>
  );
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3.5 text-sm align-middle ${className}`}>{children}</td>;
}
