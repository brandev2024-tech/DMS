"use client";

import { ImagePlus, Loader2, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { TagInput, Toggle } from "./tag-input";
import { FacebookIcon, InstagramIcon, MessengerIcon, TikTokIcon } from "../brand-icons";
import { useToast } from "../toast";
import { uploadImage } from "@/lib/chat";
import { imageUrl } from "@/lib/images";
import { createClient } from "@/lib/supabase/client";
import type { ShopSettings } from "@/lib/types";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card space-y-4 p-5 sm:p-6">
      <div>
        <h2 className="text-xl">{title}</h2>
        {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, ...props }: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input className="input" {...props} />
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

/** Uploads to R2 (branding/…) and stores the object key. */
function ImageField({ label, value, onChange }: { label: string; value: string | null; onChange: (v: string | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-center gap-3">
        <span className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-blush">
          {value && <Image src={imageUrl(value)!} alt="" fill sizes="80px" className="object-cover" />}
        </span>
        <input
          ref={ref}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setBusy(true);
            try {
              onChange(await uploadImage("branding", file, 1800));
            } catch (err) {
              toast(err instanceof Error ? err.message : "Upload failed.", "error");
            } finally {
              setBusy(false);
            }
          }}
        />
        <button type="button" className="btn-outline" onClick={() => ref.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />} {value ? "Change" : "Upload"}
        </button>
        {value && (
          <button type="button" className="btn-ghost px-3 text-xs" onClick={() => onChange(null)}>
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

export function SettingsForm({ initial }: { initial: ShopSettings }) {
  const [s, setS] = useState(initial);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const router = useRouter();
  const set = <K extends keyof ShopSettings>(k: K, v: ShopSettings[K]) => setS((prev) => ({ ...prev, [k]: v }));
  const text = (k: keyof ShopSettings) => ({
    value: (s[k] as string | null) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(k, e.target.value as never),
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const clean = (v: string | null) => (v?.trim() ? v.trim() : null);
    const row = {
      id: 1,
      ...s,
      shop_name: s.shop_name.trim() || "DMS",
      tagline: s.tagline.trim() || "Direct Message Us",
      hero_headline: s.hero_headline.trim() || "Cropped. Cozy. Couture.",
      hero_subtext: clean(s.hero_subtext),
      facebook_url: clean(s.facebook_url),
      messenger_username: clean(s.messenger_username)?.replace(/^@/, "").replace(/^https?:\/\/m\.me\//, "") ?? null,
      instagram_username: clean(s.instagram_username)?.replace(/^@/, "") ?? null,
      tiktok_url: clean(s.tiktok_url),
      other_links: s.other_links.filter((l) => l.url.trim()),
      phone: clean(s.phone),
      email: clean(s.email),
      hours: clean(s.hours),
      location: clean(s.location),
      how_to_order: clean(s.how_to_order),
      payment_notes: clean(s.payment_notes),
      shipping_notes: clean(s.shipping_notes),
      currency_symbol: s.currency_symbol.trim() || "₱",
      currency_code: s.currency_code.trim().toUpperCase() || "PHP",
      updated_at: new Date().toISOString(),
    };
    const { error } = await createClient().from("shop_settings").upsert(row);
    setSaving(false);
    if (error) return toast(`Couldn't save: ${error.message}`, "error");
    toast("Settings saved ✨ Changes are live on the site.");
    router.refresh();
  }

  const updateLink = (i: number, patch: Partial<ShopSettings["other_links"][number]>) =>
    set(
      "other_links",
      s.other_links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)),
    );

  return (
    <form onSubmit={save} className="space-y-6">
      <Section title="Shop info & branding">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Shop name" required {...text("shop_name")} />
          <Field label="Tagline" {...text("tagline")} />
        </div>
        <ImageField label="Logo (optional, shown beside the DMS wordmark)" value={s.logo_key} onChange={(v) => set("logo_key", v)} />
        <ImageField label="Hero banner image" value={s.hero_image_key} onChange={(v) => set("hero_image_key", v)} />
        <Field label="Hero headline" {...text("hero_headline")} />
        <label className="block">
          <span className="label">Hero subtext</span>
          <textarea className="input resize-none" rows={2} value={s.hero_subtext ?? ""} onChange={(e) => set("hero_subtext", e.target.value)} />
        </label>
      </Section>

      <Section title="Social media & DM links" hint="Turn a link off to hide it. A DM button only shows when its username is set and switched on.">
        <div className="space-y-4 rounded-2xl border border-line p-4">
          <div className="flex items-center gap-3">
            <FacebookIcon className="size-7" />
            <span className="flex-1 font-medium">Facebook</span>
            <Toggle label="" checked={s.facebook_enabled} onChange={(v) => set("facebook_enabled", v)} />
          </div>
          <Field label="Facebook Page URL" type="url" placeholder="https://facebook.com/yourpage" {...text("facebook_url")} />
        </div>

        <div className="space-y-4 rounded-2xl border border-line p-4">
          <div className="flex items-center gap-3">
            <MessengerIcon className="size-7" />
            <span className="flex-1 font-medium">Messenger</span>
            <Toggle label="" checked={s.messenger_enabled} onChange={(v) => set("messenger_enabled", v)} />
          </div>
          <Field
            label="Messenger / Page username"
            placeholder="yourpage"
            hint={`Used for the m.me link: https://m.me/${s.messenger_username || "yourpage"}`}
            {...text("messenger_username")}
          />
        </div>

        <div className="space-y-4 rounded-2xl border border-line p-4">
          <div className="flex items-center gap-3">
            <InstagramIcon className="size-7" />
            <span className="flex-1 font-medium">Instagram</span>
            <Toggle label="" checked={s.instagram_enabled} onChange={(v) => set("instagram_enabled", v)} />
          </div>
          <Field
            label="Instagram username"
            placeholder="yourhandle"
            hint={`DM link: https://ig.me/m/${(s.instagram_username || "yourhandle").replace(/^@/, "")}`}
            {...text("instagram_username")}
          />
        </div>

        <div className="space-y-4 rounded-2xl border border-line p-4">
          <div className="flex items-center gap-3">
            <TikTokIcon className="size-7" />
            <span className="flex-1 font-medium">TikTok</span>
            <Toggle label="" checked={s.tiktok_enabled} onChange={(v) => set("tiktok_enabled", v)} />
          </div>
          <Field label="TikTok URL" type="url" placeholder="https://tiktok.com/@yourhandle" {...text("tiktok_url")} />
        </div>

        <div className="space-y-3">
          <p className="label">Other links (Shopee, Lazada, Linktree…)</p>
          {s.other_links.map((l, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 rounded-2xl border border-line p-3">
              <input className="input flex-1 basis-32" placeholder="Label" aria-label="Link label" value={l.label} onChange={(e) => updateLink(i, { label: e.target.value })} />
              <input className="input flex-[2] basis-48" type="url" placeholder="https://…" aria-label="Link URL" value={l.url} onChange={(e) => updateLink(i, { url: e.target.value })} />
              <Toggle label="" checked={l.enabled} onChange={(v) => updateLink(i, { enabled: v })} />
              <button
                type="button"
                className="grid size-10 place-items-center rounded-full text-rose-ink hover:bg-blush"
                aria-label={`Remove ${l.label || "link"}`}
                onClick={() => set("other_links", s.other_links.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          <button type="button" className="btn-outline" onClick={() => set("other_links", [...s.other_links, { label: "", url: "", enabled: true }])}>
            <Plus className="size-4" /> Add link
          </button>
        </div>
      </Section>

      <Section title="Contact info">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone / Viber" type="tel" {...text("phone")} />
          <Field label="Email" type="email" {...text("email")} />
          <Field label="Business hours" placeholder="Mon–Sat, 10AM–8PM" {...text("hours")} />
          <Field label="Location" placeholder="Metro Manila, Philippines" {...text("location")} />
        </div>
      </Section>

      <Section title="Ordering, payment & shipping" hint="Shown in the How to Order section and on product pages.">
        {(
          [
            ["how_to_order", "How to Order text"],
            ["payment_notes", "Payment notes"],
            ["shipping_notes", "Shipping notes"],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="block">
            <span className="label">{label}</span>
            <textarea className="input resize-y" rows={3} value={s[k] ?? ""} onChange={(e) => set(k, e.target.value)} />
          </label>
        ))}
        <TagInput
          label="Couriers (nationwide shipping)"
          values={s.couriers}
          onChange={(v) => set("couriers", v)}
          suggestions={["J&T Express", "LBC", "Lalamove", "Grab Express"]}
          placeholder="Type a courier and press Enter"
        />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Currency symbol" maxLength={4} {...text("currency_symbol")} />
          <Field label="Currency code" maxLength={3} placeholder="PHP" {...text("currency_code")} />
        </div>
      </Section>

      <Section title="Inbox quick replies" hint="Tap ⚡ in a chat to insert one of these.">
        <TagInput label="Quick replies" values={s.quick_replies} onChange={(v) => set("quick_replies", v)} placeholder="Type a reply and press Enter" />
      </Section>

      <div className="sticky bottom-16 z-20 flex justify-end rounded-2xl border border-line bg-bg/95 p-3 backdrop-blur lg:bottom-4">
        <button className="btn-primary min-w-40" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Saving…
            </>
          ) : (
            "Save settings"
          )}
        </button>
      </div>
    </form>
  );
}
