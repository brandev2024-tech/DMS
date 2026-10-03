import { useQuery } from "@tanstack/react-query";
import { DEFAULT_SETTINGS, fetchCategories, fetchSettings, qk } from "./api";
import { useAuth } from "./auth";
import { supabase } from "./supabase";

export function useSettings() {
  const { data } = useQuery({ queryKey: qk.settings, queryFn: fetchSettings, staleTime: 5 * 60_000 });
  return data ?? DEFAULT_SETTINGS;
}

export function useCategories() {
  return useQuery({ queryKey: qk.categories, queryFn: fetchCategories, staleTime: 5 * 60_000 });
}

/** Unread Direct Ask count for the tab badge (shopper: replies; admin: new messages). */
export function useUnreadCount(scope: "mine" | "all") {
  const { userId } = useAuth();
  const { data = 0 } = useQuery({
    queryKey: [...qk.conversations(scope), "unread", userId],
    enabled: Boolean(userId),
    refetchInterval: 60_000,
    queryFn: async () => {
      let q = supabase.from("conversations").select(scope === "all" ? "unread_admin" : "unread_shopper");
      if (scope === "mine") q = q.eq("shopper_id", userId!);
      const { data } = await q;
      const rows = (data ?? []) as unknown as Record<string, number>[];
      return rows.reduce((n, r) => n + (scope === "all" ? r.unread_admin : r.unread_shopper), 0);
    },
  });
  return data;
}
