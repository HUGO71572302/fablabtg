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
  const opts = { description: n.message, icon: <span className="text-lg">{meta.emoji}</span> };
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

/**
 * Écoute les notifications en temps réel via Server-Sent Events.
 * En cas d'échec du flux (proxy, réseau), bascule automatiquement sur un polling léger.
 */
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
    let es: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let errors = 0;
    let stopped = false;

    const handle = (n: Incoming) => {
      if (n.id <= lastIdRef.current) return;
      lastIdRef.current = n.id;
      showNotificationToast(n);
      playNotificationSound(n.type);
      router.refresh();
    };

    const startPolling = () => {
      if (pollTimer) return;
      pollTimer = setInterval(async () => {
        try {
          const res = await fetch(`/api/notifications?after=${lastIdRef.current}`, { cache: "no-store" });
          if (!res.ok) return;
          const data = (await res.json()) as { items: Incoming[] };
          data.items.forEach(handle);
        } catch {
          /* réseau indisponible : on réessaiera */
        }
      }, 4000);
    };

    const connect = () => {
      if (stopped) return;
      try {
        es = new EventSource(`/api/notifications/stream?after=${lastIdRef.current}`);
        es.onmessage = (ev) => {
          errors = 0;
          try {
            handle(JSON.parse(ev.data) as Incoming);
          } catch {
            /* ignore */
          }
        };
        es.onerror = () => {
          errors += 1;
          if (errors >= 2) {
            es?.close();
            es = null;
            startPolling();
          }
        };
      } catch {
        startPolling();
      }
    };

    connect();
    return () => {
      stopped = true;
      es?.close();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [router]);

  return null;
}
