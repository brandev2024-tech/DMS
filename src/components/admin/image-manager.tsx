"use client";

import { ArrowLeft, ArrowRight, ImagePlus, Star, Trash2 } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { imageUrl } from "@/lib/images";

/** An existing (r2Key) or not-yet-uploaded (file) product photo. */
export type DraftImage = { key: string; r2Key?: string; file?: File; preview?: string };

export function ImageManager({ images, onChange }: { images: DraftImage[]; onChange: (v: DraftImage[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Revoke object URLs when the component goes away.
  const imagesRef = useRef(images);
  useEffect(() => {
    imagesRef.current = images;
  }, [images]);
  useEffect(() => () => imagesRef.current.forEach((i) => i.preview && URL.revokeObjectURL(i.preview)), []);

  const addFiles = (files: FileList | File[]) => {
    const list = [...files].filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    onChange([...images, ...list.map((file) => ({ key: crypto.randomUUID(), file, preview: URL.createObjectURL(file) }))]);
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length || from === to) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setDragOver(true);
          }
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          if (!e.dataTransfer.files.length) return;
          e.preventDefault();
          setDragOver(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`grid place-items-center rounded-2xl border-2 border-dashed px-4 py-8 text-center transition ${dragOver ? "border-rose bg-blush" : "border-line"}`}
      >
        <ImagePlus className="size-8 text-rose-ink" />
        <p className="mt-2 text-sm">
          Drag &amp; drop photos here, or{" "}
          <button type="button" className="font-medium text-rose-ink underline" onClick={() => inputRef.current?.click()}>
            browse
          </button>
        </p>
        <p className="mt-1 text-xs text-muted">Photos are resized &amp; compressed automatically. Portrait (4:5) looks best.</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {images.length > 0 && (
        <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((img, i) => (
            <li
              key={img.key}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                if (dragIndex == null) return;
                e.preventDefault();
                move(dragIndex, i);
                setDragIndex(null);
              }}
              className={`group relative aspect-[4/5] cursor-grab overflow-hidden rounded-xl bg-blush ${i === 0 ? "ring-2 ring-gold ring-offset-2 ring-offset-bg" : ""}`}
            >
              {img.preview ? (
                // eslint-disable-next-line @next/next/no-img-element -- local blob preview
                <img src={img.preview} alt={`New photo ${i + 1}`} className="size-full object-cover" />
              ) : (
                <Image src={imageUrl(img.r2Key, "thumb")!} alt={`Photo ${i + 1}`} fill sizes="160px" className="object-cover" />
              )}
              {i === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-gold px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-[#3b2a2a]">Main</span>
              )}
              {img.file && <span className="absolute right-1.5 top-1.5 rounded-full bg-surface px-2 py-0.5 text-[0.6rem]">New</span>}
              <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-gradient-to-t from-black/60 to-transparent p-1.5 pt-6">
                <button type="button" className="grid size-8 place-items-center rounded-full bg-surface/90 disabled:opacity-40" aria-label="Move left" disabled={i === 0} onClick={() => move(i, i - 1)}>
                  <ArrowLeft className="size-3.5" />
                </button>
                {i !== 0 && (
                  <button type="button" className="grid size-8 place-items-center rounded-full bg-surface/90" aria-label="Set as main photo" title="Set as main" onClick={() => move(i, 0)}>
                    <Star className="size-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  className="grid size-8 place-items-center rounded-full bg-surface/90 text-rose-ink"
                  aria-label="Remove photo"
                  onClick={() => {
                    if (img.preview) URL.revokeObjectURL(img.preview);
                    onChange(images.filter((x) => x.key !== img.key));
                  }}
                >
                  <Trash2 className="size-3.5" />
                </button>
                <button type="button" className="grid size-8 place-items-center rounded-full bg-surface/90 disabled:opacity-40" aria-label="Move right" disabled={i === images.length - 1} onClick={() => move(i, i + 1)}>
                  <ArrowRight className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
