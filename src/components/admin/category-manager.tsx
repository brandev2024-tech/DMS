"use client";

import { ArrowDown, ArrowUp, Eye, EyeOff, ImagePlus, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ConfirmDialog } from "./product-list";
import { useToast } from "../toast";
import { uploadImage } from "@/lib/chat";
import { slugify } from "@/lib/format";
import { imageUrl } from "@/lib/images";
import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/lib/types";

type Draft = { id?: string; name: string; slug: string; description: string; cover_image_key: string | null };

export function CategoryManager({ initial, counts }: { initial: Category[]; counts: Record<string, number> }) {
  const [cats, setCats] = useState(initial);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [confirm, setConfirm] = useState<Category | null>(null);
  const toast = useToast();
  const router = useRouter();

  const refresh = async () => {
    const { data } = await createClient().from("categories").select("*").order("sort_order").order("name");
    setCats((data ?? []) as Category[]);
    router.refresh();
  };

  async function move(i: number, d: -1 | 1) {
    const j = i + d;
    if (j < 0 || j >= cats.length) return;
    const next = [...cats];
    [next[i], next[j]] = [next[j], next[i]];
    setCats(next);
    const supabase = createClient();
    const results = await Promise.all(next.map((c, idx) => supabase.from("categories").update({ sort_order: idx }).eq("id", c.id)));
    if (results.some((r) => r.error)) toast("Couldn't save the new order.", "error");
  }

  async function toggleVisible(c: Category) {
    const { error } = await createClient().from("categories").update({ is_visible: !c.is_visible }).eq("id", c.id);
    if (error) return toast("Couldn't update.", "error");
    toast(c.is_visible ? `"${c.name}" hidden from shop` : `"${c.name}" visible`);
    refresh();
  }

  async function remove(c: Category) {
    setConfirm(null);
    const { error } = await createClient().from("categories").delete().eq("id", c.id);
    if (error) return toast("Couldn't delete.", "error");
    toast("Category deleted");
    refresh();
  }

  return (
    <div>
      <button className="btn-primary" onClick={() => setEditing({ name: "", slug: "", description: "", cover_image_key: null })}>
        <Plus className="size-4" /> New category
      </button>

      <ul className="card mt-5 divide-y divide-line overflow-hidden">
        {cats.length === 0 && <li className="p-8 text-center text-sm text-muted">No categories yet.</li>}
        {cats.map((c, i) => (
          <li key={c.id} className={`flex items-center gap-3 p-3 sm:p-4 ${c.is_visible ? "" : "bg-blush/30"}`}>
            <div className="flex flex-col">
              <button className="grid size-8 place-items-center rounded-full hover:bg-blush disabled:opacity-30" aria-label={`Move ${c.name} up`} disabled={i === 0} onClick={() => move(i, -1)}>
                <ArrowUp className="size-4" />
              </button>
              <button className="grid size-8 place-items-center rounded-full hover:bg-blush disabled:opacity-30" aria-label={`Move ${c.name} down`} disabled={i === cats.length - 1} onClick={() => move(i, 1)}>
                <ArrowDown className="size-4" />
              </button>
            </div>
            <span className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-blush">
              {c.cover_image_key && <Image src={imageUrl(c.cover_image_key, "thumb")!} alt="" fill sizes="56px" className="object-cover" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{c.name}</span>
              <span className="block truncate text-xs text-muted">
                /shop/{c.slug} · {counts[c.id] ?? 0} products{!c.is_visible && " · Hidden"}
              </span>
            </span>
            <button className="grid size-9 place-items-center rounded-full hover:bg-blush" aria-label={c.is_visible ? `Hide ${c.name}` : `Show ${c.name}`} onClick={() => toggleVisible(c)}>
              {c.is_visible ? <Eye className="size-4" /> : <EyeOff className="size-4 text-muted" />}
            </button>
            <button
              className="grid size-9 place-items-center rounded-full hover:bg-blush"
              aria-label={`Edit ${c.name}`}
              onClick={() => setEditing({ id: c.id, name: c.name, slug: c.slug, description: c.description ?? "", cover_image_key: c.cover_image_key })}
            >
              <Pencil className="size-4" />
            </button>
            <button className="grid size-9 place-items-center rounded-full text-rose-ink hover:bg-blush" aria-label={`Delete ${c.name}`} onClick={() => setConfirm(c)}>
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>

      {editing && (
        <CategoryDialog
          draft={editing}
          nextSort={cats.length}
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
          body={`${counts[confirm.id] ?? 0} product(s) in this category will become "Uncategorized" (they won't be deleted).`}
          confirmLabel="Delete category"
          onCancel={() => setConfirm(null)}
          onConfirm={() => remove(confirm)}
        />
      )}
    </div>
  );
}

function CategoryDialog({ draft, nextSort, onClose, onSaved }: { draft: Draft; nextSort: number; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState(draft);
  const [slugTouched, setSlugTouched] = useState(Boolean(draft.id));
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const row = { name: d.name.trim(), slug: slugify(d.slug || d.name), description: d.description.trim() || null, cover_image_key: d.cover_image_key };
    const supabase = createClient();
    const { error } = d.id
      ? await supabase.from("categories").update(row).eq("id", d.id)
      : await supabase.from("categories").insert({ ...row, sort_order: nextSort });
    setBusy(false);
    if (error) return setError(error.code === "23505" ? "That slug is already used by another category." : error.message);
    toast(d.id ? "Category saved" : "Category created ✨");
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 sm:items-center sm:p-4" onClick={onClose}>
      <form
        onSubmit={save}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cat-dialog-title"
        className="animate-slide-up max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-bg p-6 shadow-soft sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id="cat-dialog-title" className="text-2xl">
            {d.id ? "Edit category" : "New category"}
          </h2>
          <button type="button" onClick={onClose} className="grid size-10 place-items-center rounded-full hover:bg-blush" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="label">Name *</span>
            <input
              className="input"
              required
              autoFocus
              value={d.name}
              onChange={(e) => setD({ ...d, name: e.target.value, slug: slugTouched ? d.slug : slugify(e.target.value) })}
            />
          </label>
          <label className="block">
            <span className="label">Slug</span>
            <input
              className="input"
              value={d.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setD({ ...d, slug: slugify(e.target.value) });
              }}
            />
          </label>
          <label className="block">
            <span className="label">
              Description <span className="font-normal text-muted">optional</span>
            </span>
            <textarea className="input resize-none" rows={2} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} />
          </label>
          <div>
            <span className="label">Cover image</span>
            <div className="flex items-center gap-3">
              <span className="relative size-20 overflow-hidden rounded-xl bg-blush">
                {d.cover_image_key && <Image src={imageUrl(d.cover_image_key, "thumb")!} alt="" fill sizes="80px" className="object-cover" />}
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  setUploading(true);
                  try {
                    setD((cur) => ({ ...cur, cover_image_key: null }));
                    const key = await uploadImage("category", file, 1200);
                    setD((cur) => ({ ...cur, cover_image_key: key }));
                  } catch (err) {
                    toast(err instanceof Error ? err.message : "Upload failed.", "error");
                  } finally {
                    setUploading(false);
                  }
                }}
              />
              <button type="button" className="btn-outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />} {d.cover_image_key ? "Change" : "Upload"}
              </button>
              {d.cover_image_key && (
                <button type="button" className="btn-ghost px-3 text-xs" onClick={() => setD({ ...d, cover_image_key: null })}>
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-blush px-3 py-2 text-sm text-rose-ink">
            {error}
          </p>
        )}
        <button className="btn-primary mt-6 w-full" disabled={busy || uploading}>
          {busy ? "Saving…" : d.id ? "Save category" : "Create category"}
        </button>
      </form>
    </div>
  );
}
