"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useShop } from "./shop-context";
import { useToast } from "./toast";
import { createClient } from "@/lib/supabase/client";

/** Live count of unread shop replies across the shopper's conversations. */
export function useShopperUnread() {
  const { user } = useShop();
  const [count, setCount] = useState(0);
  const pathname = usePathname();
  const toast = useToast();

  useEffect(() => {
    if (!user || user.isAdmin) return;
    const supabase = createClient();
    let last = -1;

    const load = async () => {
      const { data } = await supabase.from("conversations").select("unread_shopper").eq("shopper_id", user.id);
      const total = (data ?? []).reduce((n, c) => n + (c.unread_shopper as number), 0);
      if (last >= 0 && total > last && !location.pathname.startsWith("/messages")) {
        toast("New reply from DMS 💌", "info");
      }
      last = total;
      setCount(total);
    };
    load();

    const channel = supabase
      .channel(`unread-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations", filter: `shopper_id=eq.${user.id}` },
        load,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast, pathname]);

  return count;
}

export function UnreadDot({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span className="absolute -right-1 -top-1 grid min-w-[1.1rem] place-items-center rounded-full bg-rose-ink px-1 text-[0.65rem] font-semibold leading-[1.1rem] text-on-ink">
      {count > 9 ? "9+" : count}
      <span className="sr-only"> unread messages</span>
    </span>
  );
}
