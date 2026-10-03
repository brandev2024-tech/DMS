"use client";

import { Check, Copy, MessageCircleHeart, Send, Share2, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { InstagramIcon, MessengerIcon } from "../brand-icons";
import { useShop } from "../shop-context";
import { useToast } from "../toast";
import { logDmClick, startDirectAsk } from "@/lib/chat";
import { buildInquiryMessage, copyToClipboard, hasInstagram, hasMessenger, instagramDmUrl, messengerUrl } from "@/lib/dm";
import type { DmChannel } from "@/lib/types";

export type ActionProduct = {
  id: string;
  name: string;
  slug: string;
  url: string; // absolute product URL
  image: string | null; // absolute main image URL (goes in the message)
  thumb: string | null; // main image src for display
  price: string | null; // formatted, null when hidden
  sizes: string[];
  colors: string[];
  soldOut: boolean;
};

type ActionsState = {
  product: ActionProduct;
  size: string | null;
  setSize: (v: string | null) => void;
  color: string | null;
  setColor: (v: string | null) => void;
  open: (c: DmChannel) => void;
  /** True while the under-photo buttons are on screen (hides the sticky bar). */
  inlineVisible: boolean;
  setInlineVisible: (v: boolean) => void;
};

const ActionsContext = createContext<ActionsState | null>(null);

function useActions() {
  const ctx = useContext(ActionsContext);
  if (!ctx) throw new Error("Product action components must be inside <ProductActionsProvider>");
  return ctx;
}

/** Shares size/color selection between the photo's DM buttons and the details column. */
export function ProductActionsProvider({ product, children }: { product: ActionProduct; children: React.ReactNode }) {
  const [size, setSize] = useState<string | null>(product.sizes.length === 1 ? product.sizes[0] : null);
  const [color, setColor] = useState<string | null>(product.colors.length === 1 ? product.colors[0] : null);
  const [channel, setChannel] = useState<DmChannel | null>(null);
  const [inlineVisible, setInlineVisible] = useState(true);

  return (
    <ActionsContext.Provider value={{ product, size, setSize, color, setColor, open: setChannel, inlineVisible, setInlineVisible }}>
      {children}
      <StickyDmBar />
      {channel && <InquiryModal channel={channel} product={product} size={size} color={color} onClose={() => setChannel(null)} />}
    </ActionsContext.Provider>
  );
}

function DmButtons({ compact }: { compact: boolean }) {
  const { settings } = useShop();
  const { open } = useActions();
  const showMessenger = hasMessenger(settings);
  const showInstagram = hasInstagram(settings);
  const count = 1 + Number(showMessenger) + Number(showInstagram);
  // Phones: icon over label so three buttons fit side by side.
  const small = compact
    ? "flex-col gap-0.5 px-2 py-1.5 text-[0.62rem] tracking-[0.12em]"
    : "min-h-14 flex-col gap-1 rounded-2xl px-2 py-2 text-[0.62rem] tracking-[0.12em] sm:min-h-11 sm:flex-row sm:gap-2 sm:rounded-full sm:px-3 sm:text-[0.72rem] sm:tracking-[0.16em]";
  return (
    <div className={`grid gap-2 ${count === 3 ? "grid-cols-3" : count === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
      {showMessenger && (
        <button type="button" className={`btn-primary ${small}`} onClick={() => open("messenger")}>
          <MessengerIcon className="size-5 shrink-0" />
          Messenger
        </button>
      )}
      {showInstagram && (
        <button type="button" className={`btn-outline ${small}`} onClick={() => open("instagram")}>
          <InstagramIcon className="size-5 shrink-0" />
          Instagram
        </button>
      )}
      <button type="button" className={`btn-rose ${small}`} onClick={() => open("direct")}>
        <MessageCircleHeart className="size-5 shrink-0" strokeWidth={1.5} />
        Direct Ask
      </button>
    </div>
  );
}

/** The DM buttons placed right under the product photo. */
export function PhotoDmButtons() {
  const { product, setInlineVisible } = useActions();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([entry]) => setInlineVisible(entry.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [setInlineVisible]);

  return (
    <div ref={ref} className="mt-3">
      <DmButtons compact={false} />
      <p className="mt-2.5 text-center text-xs text-muted">
        {product.soldOut ? "Sold out, but DM us to ask about restocks" : "Tap to message us about this piece"}
        <span className="text-rose-ink"> ♥</span>
      </p>
    </div>
  );
}

/** Mobile-only sticky bar, shown once the under-photo buttons scroll out of view. */
function StickyDmBar() {
  const { inlineVisible } = useActions();
  return (
    <div
      aria-hidden={inlineVisible}
      inert={inlineVisible}
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur transition-transform duration-300 md:hidden ${
        inlineVisible ? "translate-y-full" : "translate-y-0"
      }`}
    >
      <DmButtons compact />
    </div>
  );
}

/** Size + color pickers for the details column (selection goes into the DM). */
export function VariantPicker() {
  const { product, size, setSize, color, setColor } = useActions();
  return (
    <>
      {product.sizes.length > 0 && (
        <fieldset className="mt-6">
          <legend className="label">
            Size {size && <span className="normal-case tracking-normal text-ink">· {size}</span>}
          </legend>
          <div className="flex flex-wrap gap-2">
            {product.sizes.map((s) => (
              <button key={s} type="button" className="chip min-w-12 justify-center" aria-pressed={size === s} onClick={() => setSize(size === s ? null : s)}>
                {s}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {product.colors.length > 0 && (
        <fieldset className="mt-5">
          <legend className="label">
            Color {color && <span className="normal-case tracking-normal text-ink">· {color}</span>}
          </legend>
          <div className="flex flex-wrap gap-2">
            {product.colors.map((c) => (
              <button key={c} type="button" className="chip" aria-pressed={color === c} onClick={() => setColor(color === c ? null : c)}>
                {c}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      {(product.sizes.length > 0 || product.colors.length > 0) && (
        <p className="mt-3 text-xs text-muted">Your selection is added to your message automatically.</p>
      )}
    </>
  );
}

export function ProductShare({ className = "btn-ghost" }: { className?: string }) {
  const { product } = useActions();
  return <ShareButton product={product} className={className} />;
}

function ShareButton({ product, className }: { product: ActionProduct; className: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        const data = { title: product.name, text: `${product.name} at DMS 💕`, url: product.url };
        if (navigator.share) {
          try {
            await navigator.share(data);
            return;
          } catch (e) {
            if ((e as Error).name === "AbortError") return;
          }
        }
        if (await copyToClipboard(product.url)) {
          setCopied(true);
          toast("Link copied!");
          setTimeout(() => setCopied(false), 2000);
        }
      }}
    >
      {copied ? <Check className="size-4" /> : <Share2 className="size-4" />} Share
    </button>
  );
}

function InquiryModal({
  channel,
  product,
  size,
  color,
  onClose,
}: {
  channel: DmChannel;
  product: ActionProduct;
  size: string | null;
  color: string | null;
  onClose: () => void;
}) {
  const { settings, user } = useShop();
  const toast = useToast();
  const router = useRouter();
  const [message, setMessage] = useState(() =>
    buildInquiryMessage({
      productName: product.name,
      price: product.price,
      size,
      color,
      productUrl: product.url,
      imageUrl: product.image,
    }),
  );
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    // Put the cursor after "My question: " so shoppers can just type.
    const t = textRef.current;
    if (t) {
      t.focus();
      t.setSelectionRange(t.value.length, t.value.length);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const title = channel === "messenger" ? "Messenger" : channel === "instagram" ? "Instagram" : "Direct Ask";

  async function send() {
    if (channel === "messenger") {
      logDmClick(product.id, "messenger");
      const url = messengerUrl(settings.messenger_username!.trim(), message);
      // Copy first as a fallback in case Messenger drops the pre-filled text.
      void copyToClipboard(message);
      toast("Message copied, just paste it if it doesn't appear!");
      window.open(url, "_blank", "noopener");
      onClose();
      return;
    }
    if (channel === "instagram") {
      logDmClick(product.id, "instagram");
      await copyToClipboard(message);
      toast("Inquiry copied! Paste it in our Instagram chat 💌");
      window.open(instagramDmUrl(settings.instagram_username!.trim()), "_blank", "noopener");
      onClose();
      return;
    }
    // Direct Ask
    if (!user) return;
    setSending(true);
    try {
      logDmClick(product.id, "direct");
      const id = await startDirectAsk({
        userId: user.id,
        productId: product.id,
        snapshot: { name: product.name, slug: product.slug, image: product.image, price: product.price, size, color },
        question,
      });
      toast("Sent! We'll reply here soon 💕");
      router.push(`/messages?c=${id}`);
    } catch {
      toast("Couldn't send your message. Please try again.", "error");
      setSending(false);
    }
  }

  const needsLogin = channel === "direct" && !user;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
      <div className="animate-fade-in absolute inset-0 bg-black/45" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="inquiry-title"
        className="animate-slide-up relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-bg shadow-soft sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="inquiry-title" className="text-xl">
            Your Inquiry <span className="text-sm font-normal text-muted">· {title}</span>
          </h2>
          <button onClick={onClose} className="grid size-10 place-items-center rounded-full hover:bg-blush" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          <div className="flex gap-3 rounded-2xl bg-blush/60 p-3">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-blush">
              {product.thumb && <Image src={product.thumb} alt={product.name} fill sizes="80px" className="object-cover" />}
            </div>
            <div className="min-w-0 text-sm">
              <p className="font-serif text-base leading-snug">{product.name}</p>
              <p className="mt-1 font-medium">{product.price ?? <span className="italic text-rose-ink">DM for Price 💌</span>}</p>
              <p className="mt-0.5 text-muted">
                {[size && `Size: ${size}`, color && `Color: ${color}`].filter(Boolean).join(" · ") || "No size/color selected"}
              </p>
            </div>
          </div>

          {needsLogin ? (
            <div className="py-6 text-center">
              <MessageCircleHeart className="mx-auto size-10 text-rose-ink" />
              <p className="mt-3 font-serif text-2xl">Create a free account to chat with us directly</p>
              <p className="mt-2 text-sm text-muted">Get replies right here, with your product inquiries saved in one place.</p>
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Link href={`/register?next=/product/${product.slug}`} className="btn-primary">
                  Create account
                </Link>
                <Link href={`/login?next=/product/${product.slug}`} className="btn-outline">
                  Log in
                </Link>
              </div>
            </div>
          ) : channel === "direct" ? (
            <label className="mt-4 block">
              <span className="label">Your question</span>
              <textarea
                ref={textRef}
                rows={4}
                className="input resize-none"
                placeholder="e.g. Is size S still available? How much is shipping to Cebu?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
              <span className="mt-1.5 block text-xs text-muted">The product card above is sent automatically with your question.</span>
            </label>
          ) : (
            <label className="mt-4 block">
              <span className="label">Message (you can edit this)</span>
              <textarea ref={textRef} rows={7} className="input resize-none font-mono text-[0.8rem] leading-relaxed" value={message} onChange={(e) => setMessage(e.target.value)} />
              <span className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
                <Copy className="size-3" />
                {channel === "instagram"
                  ? "Instagram can't pre-fill messages, so we'll copy this for you to paste."
                  : "We'll also copy this, in case Messenger doesn't fill it in."}
              </span>
            </label>
          )}
        </div>

        {!needsLogin && (
          <div className="border-t border-line px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
            <button type="button" className="btn-primary w-full" onClick={send} disabled={sending}>
              {channel === "messenger" ? (
                <>
                  <MessengerIcon className="size-5" /> Send via Messenger
                </>
              ) : channel === "instagram" ? (
                <>
                  <InstagramIcon className="size-5" /> Send via Instagram
                </>
              ) : (
                <>
                  <Send className="size-4" /> {sending ? "Sending…" : "Send to DMS"}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
