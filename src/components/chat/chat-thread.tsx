"use client";

import { Check, CheckCheck, ImagePlus, Loader2, Send, X, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "../toast";
import { notifyPush, uploadImage } from "@/lib/chat";
import { clockTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { Message } from "@/lib/types";
import { imageUrl } from "@/lib/images";

type Props = {
  conversationId: string;
  userId: string;
  /** Admin view: quick replies + "shop" labelling. */
  isAdmin?: boolean;
  quickReplies?: string[];
  header?: React.ReactNode;
};

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" });
}

export function ChatThread({ conversationId, userId, isAdmin = false, quickReplies = [], header }: Props) {
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [text, setText] = useState("");
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const markRead = useCallback(() => {
    createClient().rpc("mark_conversation_read", { p_conversation: conversationId }).then(() => {});
  }, [conversationId]);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at")
      .then(({ data }) => {
        if (active) setMessages((data ?? []) as Message[]);
      });
    markRead();

    const channel = supabase
      .channel(`thread-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => (prev && !prev.some((x) => x.id === m.id) ? [...prev, m] : prev));
          if (m.sender_id !== userId) markRead();
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => prev?.map((x) => (x.id === m.id ? m : x)) ?? prev);
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId, markRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages?.length]);

  useEffect(() => {
    if (!pendingImage) return;
    const url = URL.createObjectURL(pendingImage);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- object URL lifecycle tied to the file
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingImage]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const body = text.trim();
    if ((!body && !pendingImage) || sending) return;
    setSending(true);
    try {
      let image_key: string | null = null;
      if (pendingImage) image_key = await uploadImage("chat", pendingImage, 1400);
      const { data, error } = await createClient()
        .from("messages")
        .insert({ conversation_id: conversationId, sender_id: userId, body: body || null, image_key })
        .select()
        .single();
      if (error) throw error;
      setMessages((prev) => (prev && !prev.some((x) => x.id === data.id) ? [...prev, data as Message] : prev));
      setText("");
      setPendingImage(null);
      setPreviewUrl(null);
      notifyPush(conversationId);
    } catch (err) {
      toast(err instanceof Error && err.message ? err.message : "Message didn't send. Please try again.", "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {header}

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5" aria-live="polite">
        {messages === null ? (
          <div className="space-y-3">
            {[60, 40, 70].map((w, i) => (
              <div key={i} className={`skeleton h-12 rounded-2xl ${i % 2 ? "ml-auto" : ""}`} style={{ width: `${w}%` }} />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">Say hi! 👋 We usually reply within a few hours.</p>
        ) : (
          <ol className="space-y-2">
            {messages.map((m, i) => {
              const mine = m.sender_id === userId;
              const prev = messages[i - 1];
              const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
              return (
                <Fragment key={m.id}>
                  {newDay && (
                    <li className="py-2 text-center text-[0.7rem] uppercase tracking-wider text-muted">{dayLabel(m.created_at)}</li>
                  )}
                  <li className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                    {m.product_snapshot && <ProductCardBubble snap={m.product_snapshot} mine={mine} />}
                    {m.image_key && (
                      <a href={imageUrl(m.image_key)!} target="_blank" rel="noopener noreferrer" className="mt-1 block overflow-hidden rounded-2xl">
                        <Image
                          src={imageUrl(m.image_key)!}
                          alt="Photo sent in chat"
                          width={240}
                          height={240}
                          unoptimized
                          className="max-h-64 w-auto max-w-[70vw] object-cover sm:max-w-60"
                        />
                      </a>
                    )}
                    {m.body && (
                      <p
                        className={`mt-1 max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm sm:max-w-[70%] ${
                          mine ? "rounded-br-md bg-ink text-on-ink" : "rounded-bl-md border border-line bg-surface"
                        }`}
                      >
                        {m.body}
                      </p>
                    )}
                    <span className="mt-0.5 flex items-center gap-1 px-1 text-[0.65rem] text-muted">
                      {clockTime(m.created_at)}
                      {mine &&
                        (m.read_at ? (
                          <>
                            <CheckCheck className="size-3.5 text-rose-ink" aria-hidden="true" />
                            <span className="sr-only">Seen</span>
                          </>
                        ) : (
                          <>
                            <Check className="size-3.5" aria-hidden="true" />
                            <span className="sr-only">Sent</span>
                          </>
                        ))}
                    </span>
                  </li>
                </Fragment>
              );
            })}
          </ol>
        )}
        <div ref={bottomRef} />
      </div>

      {isAdmin && showQuick && quickReplies.length > 0 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto border-t border-line px-3 py-2">
          {quickReplies.map((q) => (
            <button
              key={q}
              type="button"
              className="chip shrink-0 text-xs"
              onClick={() => {
                setText((t) => (t ? `${t} ${q}` : q));
                setShowQuick(false);
              }}
            >
              {q.length > 40 ? `${q.slice(0, 40)}…` : q}
            </button>
          ))}
        </div>
      )}

      {previewUrl && (
        <div className="flex items-center gap-2 border-t border-line px-3 py-2">
          <div className="relative size-16 overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
            <img src={previewUrl} alt="Photo to send" className="size-full object-cover" />
          </div>
          <button
            type="button"
            className="btn-ghost min-h-9 px-3 text-xs"
            onClick={() => {
              setPendingImage(null);
              setPreviewUrl(null);
            }}
          >
            <X className="size-4" /> Remove
          </button>
        </div>
      )}

      <form onSubmit={send} className="flex items-end gap-2 border-t border-line bg-surface px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setPendingImage(f);
            e.target.value = "";
          }}
        />
        <button type="button" className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-blush" aria-label="Attach a photo" onClick={() => fileRef.current?.click()}>
          <ImagePlus className="size-5" />
        </button>
        {isAdmin && quickReplies.length > 0 && (
          <button
            type="button"
            className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-blush"
            aria-label="Quick replies"
            aria-expanded={showQuick}
            onClick={() => setShowQuick((s) => !s)}
          >
            <Zap className="size-5 text-gold-ink" />
          </button>
        )}
        <label className="min-w-0 flex-1">
          <span className="sr-only">Message</span>
          <textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !("ontouchstart" in window)) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Type a message…"
            className="input max-h-36 min-h-11 resize-none rounded-3xl py-2.5 [field-sizing:content]"
          />
        </label>
        <button className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-on-ink disabled:opacity-50" aria-label="Send" disabled={sending || (!text.trim() && !pendingImage)}>
          {sending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-4" />}
        </button>
      </form>
    </div>
  );
}

function ProductCardBubble({ snap, mine }: { snap: NonNullable<Message["product_snapshot"]>; mine: boolean }) {
  return (
    <Link
      href={`/product/${snap.slug}`}
      className={`flex w-64 max-w-[85%] gap-3 rounded-2xl border p-2.5 transition hover:border-rose ${mine ? "border-ink/20 bg-blush" : "border-line bg-surface"}`}
    >
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-blush">
        {snap.image && <Image src={snap.image} alt={snap.name} fill sizes="64px" unoptimized className="object-cover" />}
      </div>
      <div className="min-w-0 text-xs">
        <p className="text-[0.6rem] uppercase tracking-wider text-gold-ink">Product inquiry</p>
        <p className="line-clamp-2 font-serif text-sm leading-tight">{snap.name}</p>
        <p className="mt-0.5 font-medium">{snap.price ?? "DM for Price"}</p>
        {(snap.size || snap.color) && <p className="text-muted">{[snap.size && `Size ${snap.size}`, snap.color].filter(Boolean).join(" · ")}</p>}
      </div>
    </Link>
  );
}
