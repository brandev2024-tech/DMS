import type { Metadata } from "next";
import { Suspense } from "react";
import { Inbox } from "@/components/chat/inbox";
import { requireAdmin } from "@/lib/admin";
import { getSettings } from "@/lib/data";

export const metadata: Metadata = { title: "Inbox" };

export default async function AdminInboxPage() {
  const [user, settings] = await Promise.all([requireAdmin(), getSettings()]);
  return (
    <div className="mx-auto max-w-6xl">
      <p className="eyebrow">Direct Ask</p>
      <h1 className="mb-4 mt-1 text-3xl sm:text-4xl">Inbox</h1>
      <Suspense>
        <Inbox userId={user.id} mode="admin" quickReplies={settings.quick_replies} />
      </Suspense>
    </div>
  );
}
