"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { NotificationType } from "@/db/schema";
import { NOTIF_META } from "@/lib/labels";
import { playNotificationSound, unlockAudio } from "@/lib/sound";

type Incoming = { id: number; type: NotificationType; title: string; message: string };

export function showNotificationToast(n: Incoming) {
  const meta = NOTIF_META[n.type] ?? NOTIF_META.info;
  const opts = { description: n.message, icon: <span className="text-lg">{meta.emoji}</span>, duration: 8500 };
  switch (meta.tone) {
    case "success":
      toast.success(n.title, opts);
      break;
    case "error":
      toast.error(n.title, opts);
      break;
    case "warning":
      toast.warning(n.title, opts);
      break;
    case "info":
      toast.info(n.title, opts);
      break;
    default:
      toast(n.title, opts);
  }
}

/** Vérifie régulièrement les nouvelles notifications sans garder de requête ouverte. */
export function NotificationListener({ initialLastId }: { initialLastId: number }) {
  const router = useRouter();
  const lastIdRef = useRef(initialLastId);

  // Déverrouille l'audio au premier geste (exigence des navigateurs), puis retire les écouteurs.
  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      ["pointerdown", "keydown", "touchstart"].forEach((ev) => window.removeEventListener(ev, unlock));
    };
    ["pointerdown", "keydown", "touchstart"].forEach((ev) => window.addEventListener(ev, unlock, { passive: true }));
    return () => ["pointerdown", "keydown", "touchstart"].forEach((ev) => window.removeEventListener(ev, unlock));
  }, []);

  useEffect(() => {
    let stopped = false;
    let checking = false;

    const handle = (n: Incoming) => {
      if (n.id <= lastIdRef.current) return false;
      lastIdRef.current = n.id;
      showNotificationToast(n);
      playNotificationSound(n.type);
      return true;
    };

    const checkForNotifications = async () => {
      if (stopped || checking || document.visibilityState !== "visible") return;
      checking = true;
      try {
        const res = await fetch(`/api/notifications?after=${lastIdRef.current}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { items: Incoming[] };
        if (stopped) return;
        let receivedNewNotification = false;
        data.items.forEach((item) => {
          receivedNewNotification = handle(item) || receivedNewNotification;
        });
        if (receivedNewNotification) router.refresh();
      } catch {
        /* réseau indisponible : le prochain contrôle réessaiera */
      } finally {
        checking = false;
      }
    };

    const interval = window.setInterval(checkForNotifications, 3000);
    document.addEventListener("visibilitychange", checkForNotifications);
    void checkForNotifications();
    return () => {
      stopped = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", checkForNotifications);
    };
  }, [router]);

  return null;
}
