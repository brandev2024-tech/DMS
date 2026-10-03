import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { qk } from "./api";
import { supabase } from "./supabase";
import type { Profile } from "./types";

WebBrowser.maybeCompleteAuthSession();

type Mode = "shop" | "admin";

type AuthState = {
  ready: boolean;
  session: Session | null;
  userId: string | null;
  email: string | null;
  profile: Profile | null;
  isAdmin: boolean;
  mode: Mode;
  setMode: (m: Mode) => void;
  refreshProfile: () => void;
};

const AuthContext = createContext<AuthState | null>(null);
const MODE_KEY = "dms.mode";

/** Deep link the auth emails and Google sign-in return to (dms://… or exp://…/--/… in Expo Go). */
export const authRedirect = (path: string) => Linking.createURL(path);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [modePref, setModePref] = useState<Mode | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    AsyncStorage.getItem(MODE_KEY).then((m) => setModePref(m === "shop" || m === "admin" ? m : null));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;
  const { data: profile = null, refetch } = useQuery({
    queryKey: qk.profile(userId ?? "none"),
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId!).maybeSingle();
      return (data as Profile | null) ?? null;
    },
  });

  // Signed out: drop everything that belonged to the previous user.
  useEffect(() => {
    if (ready && !userId) {
      queryClient.removeQueries({ queryKey: ["favorites"] });
      queryClient.removeQueries({ queryKey: ["conversations"] });
      queryClient.removeQueries({ queryKey: ["messages"] });
      queryClient.removeQueries({ queryKey: qk.admin });
    }
  }, [ready, userId, queryClient]);

  const isAdmin = profile?.role === "admin";
  // Admins land in admin mode unless they switched to the shop themselves.
  const mode: Mode = isAdmin ? (modePref ?? "admin") : "shop";
  const setMode = useCallback((m: Mode) => {
    setModePref(m);
    AsyncStorage.setItem(MODE_KEY, m);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      ready,
      session,
      userId,
      email: session?.user.email ?? null,
      profile,
      isAdmin,
      mode,
      setMode,
      refreshProfile: () => void refetch(),
    }),
    [ready, session, userId, profile, isAdmin, mode, setMode, refetch],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// Sign-in methods
// ---------------------------------------------------------------------------

export async function signInWithPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
}

/** Returns true when the account needs email confirmation before it can sign in. */
export async function signUp(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { full_name: fullName.trim() }, emailRedirectTo: authRedirect("auth-callback") },
  });
  if (error) throw error;
  return !data.session;
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: authRedirect("reset-password") });
  if (error) throw error;
}

/** Turns the ?code=… from an email / OAuth deep link into a session (PKCE). */
export async function exchangeCode(code: string) {
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    // The same link can arrive twice (browser session + app link): fine if we're signed in.
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw error;
  }
  return true;
}

export async function exchangeCodeFromUrl(url: string) {
  const { queryParams } = Linking.parse(url);
  if (queryParams?.error_description) throw new Error(String(queryParams.error_description));
  return typeof queryParams?.code === "string" ? exchangeCode(queryParams.code) : false;
}

export async function signInWithGoogle() {
  const redirectTo = authRedirect("auth-callback");
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;
  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (res.type !== "success") return false;
  return exchangeCodeFromUrl(res.url);
}

/** Native Sign in with Apple (iOS only), exchanged for a Supabase session. */
export async function signInWithApple() {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [AppleAuthentication.AppleAuthenticationScope.FULL_NAME, AppleAuthentication.AppleAuthenticationScope.EMAIL],
    nonce: hashedNonce,
  });
  if (!credential.identityToken) throw new Error("Apple did not return a sign-in token.");
  const { data, error } = await supabase.auth.signInWithIdToken({ provider: "apple", token: credential.identityToken, nonce: rawNonce });
  if (error) throw error;
  // Apple only shares the name on the very first sign-in: keep it.
  const name = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(" ");
  if (name && data.user) await supabase.from("profiles").update({ full_name: name }).eq("id", data.user.id);
}
