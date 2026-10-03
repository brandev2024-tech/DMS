"use client";

import { X } from "lucide-react";
import { useState } from "react";

/** Chip-style list editor (sizes, colors, quick replies…). Enter or comma adds. */
export function TagInput({
  label,
  values,
  onChange,
  suggestions = [],
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const v = raw.trim();
    if (v && !values.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...values, v]);
    setDraft("");
  };
  const remaining = suggestions.filter((s) => !values.some((v) => v.toLowerCase() === s.toLowerCase()));

  return (
    <div>
      <span className="label">{label}</span>
      <div className="input flex min-h-11 flex-wrap items-center gap-1.5 py-1.5">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-blush py-0.5 pl-2.5 pr-1 text-xs">
            {v}
            <button type="button" className="grid size-5 place-items-center rounded-full hover:bg-surface" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}>
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          aria-label={`Add ${label.toLowerCase()}`}
          className="min-w-24 flex-1 bg-transparent py-1 text-sm outline-none"
          value={draft}
          placeholder={values.length ? "" : placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && values.length) {
              onChange(values.slice(0, -1));
            }
          }}
          onBlur={() => draft && add(draft)}
        />
      </div>
      {remaining.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {remaining.map((s) => (
            <button key={s} type="button" className="rounded-full border border-dashed border-line px-2.5 py-1 text-xs text-muted hover:border-rose hover:text-ink" onClick={() => add(s)}>
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 py-1">
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input type="checkbox" role="switch" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-11 rounded-full bg-line transition peer-checked:bg-ink peer-focus-visible:ring-2 peer-focus-visible:ring-gold" />
        <span className="absolute left-0.5 top-0.5 size-5 rounded-full bg-surface shadow transition peer-checked:translate-x-5" />
      </span>
      <span>
        <span className={label ? "block text-sm font-medium" : "sr-only"}>{label || "Show on site"}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}
