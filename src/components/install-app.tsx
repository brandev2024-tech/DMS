"use client";

import { Download, Share, X } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Captured globally so any Install button can use it, whenever it mounts.
let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    listeners.forEach((l) => l());
  });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function useInstallState() {
  const canPrompt = useSyncExternalStore(
    subscribe,
    () => deferred !== null,
    () => false,
  );
  const [env, setEnv] = useState({ ios: false, standalone: false });
  useEffect(() => {
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) || (ua.includes("Mac") && navigator.maxTouchPoints > 1);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser-only state after mount
    setEnv({ ios, standalone });
  }, []);
  return { canPrompt, ...env };
}

function IosSteps({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Install DMS on iPhone"
        className="card animate-slide-up w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-xl">Install DMS on your iPhone</h2>
          <button onClick={onClose} className="btn-ghost -mr-3 -mt-2 px-3" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <ol className="mt-4 space-y-3 text-sm">
          <li className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-blush text-xs font-semibold">1</span>
            Tap <Share className="size-4 text-[#007AFF]" aria-label="Share" /> <b>Share</b> in Safari
          </li>
          <li className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-blush text-xs font-semibold">2</span>
            Choose <b>Add to Home Screen</b>
          </li>
          <li className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-full bg-blush text-xs font-semibold">3</span>
            Tap <b>Add</b>. That&apos;s it! 💕
          </li>
        </ol>
      </div>
    </div>
  );
}

/** "Install DMS App" button: native prompt on Android/desktop, instructions on iPhone. */
export function InstallAppButton({ className = "btn-outline" }: { className?: string }) {
  const { canPrompt, ios, standalone } = useInstallState();
  const [showIos, setShowIos] = useState(false);

  if (standalone || (!canPrompt && !ios)) return null;

  return (
    <>
      <button
        className={className}
        onClick={async () => {
          if (deferred) {
            await deferred.prompt();
            await deferred.userChoice;
            deferred = null;
            listeners.forEach((l) => l());
          } else {
            setShowIos(true);
          }
        }}
      >
        <Download className="size-4" /> Install DMS App
      </button>
      {showIos && <IosSteps onClose={() => setShowIos(false)} />}
    </>
  );
}

const DISMISS_KEY = "dms:install-dismissed";

/** Small dismissible banner shown once to mobile visitors who can install. */
export function InstallBanner() {
  const { canPrompt, ios, standalone } = useInstallState();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is browser-only
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed || standalone || (!canPrompt && !ios)) return null;

  return (
    <div className="animate-fade-in border-b border-line bg-blush/70">
      <div className="container-page flex items-center gap-3 py-2 text-sm">
        <span className="flex-1">Get the DMS app for faster shopping 💌</span>
        <InstallAppButton className="btn-primary min-h-9 px-4 text-xs" />
        <button
          aria-label="Dismiss install banner"
          className="grid size-9 place-items-center rounded-full hover:bg-surface"
          onClick={() => {
            setDismissed(true);
            try {
              localStorage.setItem(DISMISS_KEY, "1");
            } catch {}
          }}
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
