"use client";

import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, Marker } from "leaflet";
import { useEffect, useRef } from "react";
import type { DropPoint } from "@/lib/types";

/** Baguio City centre. */
export const BAGUIO: [number, number] = [16.4123, 120.5960];

type Props = {
  points: DropPoint[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Admin picker mode: click the map to place a pin. */
  pick?: { lat: number; lng: number } | null;
  onPick?: (p: { lat: number; lng: number }) => void;
  className?: string;
};

function pinHtml(kind: DropPoint["kind"] | "pick", active: boolean) {
  const color = kind === "partner" ? "var(--ink)" : "var(--rose-ink)";
  const size = active ? 34 : 26;
  return `<span style="display:block;width:${size}px;height:${size}px;transform:translate(-50%,-100%);">
    <svg viewBox="0 0 24 24" width="${size}" height="${size}" style="filter:drop-shadow(0 2px 3px rgb(0 0 0 / .25))">
      <path d="M12 23s7.5-7.1 7.5-13A7.5 7.5 0 0 0 4.5 10c0 5.9 7.5 13 7.5 13Z" fill="${color}" stroke="#fff" stroke-width="1.5"/>
      <circle cx="12" cy="10" r="2.8" fill="#fff"/>
    </svg></span>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function DropMap({ points, selectedId, onSelect, pick, onPick, className = "" }: Props) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const pickRef = useRef<Marker | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const onSelectRef = useRef(onSelect);
  const onPickRef = useRef(onPick);
  useEffect(() => {
    onSelectRef.current = onSelect;
    onPickRef.current = onPick;
  });

  // Create the map once (Leaflet needs the browser).
  useEffect(() => {
    let cancelled = false;
    const markers = markersRef.current;
    import("leaflet").then((L) => {
      if (cancelled || !elRef.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(elRef.current, { scrollWheelZoom: false, zoomControl: true, attributionControl: true }).setView(BAGUIO, 12);
      // Standard OpenStreetMap tiles, toned down to monochrome in CSS (.dms-map).
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      map.on("click", (e) => onPickRef.current?.({ lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) }));
      mapRef.current = map;
      map.fire("dms:ready");
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markers.clear();
      pickRef.current = null;
    };
  }, []);

  // Sync markers with the points list.
  useEffect(() => {
    const sync = () => {
      const L = LRef.current;
      const map = mapRef.current;
      if (!L || !map) return;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      for (const p of points) {
        const marker = L.marker([p.lat, p.lng], {
          icon: L.divIcon({ html: pinHtml(p.kind, p.id === selectedId), className: "", iconSize: [0, 0] }),
          title: p.name,
          keyboard: true,
          zIndexOffset: p.id === selectedId ? 1000 : 0,
        })
          .addTo(map)
          .bindPopup(
            `<strong>${escapeHtml(p.name)}</strong><br/><span style="opacity:.7">${escapeHtml(p.landmark ?? p.address ?? p.area)}</span>${
              p.schedule ? `<br/><span style="opacity:.7">${escapeHtml(p.schedule)}</span>` : ""
            }`,
          )
          .on("click", () => onSelectRef.current?.(p.id));
        markersRef.current.set(p.id, marker);
      }
      if (points.length > 1 && !selectedId && !pick) {
        map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])), { padding: [30, 30], maxZoom: 13 });
      }
    };
    if (mapRef.current) sync();
    else {
      // Map not ready yet: wait for it.
      const t = setInterval(() => {
        if (mapRef.current) {
          clearInterval(t);
          sync();
        }
      }, 50);
      return () => clearInterval(t);
    }
  }, [points, selectedId, pick]);

  // Fly to the selected point.
  useEffect(() => {
    const p = points.find((x) => x.id === selectedId);
    const m = selectedId ? markersRef.current.get(selectedId) : null;
    if (p && mapRef.current) {
      mapRef.current.flyTo([p.lat, p.lng], 15, { duration: 0.8 });
      setTimeout(() => m?.openPopup(), 850);
    }
  }, [selectedId, points]);

  // Admin picker pin.
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    pickRef.current?.remove();
    pickRef.current = null;
    if (pick) {
      pickRef.current = L.marker([pick.lat, pick.lng], {
        icon: L.divIcon({ html: pinHtml("pick", true), className: "", iconSize: [0, 0] }),
        draggable: true,
      })
        .addTo(map)
        .on("dragend", (e) => {
          const ll = (e.target as Marker).getLatLng();
          onPickRef.current?.({ lat: +ll.lat.toFixed(6), lng: +ll.lng.toFixed(6) });
        });
      map.setView([pick.lat, pick.lng], Math.max(map.getZoom(), 14));
    }
  }, [pick]);

  return (
    <div
      ref={elRef}
      role="region"
      aria-label="Map of drop-off points"
      className={`dms-map isolate z-0 overflow-hidden rounded-2xl border border-line bg-blush ${className}`}
    />
  );
}
