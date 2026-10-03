import { Link2 } from "lucide-react";
import { FacebookIcon, InstagramIcon, MessengerIcon, TikTokIcon } from "./brand-icons";
import { hasInstagram, hasMessenger, instagramProfileUrl } from "@/lib/dm";
import type { ShopSettings } from "@/lib/types";

export type SocialLink = {
  key: string;
  label: string;
  handle: string;
  url: string;
  Icon: (p: { className?: string }) => React.ReactNode;
};

function handleFromUrl(url: string) {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, "").split("/").filter(Boolean).pop();
    return path ? (path.startsWith("@") ? path : `/${path}`) : u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** All enabled social links from shop settings, in display order. */
export function getSocialLinks(s: ShopSettings): SocialLink[] {
  const links: SocialLink[] = [];
  if (s.facebook_enabled && s.facebook_url) {
    links.push({ key: "facebook", label: "Facebook", handle: handleFromUrl(s.facebook_url), url: s.facebook_url, Icon: FacebookIcon });
  }
  if (hasMessenger(s)) {
    links.push({
      key: "messenger",
      label: "Messenger",
      handle: `m.me/${s.messenger_username}`,
      url: `https://m.me/${s.messenger_username}`,
      Icon: MessengerIcon,
    });
  }
  if (hasInstagram(s)) {
    const u = s.instagram_username!.replace(/^@/, "");
    links.push({ key: "instagram", label: "Instagram", handle: `@${u}`, url: instagramProfileUrl(u), Icon: InstagramIcon });
  }
  if (s.tiktok_enabled && s.tiktok_url) {
    links.push({ key: "tiktok", label: "TikTok", handle: handleFromUrl(s.tiktok_url), url: s.tiktok_url, Icon: TikTokIcon });
  }
  for (const [i, l] of (s.other_links ?? []).entries()) {
    if (l.enabled && l.url) {
      links.push({
        key: `other-${i}`,
        label: l.label || "Link",
        handle: handleFromUrl(l.url),
        url: l.url,
        Icon: ({ className }) => <Link2 className={`${className} text-gold-ink`} />,
      });
    }
  }
  return links;
}

export function SocialIconRow({ settings }: { settings: ShopSettings }) {
  const links = getSocialLinks(settings);
  if (!links.length) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {links.map(({ key, label, url, Icon }) => (
        <li key={key}>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="grid size-11 place-items-center rounded-full border border-line bg-surface transition hover:-translate-y-0.5 hover:border-rose"
          >
            <Icon className="size-5" />
          </a>
        </li>
      ))}
    </ul>
  );
}
