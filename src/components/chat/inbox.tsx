"use client";

import { Archive, ArrowLeft, CheckCircle2, MapPin, MessageCircleHeart, Phone, RotateCcw } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChatThread } from "./chat-thread";
import { useToast } from "../toast";
import { timeAgo } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import type { Conversation, ConversationStatus } from "@/lib/types";

type Props = {
  userId: string;
  mode: "shopper" | "admin";
  quickReplies?: string[];
  headerSlot?: React.ReactNode;
};

const TABS: { key: ConversationStatus; label: string }[] = [
  { key: "open", label: "Open" },
  { key: "resolved", label: "Resolved" },
  { key: "archived", label: "Archived" },
];

export function Inbox({ userId, mode, quickReplies, headerSlot }: Props) {
  const isAdmin = mode === "admin";
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const selectedId = params.get("c");
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [tab, setTab] = useState<ConversationStatus>("open");

  const load = useCallback(async () => {
    const supabase = createClient();
    let q = supabase
      .from("conversations")
      .select(isAdmin ? "*, shopper:profiles(full_name, phone, address)" : "*")
      .order("last_message_at", { ascending: false });
    if (!isAdmin) q = q.eq("shopper_id", userId);
    const { data } = await q;
    setConversations((data ?? []) as unknown as Conversation[]);
  }, [isAdmin, userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load, then realtime updates
    load();
    const supabase = createClient();
    const channel = supabase
      .channel(`inbox-${mode}-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          ...(isAdmin ? {} : { filter: `shopper_id=eq.${userId}` }),
        },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, mode, userId, isAdmin]);

  const visible = useMemo(() => {
    if (!conversations) return null;
    const list = isAdmin ? conversations.filter((c) => c.status === tab) : conversations.filter((c) => c.status !== "archived");
    // Unread first, then most recent.
    const unread = (c: Conversation) => (isAdmin ? c.unread_admin : c.unread_shopper);
    return [...list].sort((a, b) => Number(unread(b) > 0) - Number(unread(a) > 0) || b.last_message_at.localeCompare(a.last_message_at));
  }, [conversations, tab, isAdmin]);

  // Shoppers usually have a single thread: open it automatically on desktop.
  useEffect(() => {
    if (!selectedId && !isAdmin && visible?.length && window.matchMedia("(min-width: 768px)").matches) {
      router.replace(`${pathname}?c=${visible[0].id}`);
    }
  }, [selectedId, isAdmin, visible, router, pathname]);

  const selected = conversations?.find((c) => c.id === selectedId) ?? null;

  async function setStatus(status: ConversationStatus) {
    if (!selected) return;
    const { error } = await createClient().from("conversations").update({ status }).eq("id", selected.id);
    if (error) toast("Couldn't update the conversation.", "error");
    else {
      toast(status === "open" ? "Reopened" : status === "resolved" ? "Marked as resolved ✓" : "Archived");
      load();
    }
  }

  const name = (c: Conversation) => (isAdmin ? c.shopper?.full_name || "Shopper" : "DMS Shop");

  const list = (
    <div className="flex h-full min-h-0 flex-col">
      {isAdmin && (
        <div className="flex gap-1 border-b border-line p-2" role="tablist">
          {TABS.map((t) => {
            const count = conversations?.filter((c) => c.status === t.key && c.unread_admin > 0).length ?? 0;
            return (
              <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className="chip flex-1 justify-center text-xs aria-selected:border-ink aria-selected:bg-ink aria-selected:text-on-ink">
                {t.label}
                {count > 0 && <span className="ml-1.5 rounded-full bg-rose-ink px-1.5 text-[0.6rem] text-on-ink">{count}</span>}
              </button>
            );
          })}
        </div>
      )}
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {visible === null ? (
          Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="flex gap-3 p-4">
              <div className="skeleton size-11 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-3 w-1/2 rounded" />
                <div className="skeleton h-3 w-3/4 rounded" />
              </div>
            </li>
          ))
        ) : visible.length === 0 ? (
          <li className="px-6 py-14 text-center text-sm text-muted">
            {isAdmin ? (
              "No conversations here."
            ) : (
              <>
                <MessageCircleHeart className="mx-auto mb-3 size-10 text-rose-ink" />
                <p className="font-serif text-xl text-ink">No messages yet</p>
                <p className="mt-1">Open any product and tap <b>Direct Ask</b> to chat with us.</p>
                <Link href="/shop" className="btn-outline mt-5">
                  Browse products
                </Link>
              </>
            )}
          </li>
        ) : (
          visible.map((c) => {
            const unread = isAdmin ? c.unread_admin : c.unread_shopper;
            return (
              <li key={c.id}>
                <Link
                  href={`${pathname}?c=${c.id}`}
                  scroll={false}
                  aria-current={c.id === selectedId}
                  className={`flex gap-3 border-b border-line/60 p-4 transition hover:bg-blush/50 ${c.id === selectedId ? "bg-blush/70" : ""}`}
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-blush font-serif text-lg text-rose-ink">
                    {name(c).charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`truncate ${unread ? "font-semibold" : ""}`}>{name(c)}</span>
                      <span className="shrink-0 text-[0.7rem] text-muted">{timeAgo(c.last_message_at)}</span>
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className={`truncate text-sm ${unread ? "text-ink" : "text-muted"}`}>{c.last_message ?? "New conversation"}</span>
                      {unread > 0 && (
                        <span className="grid min-w-5 shrink-0 place-items-center rounded-full bg-rose-ink px-1.5 text-[0.65rem] font-semibold leading-5 text-on-ink">
                          {unread}
                          <span className="sr-only"> unread</span>
                        </span>
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );

  const threadHeader = selected && (
    <div className="flex items-center gap-2 border-b border-line px-2 py-2 sm:px-4">
      <Link href={pathname} scroll={false} className="grid size-11 place-items-center rounded-full hover:bg-blush md:hidden" aria-label="Back to conversations">
        <ArrowLeft className="size-5" />
      </Link>
      <div className="min-w-0 flex-1">
        <p className="truncate font-serif text-lg leading-tight">{name(selected)}</p>
        {isAdmin && selected.shopper && (selected.shopper.phone || selected.shopper.address) ? (
          <p className="flex flex-wrap gap-x-3 text-xs text-muted">
            {selected.shopper.phone && (
              <a href={`tel:${selected.shopper.phone}`} className="inline-flex items-center gap-1 hover:text-rose-ink">
                <Phone className="size-3" /> {selected.shopper.phone}
              </a>
            )}
            {selected.shopper.address && (
              <span className="inline-flex min-w-0 items-center gap-1">
                <MapPin className="size-3 shrink-0" /> <span className="truncate">{selected.shopper.address}</span>
              </span>
            )}
          </p>
        ) : (
          <p className="text-xs text-muted">{isAdmin ? `Status: ${selected.status}` : "We usually reply within a few hours"}</p>
        )}
      </div>
      {isAdmin && (
        <div className="flex shrink-0 gap-1">
          {selected.status !== "open" ? (
            <button className="btn-ghost min-h-10 px-3 text-xs" onClick={() => setStatus("open")}>
              <RotateCcw className="size-4" /> <span className="hidden sm:inline">Reopen</span>
            </button>
          ) : (
            <button className="btn-ghost min-h-10 px-3 text-xs" onClick={() => setStatus("resolved")}>
              <CheckCircle2 className="size-4" /> <span className="hidden sm:inline">Resolve</span>
            </button>
          )}
          {selected.status !== "archived" && (
            <button className="btn-ghost min-h-10 px-3 text-xs" onClick={() => setStatus("archived")}>
              <Archive className="size-4" /> <span className="hidden sm:inline">Archive</span>
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="card grid h-[calc(100dvh-9rem)] min-h-[28rem] overflow-hidden md:grid-cols-[20rem_1fr]">
      <div className={`min-h-0 border-line md:border-r ${selected ? "hidden md:block" : ""}`}>
        {headerSlot}
        {list}
      </div>
      <div className={`min-h-0 ${selected ? "" : "hidden md:grid md:place-items-center"}`}>
        {selected ? (
          <ChatThread key={selected.id} conversationId={selected.id} userId={userId} isAdmin={isAdmin} quickReplies={quickReplies} header={threadHeader} />
        ) : (
          <p className="text-sm text-muted">Select a conversation</p>
        )}
      </div>
    </div>
  );
}
