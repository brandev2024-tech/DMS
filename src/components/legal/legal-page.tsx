import type { ReactNode } from "react";

/** Plain reading layout for the privacy policy and terms (linked from the phone app and store listings). */
export function LegalPage({ eyebrow, title, updated, children }: { eyebrow: string; title: string; updated: string; children: ReactNode }) {
  return (
    <div className="container-page max-w-3xl pt-10 pb-20">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-2 text-5xl font-light sm:text-6xl">{title}</h1>
      <p className="mt-3 text-sm text-muted">Last updated {updated}</p>
      <div className="mt-10 space-y-8 text-[0.95rem] leading-relaxed [&_h2]:mb-2 [&_h2]:text-2xl [&_li]:ml-5 [&_li]:list-disc [&_p]:text-muted [&_ul]:space-y-1 [&_ul]:text-muted">
        {children}
      </div>
    </div>
  );
}
