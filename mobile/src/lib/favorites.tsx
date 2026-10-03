import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { qk } from "./api";
import { useAuth } from "./auth";
import { supabase } from "./supabase";

const LOCAL_KEY = "dms.favorites";

type FavoritesState = { ids: string[]; has: (id: string) => boolean; toggle: (id: string) => Promise<boolean> };
const FavoritesContext = createContext<FavoritesState | null>(null);

/**
 * Logged out: favorites live on the phone. Logged in: they sync to the `favorites`
 * table (shared with the website), and phone favorites are merged in after login.
 */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const [local, setLocal] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(LOCAL_KEY).then((v) => setLocal(v ? JSON.parse(v) : []));
  }, []);

  const { data: remote = [] } = useQuery({
    queryKey: qk.favorites(userId ?? "none"),
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase.from("favorites").select("product_id").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => r.product_id as string);
    },
  });

  // Merge phone favorites into the account once signed in.
  useEffect(() => {
    if (!userId || !local.length) return;
    supabase
      .from("favorites")
      .upsert(
        local.map((product_id) => ({ user_id: userId, product_id })),
        { onConflict: "user_id,product_id", ignoreDuplicates: true },
      )
      .then(({ error }) => {
        if (error) return;
        setLocal([]);
        AsyncStorage.removeItem(LOCAL_KEY);
        queryClient.invalidateQueries({ queryKey: qk.favorites(userId) });
      });
  }, [userId, local, queryClient]);

  const ids = userId ? remote : local;

  const toggle = useCallback(
    async (id: string) => {
      const on = !ids.includes(id);
      if (!userId) {
        const next = on ? [id, ...local] : local.filter((x) => x !== id);
        setLocal(next);
        await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(next));
        return on;
      }
      const key = qk.favorites(userId);
      queryClient.setQueryData<string[]>(key, (prev = []) => (on ? [id, ...prev] : prev.filter((x) => x !== id)));
      const { error } = on
        ? await supabase.from("favorites").insert({ user_id: userId, product_id: id })
        : await supabase.from("favorites").delete().eq("user_id", userId).eq("product_id", id);
      if (error && error.code !== "23505") queryClient.invalidateQueries({ queryKey: key });
      return on;
    },
    [ids, userId, local, queryClient],
  );

  const value = useMemo(() => ({ ids, has: (id: string) => ids.includes(id), toggle }), [ids, toggle]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used inside FavoritesProvider");
  return ctx;
}
