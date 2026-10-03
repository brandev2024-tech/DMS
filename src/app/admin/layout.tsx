import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdmin } from "@/lib/admin";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | DMS Admin" },
  robots: { index: false, follow: false },
};

// Always render per request: pages depend on the visitor session and live shop data.
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <AdminNav />
      <main className="min-w-0 flex-1 px-4 pb-24 pt-6 sm:px-6 lg:px-10 lg:pb-10 lg:pt-10">{children}</main>
    </div>
  );
}
