import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/settings-form";
import { getSettings } from "@/lib/data";

export const metadata: Metadata = { title: "Shop Settings" };

export default async function AdminSettingsPage() {
  const settings = await getSettings();
  return (
    <div className="mx-auto max-w-3xl">
      <p className="eyebrow">Shop</p>
      <h1 className="mb-6 mt-1 text-3xl sm:text-4xl">Settings &amp; social links</h1>
      <SettingsForm initial={settings} />
    </div>
  );
}
