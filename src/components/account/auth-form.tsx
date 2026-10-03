"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useToast } from "../toast";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h6a5.1 5.1 0 0 1-2.2 3.4v2.8h3.6c2-1.9 3.2-4.7 3.2-8.2Z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.4-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.7H2v2.9A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.7 13.9a6.6 6.6 0 0 1 0-4.2V6.8H2a11 11 0 0 0 0 9.9l3.7-2.8Z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2 6.8l3.7 2.9C6.6 7.1 9.1 5.4 12 5.4Z" />
    </svg>
  );
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(params.get("error"));
  const [checkEmail, setCheckEmail] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      setError("Demo mode: accounts work once Supabase is connected (see README).");
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message === "Invalid login credentials" ? "Wrong email or password." : error.message);
        setBusy(false);
        return;
      }
      toast("Welcome back 💕");
      router.replace(next);
      router.refresh();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
      return;
    }
    if (!data.session) {
      // Email confirmation is on in Supabase.
      setCheckEmail(true);
      setBusy(false);
      return;
    }
    toast("Welcome to DMS 💕");
    router.replace(next);
    router.refresh();
  }

  async function google() {
    setError(null);
    if (!isSupabaseConfigured) {
      setError("Demo mode: accounts work once Supabase is connected (see README).");
      return;
    }
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) setError(error.message);
  }

  if (checkEmail) {
    return (
      <div className="text-center">
        <p className="font-serif text-2xl">Check your inbox 💌</p>
        <p className="mt-2 text-sm text-muted">
          We sent a confirmation link to <b>{email}</b>. Tap it to finish creating your account.
        </p>
      </div>
    );
  }

  const otherHref = `${mode === "login" ? "/register" : "/login"}?next=${encodeURIComponent(next)}`;

  return (
    <div>
      <button type="button" onClick={google} className="btn-outline w-full">
        <GoogleIcon /> Continue with Google
      </button>
      <div className="my-5 flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        {mode === "register" && (
          <label className="block">
            <span className="label">Name</span>
            <input className="input" required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
        )}
        <label className="block">
          <span className="label">Email</span>
          <input className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Password</span>
          <input
            className="input"
            type="password"
            required
            minLength={6}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" className="rounded-xl bg-blush px-3 py-2 text-sm text-rose-ink">
            {error}
          </p>
        )}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        {mode === "login" ? "New to DMS? " : "Already have an account? "}
        <Link href={otherHref} className="font-medium text-rose-ink hover:underline">
          {mode === "login" ? "Create a free account" : "Log in"}
        </Link>
      </p>
    </div>
  );
}
