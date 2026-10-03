import type { Metadata } from "next";
import { DropPointsSection } from "@/components/drop-points/drop-points-section";
import { getDropPoints, getSettings } from "@/lib/data";

export const metadata: Metadata = {
  title: "Drop-off Points & Shipping",
  description: "Pick up your DMS order at our drop-off points and partner shops in Baguio, La Trinidad and nearby towns, or get it shipped nationwide via J&T Express or LBC.",
  alternates: { canonical: "/delivery" },
};

export default async function DeliveryPage() {
  const [settings, points] = await Promise.all([getSettings(), getDropPoints()]);
  return (
    <div className="container-page pt-10">
      <p className="eyebrow">Baguio · La Trinidad · Benguet</p>
      <h1 className="mt-2 text-5xl font-light sm:text-6xl">
        Drop-offs &amp; <em>delivery</em>
      </h1>
      <p className="mt-4 max-w-xl text-[0.95rem] leading-relaxed text-muted">
        Pick up your order at a drop-off point or partner shop near you, or have it shipped anywhere in the Philippines. Tap a pin for details and
        directions.
      </p>
      <div className="mt-10">
        <DropPointsSection points={points} couriers={settings.couriers} shippingNotes={settings.shipping_notes} />
      </div>
    </div>
  );
}
