"use client";

import { Bell, BellOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "../toast";
import { disablePush, enablePush, getPushSubscription, pushSupported } from "@/lib/push";

/** Opt-in for push notifications when the shop (or a shopper) replies. */
export function PushToggle({ userId, className = "btn-outline" }: { userId: string; className?: string }) {
  const toast = useToast();
  const [state, setState] = useState<"unsupported" | "on" | "off" | "loading">("loading");

  useEffect(() => {
    if (!pushSupported()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser capability check
      setState("unsupported");
      return;
    }
    getPushSubscription().then((s) => setState(s ? "on" : "off"));
  }, []);

  if (state === "unsupported" || state === "loading") return null;

  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          if (state === "on") {
            await disablePush();
            setState("off");
            toast("Notifications turned off");
          } else {
            setState("loading");
            await enablePush(userId);
            setState("on");
            toast("Notifications on! We'll ping you when we reply 💌");
          }
        } catch (e) {
          setState("off");
          toast((e as Error).message, "error");
        }
      }}
    >
      {state === "on" ? <BellOff className="size-4" /> : <Bell className="size-4" />}
      {state === "on" ? "Turn off notifications" : "Notify me of replies"}
    </button>
  );
}
