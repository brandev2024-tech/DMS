import Image from "next/image";
import Link from "next/link";

type Props = {
  name?: string;
  tagline?: string;
  logoUrl?: string | null;
  href?: string;
  size?: "sm" | "md" | "lg";
  align?: "start" | "center";
};

/** Wordmark: spaced serif "DMS" over an italic rose tagline. */
export function Logo({ name = "DMS", tagline = "Direct Message Us", logoUrl, href = "/", size = "md", align = "start" }: Props) {
  const text = size === "lg" ? "text-5xl" : size === "sm" ? "text-[1.6rem] md:text-[2rem]" : "text-3xl";
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5" aria-label={`${name} home`}>
      {logoUrl ? <Image src={logoUrl} alt="" width={36} height={36} className="size-9 rounded-full object-cover" /> : null}
      <span className={`flex flex-col leading-none ${align === "center" ? "items-center" : ""}`}>
        <span className={`font-serif font-medium tracking-[0.32em] ${text} -mr-[0.32em]`}>{name}</span>
        <span className="mt-0.5 font-serif text-[0.8rem] italic tracking-wide text-rose-ink">{tagline.toLowerCase()}</span>
      </span>
    </Link>
  );
}
