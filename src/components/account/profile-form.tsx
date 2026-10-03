"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "../toast";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export function ProfileForm({ profile }: { profile: Pick<Profile, "id" | "full_name" | "phone" | "address"> }) {
  const [form, setForm] = useState({
    full_name: profile.full_name ?? "",
    phone: profile.phone ?? "",
    address: profile.address ?? "",
  });
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const router = useRouter();

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const { error } = await createClient()
          .from("profiles")
          .update({
            full_name: form.full_name.trim() || null,
            phone: form.phone.trim() || null,
            address: form.address.trim() || null,
          })
          .eq("id", profile.id);
        setBusy(false);
        if (error) toast("Couldn't save your profile.", "error");
        else {
          toast("Profile saved 💕");
          router.refresh();
        }
      }}
    >
      <label className="block">
        <span className="label">Name</span>
        <input className="input" autoComplete="name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
      </label>
      <label className="block">
        <span className="label">
          Phone <span className="font-normal text-muted">(optional)</span>
        </span>
        <input className="input" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </label>
      <label className="block">
        <span className="label">
          Delivery address <span className="font-normal text-muted">(optional)</span>
        </span>
        <textarea
          className="input resize-none"
          rows={3}
          autoComplete="street-address"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
      </label>
      <button className="btn-primary" disabled={busy}>
        {busy ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
