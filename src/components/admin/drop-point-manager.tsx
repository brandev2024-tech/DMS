"use client";

import { ArrowDown, ArrowUp, Eye, EyeOff, MapPin, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "./product-list";
import { BAGUIO, DropMap } from "../drop-points/drop-map";
import { useToast } from "../toast";
import { createClient } from "@/lib/supabase/client";
import type { DropPoint } from "@/lib/types";

type Draft = Omit<DropPoint, "id" | "sort_order" | "is_active"> & { id?: string };

const AREAS = ["Baguio City", "La Trinidad", "Tuba", "Itogon", "Sablan", "Tublay", "Bokod", "Kapangan"];

const empty: Draft = { name: "", kind: "drop_point", area: "Baguio City", address: "", landmark: "", schedule: "", notes: "", lat: BAGUIO[0], lng: BAGUIO[1] };

export function DropPointManager({ initial }: { initial: DropPoint[] }) {
  const [points, setPoints] = useState(initial);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [confirm, setConfirm] = useState<DropPoint | null>(null);
  const toast = useToast();
  const router = useRouter();

  const refresh = async () => {
    const { data } = await createClient().from("drop_points").select("*").order("sort_order").order("name");
    setPoints((data ?? []) as DropPoint[]);
    router.refresh();
  };

  async function move(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= points.length) return;
    const next = [...points];
    [next[i], next[j]] = [next[j], next[i]];
    setPoints(next);
    const supabase = createClient();
    const res = await Promise.all(next.map((p, idx) => supabase.from("drop_points").update({ sort_order: idx }).eq("id", p.id)));
    if (res.some((r) => r.error)) toast("Couldn't save the new order.", "error");
  }

  async function toggle(p: DropPoint) {
    const { error } = await createClient().from("drop_points").update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) return toast("Couldn't update.", "error");
    refresh();
  }

  async function remove(p: DropPoint) {
    setConfirm(null);
    const { error } = await createClient().from("drop_points").delete().eq("id", p.id);
    if (error) return toast("Couldn't delete.", "error");
    toast("Drop-off point deleted");
    refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
      <div className="order-2 lg:order-1">
        <button className="btn-primary" onClick={() => setEditing({ ...empty })}>
          <Plus className="size-4" /> Add drop-off point
        </button>
        <ul className="card mt-5 divide-y divide-line overflow-hidden">
          {points.length === 0 && <li className="p-8 text-center text-sm text-muted">No drop-off points yet.</li>}
          {points.map((p, i) => (
            <li key={p.id} className={`flex items-center gap-3 p-3 sm:p-4 ${p.is_active ? "" : "bg-blush/40"}`}>
              <div className="flex flex-col">
                <button className="grid size-8 place-items-center rounded-full hover:bg-blush disabled:opacity-30" aria-label={`Move ${p.name} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp className="size-4" />
                </button>
                <button className="grid size-8 place-items-center rounded-full hover:bg-blush disabled:opacity-30" aria-label={`Move ${p.name} down`} disabled={i === points.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown className="size-4" />
                </button>
              </div>
              <MapPin className={`size-5 shrink-0 ${p.kind === "partner" ? "text-ink" : "text-rose-ink"}`} strokeWidth={1.5} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{p.name}</span>
                <span className="block truncate text-xs text-muted">
                  {p.kind === "partner" ? "Partner" : "Drop-off"} · {p.area}
                  {p.schedule ? ` · ${p.schedule}` : ""}
                  {!p.is_active && " · Hidden"}
                </span>
              </span>
              <button className="grid size-9 place-items-center rounded-full hover:bg-blush" aria-label={p.is_active ? `Hide ${p.name}` : `Show ${p.name}`} onClick={() => toggle(p)}>
                {p.is_active ? <Eye className="size-4" /> : <EyeOff className="size-4 text-muted" />}
              </button>
              <button
                className="grid size-9 place-items-center rounded-full hover:bg-blush"
                aria-label={`Edit ${p.name}`}
                onClick={() =>
                  setEditing({
                    id: p.id,
                    name: p.name,
                    kind: p.kind,
                    area: p.area,
                    address: p.address ?? "",
                    landmark: p.landmark ?? "",
                    schedule: p.schedule ?? "",
                    notes: p.notes ?? "",
                    lat: p.lat,
                    lng: p.lng,
                  })
                }
              >
                <Pencil className="size-4" />
              </button>
              <button className="grid size-9 place-items-center rounded-full text-rose-ink hover:bg-blush" aria-label={`Delete ${p.name}`} onClick={() => setConfirm(p)}>
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="order-1 lg:order-2">
        <DropMap points={points.filter((p) => p.is_active)} className="h-72 lg:sticky lg:top-6 lg:h-[32rem]" />
      </div>

      {editing && (
        <PointDialog
          draft={editing}
          nextSort={points.length}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
      {confirm && (
        <ConfirmDialog
          title={`Delete "${confirm.name}"?`}
          body="It will disappear from the map on your site."
          confirmLabel="Delete"
          onCancel={() => setConfirm(null)}
          onConfirm={() => remove(confirm)}
        />
      )}
    </div>
  );
}

function PointDialog({ draft, nextSort, onClose, onSaved }: { draft: Draft; nextSort: number; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState(draft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((cur) => ({ ...cur, [k]: v }));
  const text = (k: "name" | "address" | "landmark" | "schedule" | "notes") => ({
    value: d[k] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.value),
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const clean = (v: string | null) => (v?.trim() ? v.trim() : null);
    const row = {
      name: d.name.trim(),
      kind: d.kind,
      area: d.area.trim() || "Baguio City",
      address: clean(d.address),
      landmark: clean(d.landmark),
      schedule: clean(d.schedule),
      notes: clean(d.notes),
      lat: d.lat,
      lng: d.lng,
    };
    const supabase = createClient();
    const { error } = d.id
      ? await supabase.from("drop_points").update(row).eq("id", d.id)
      : await supabase.from("drop_points").insert({ ...row, sort_order: nextSort });
    setBusy(false);
    if (error) return setError(error.message);
    toast(d.id ? "Drop-off point saved" : "Drop-off point added 📍");
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 sm:items-center sm:p-4" onClick={onClose}>
      <form
        onSubmit={save}
        role="dialog"
        aria-modal="true"
        aria-labelledby="point-dialog-title"
        className="animate-slide-up max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-bg p-6 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id="point-dialog-title" className="text-3xl">
            {d.id ? "Edit drop-off point" : "New drop-off point"}
          </h2>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full hover:bg-blush" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="label">Name *</span>
            <input className="input" required autoFocus placeholder="e.g. Session Road Drop Point" {...text("name")} />
          </label>
          <label className="block">
            <span className="label">Type</span>
            <select className="input" value={d.kind} onChange={(e) => set("kind", e.target.value as Draft["kind"])}>
              <option value="drop_point">Drop-off / meet-up point</option>
              <option value="partner">Partner shop</option>
            </select>
          </label>
          <label className="block">
            <span className="label">Area / town</span>
            <input className="input" list="area-options" value={d.area} onChange={(e) => set("area", e.target.value)} />
            <datalist id="area-options">
              {AREAS.map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </label>
          <label className="block">
            <span className="label">Address</span>
            <input className="input" placeholder="Street / barangay" {...text("address")} />
          </label>
          <label className="block">
            <span className="label">Landmark</span>
            <input className="input" placeholder="e.g. Near the Municipal Hall" {...text("landmark")} />
          </label>
          <label className="block">
            <span className="label">Schedule</span>
            <input className="input" placeholder="e.g. Mon–Sat, 10AM–6PM" {...text("schedule")} />
          </label>
          <label className="block">
            <span className="label">Notes</span>
            <input className="input" placeholder="e.g. Message us first" {...text("notes")} />
          </label>
        </div>

        <div className="mt-5">
          <span className="label">Location: tap the map to place the pin, or drag it</span>
          <DropMap points={[]} pick={{ lat: d.lat, lng: d.lng }} onPick={(p) => setD((cur) => ({ ...cur, ...p }))} className="h-72" />
          <p className="mt-2 text-xs text-muted">
            {d.lat.toFixed(5)}, {d.lng.toFixed(5)}
          </p>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-blush px-3 py-2 text-sm text-rose-ink">
            {error}
          </p>
        )}
        <button className="btn-primary mt-6 w-full" disabled={busy}>
          {busy ? "Saving…" : d.id ? "Save drop-off point" : "Add drop-off point"}
        </button>
      </form>
    </div>
  );
}
