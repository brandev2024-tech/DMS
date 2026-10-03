"use client";

import { Clock, MapPin, Navigation, Package, Truck } from "lucide-react";
import { useMemo, useState } from "react";
import { DropMap } from "./drop-map";
import type { DropPoint } from "@/lib/types";

type Props = {
  points: DropPoint[];
  couriers: string[];
  shippingNotes: string | null;
  /** Compact = home page teaser; full = /delivery page. */
  variant?: "compact" | "full";
};

function directionsUrl(p: DropPoint) {
  return `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
}

/** Map + list of drop-off points & partners, plus courier shipping options. */
export function DropPointsSection({ points, couriers, shippingNotes, variant = "full" }: Props) {
  const areas = useMemo(() => [...new Set(points.map((p) => p.area))], [points]);
  const [area, setArea] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const visible = area ? points.filter((p) => p.area === area) : points;

  return (
    <div>
      {/* Area filter */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        <button type="button" className="chip shrink-0" aria-pressed={!area} onClick={() => (setArea(null), setSelected(null))}>
          All areas
        </button>
        {areas.map((a) => (
          <button key={a} type="button" className="chip shrink-0" aria-pressed={area === a} onClick={() => (setArea(a), setSelected(null))}>
            {a}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <DropMap
          points={visible}
          selectedId={selected}
          onSelect={setSelected}
          className={`lg:col-span-7 ${variant === "full" ? "h-[22rem] sm:h-[30rem] lg:h-[36rem]" : "h-[20rem] sm:h-[26rem] lg:h-[30rem]"}`}
        />

        <ul className={`overflow-y-auto border-t border-line lg:col-span-5 ${variant === "full" ? "max-h-[32rem] lg:max-h-[36rem]" : "max-h-[24rem] lg:max-h-[30rem]"}`}>
          {visible.map((p) => (
            <li key={p.id} className={`flex items-center gap-2 border-b border-line transition-colors sm:px-2 ${selected === p.id ? "bg-blush/60" : ""}`}>
              <button
                type="button"
                onClick={() => setSelected(p.id)}
                aria-pressed={selected === p.id}
                className="flex min-w-0 flex-1 gap-3 py-4 text-left"
              >
                <MapPin className={`mt-0.5 size-5 shrink-0 ${p.kind === "partner" ? "text-ink" : "text-rose-ink"}`} strokeWidth={1.5} />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium">{p.name}</span>
                    <span className="text-[0.6rem] uppercase tracking-[0.14em] text-muted">{p.kind === "partner" ? "Partner" : "Drop-off"}</span>
                  </span>
                  <span className="block text-sm text-muted">
                    {p.area}
                    {p.landmark ? ` · ${p.landmark}` : ""}
                  </span>
                  {p.schedule && (
                    <span className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                      <Clock className="size-3.5" strokeWidth={1.5} /> {p.schedule}
                    </span>
                  )}
                  {p.notes && <span className="mt-1 block text-xs italic text-muted">{p.notes}</span>}
                </span>
              </button>
              <a
                href={directionsUrl(p)}
                target="_blank"
                rel="noopener noreferrer"
                className="grid size-10 shrink-0 place-items-center rounded-full border border-line transition-colors hover:border-ink"
                aria-label={`Directions to ${p.name}`}
                title="Directions"
              >
                <Navigation className="size-4" strokeWidth={1.5} />
              </a>
            </li>
          ))}
          {visible.length === 0 && <li className="py-10 text-center text-sm text-muted">No drop-off points listed yet.</li>}
        </ul>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="size-4 text-rose-ink" strokeWidth={1.5} /> Drop-off / meet-up point
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="size-4 text-ink" strokeWidth={1.5} /> Partner shop
        </span>
        <span>Message us first so we can have your order ready.</span>
      </div>

      {/* Shipping */}
      {couriers.length > 0 && (
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-1">
            <p className="label">Outside Baguio?</p>
            <h3 className="font-serif text-3xl font-light">
              We ship <em className="accent">nationwide</em>
            </h3>
            {shippingNotes && <p className="mt-2 text-sm leading-relaxed text-muted">{shippingNotes}</p>}
          </div>
          {couriers.map((c) => (
            <div key={c} className="card flex items-center gap-4 p-5">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-blush">
                <Truck className="size-5 text-rose-ink" strokeWidth={1.5} />
              </span>
              <span>
                <span className="block font-medium">{c}</span>
                <span className="flex items-center gap-1.5 text-xs text-muted">
                  <Package className="size-3.5" strokeWidth={1.5} /> Door-to-door or branch pick-up
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
