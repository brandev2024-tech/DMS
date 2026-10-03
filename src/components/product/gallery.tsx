"use client";

import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ProductImage } from "@/lib/types";
import { imageUrl } from "@/lib/images";

export function Gallery({ images, name, children }: { images: ProductImage[]; name: string; children?: React.ReactNode }) {
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const goTo = useCallback((i: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: i * track.clientWidth, behavior: "smooth" });
  }, []);

  // Keep the active dot/thumbnail in sync with swipes.
  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    setIndex(Math.round(track.scrollLeft / track.clientWidth));
  };

  if (!images.length) {
    return (
      <div>
        <div className="grid aspect-[4/5] place-items-center rounded-2xl bg-blush font-serif text-5xl text-rose-ink/50">DMS</div>
        {children}
      </div>
    );
  }

  return (
    <div>
      <div className="relative">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="no-scrollbar flex aspect-[4/5] snap-x snap-mandatory overflow-x-auto rounded-2xl bg-blush"
          aria-roledescription="carousel"
          aria-label={`${name} photos`}
        >
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              className="relative h-full w-full shrink-0 snap-center cursor-zoom-in"
              onClick={() => {
                setIndex(i);
                setLightbox(true);
              }}
              aria-label={`View photo ${i + 1} of ${images.length} full screen`}
            >
              <Image
                src={imageUrl(img.r2_key)!}
                alt={`${name}, photo ${i + 1}`}
                fill
                priority={i === 0}
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            </button>
          ))}
        </div>
        <span className="pointer-events-none absolute bottom-3 right-3 grid size-9 place-items-center rounded-full bg-surface/85 backdrop-blur">
          <Expand className="size-4" strokeWidth={1.5} />
        </span>
        {images.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 md:hidden" aria-hidden="true">
            {images.map((img, i) => (
              <span key={img.id} className={`h-1.5 rounded-full bg-surface transition-all ${i === index ? "w-5" : "w-1.5 opacity-60"}`} />
            ))}
          </div>
        )}
      </div>

      {/* Slot directly under the main photo (the DM buttons). */}
      {children}

      {images.length > 1 && (
        <div className="mt-3 hidden gap-2 md:flex">
          {images.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === index}
              className={`relative aspect-[4/5] w-16 overflow-hidden rounded-lg border transition ${i === index ? "border-ink" : "border-transparent opacity-60 hover:opacity-100"}`}
            >
              <Image src={imageUrl(img.r2_key, "thumb")!} alt="" fill sizes="80px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {lightbox && <Lightbox images={images} name={name} start={index} onClose={() => setLightbox(false)} />}
    </div>
  );
}

function Lightbox({ images, name, start, onClose }: { images: ProductImage[]; name: string; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const go = useCallback(
    (d: number) => {
      setZoom(null);
      setI((cur) => (cur + d + images.length) % images.length);
    },
    [images.length],
  );

  useEffect(() => {
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [go, onClose]);

  // Basic swipe support.
  const touchX = useRef<number | null>(null);

  return (
    <div role="dialog" aria-modal="true" aria-label={`${name} photos`} className="animate-fade-in fixed inset-0 z-[80] flex flex-col bg-[#131011]/95 text-[#fff8f3]">
      <div className="flex items-center justify-between p-3">
        <span className="px-2 text-sm opacity-80">
          {i + 1} / {images.length}
        </span>
        <button ref={closeRef} onClick={onClose} className="grid size-11 place-items-center rounded-full hover:bg-white/10" aria-label="Close">
          <X className="size-6" />
        </button>
      </div>
      <div
        className="relative flex-1 overflow-hidden"
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current == null || zoom) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
      >
        <button
          type="button"
          className={`relative h-full w-full ${zoom ? "cursor-zoom-out" : "cursor-zoom-in"}`}
          aria-label={zoom ? "Zoom out" : "Zoom in"}
          onClick={(e) => {
            if (zoom) return setZoom(null);
            const r = e.currentTarget.getBoundingClientRect();
            setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
          }}
        >
          <Image
            src={imageUrl(images[i].r2_key)!}
            alt={`${name}, photo ${i + 1}`}
            fill
            sizes="100vw"
            className="object-contain transition-transform duration-300"
            style={zoom ? { transform: "scale(2.2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
          />
        </button>
        {images.length > 1 && (
          <>
            <button onClick={() => go(-1)} className="absolute left-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Previous photo">
              <ChevronLeft className="size-6" />
            </button>
            <button onClick={() => go(1)} className="absolute right-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Next photo">
              <ChevronRight className="size-6" />
            </button>
          </>
        )}
      </div>
      <p className="p-4 text-center text-xs opacity-70">Tap the photo to zoom</p>
    </div>
  );
}
