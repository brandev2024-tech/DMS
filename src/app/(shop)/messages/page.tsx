import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { PushToggle } from "@/components/account/push-toggle";
import { Inbox } from "@/components/chat/inbox";
import { getCurrentUser } from "@/lib/data";

export const metadata: Metadata = { title: "My Messages", robots: { index: false } };

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/messages");
  if (user.profile?.role === "admin") redirect("/admin/inbox");

  return (
    <div className="container-page pt-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Direct Ask</p>
          <h1 className="mt-1 text-3xl sm:text-4xl">My Messages</h1>
        </div>
        <PushToggle userId={user.id} className="btn-outline min-h-10 text-xs" />
      </div>
      <Suspense>
        <Inbox userId={user.id} mode="shopper" />
      </Suspense>
    </div>
  );
}
