import type { Metadata } from "next";
import { DropPointManager } from "@/components/admin/drop-point-manager";
import { createClient } from "@/lib/supabase/server";
import type { DropPoint } from "@/lib/types";

export const metadata: Metadata = { title: "Drop-off points" };

export default async function AdminDropPointsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("drop_points").select("*").order("sort_order").order("name");
  return (
    <div className="mx-auto max-w-6xl">
      <p className="eyebrow">Delivery</p>
      <h1 className="mt-1 text-4xl">Drop-off points &amp; partners</h1>
      <p className="mb-6 mt-2 max-w-xl text-sm text-muted">
        These show on the map on your home page and the Drop-offs page. Couriers (J&amp;T, LBC) are edited in Settings.
      </p>
      <DropPointManager initial={(data ?? []) as DropPoint[]} />
    </div>
  );
}
