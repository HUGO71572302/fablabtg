"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share, WifiOff, X } from "lucide-react";
import Image from "next/image";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const DISMISS_KEY = "hf_install_dismissed_at";
const subscribeOnline = (callback: () => void) => {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
};
const getOnlineSnapshot = () => navigator.onLine;
const getServerOnlineSnapshot = () => true;

/** Enregistre le service worker et affiche une bannière « Installer l'application » (Android/Chrome, iOS Safari). */
export function PwaSetup() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [offlineNoticeVisible, setOfflineNoticeVisible] = useState(false);
  const ios = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
  const offline = !useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getServerOnlineSnapshot);

  useEffect(() => {
    if (!offline) {
      setOfflineNoticeVisible(false);
      return;
    }

    setOfflineNoticeVisible(true);
    const timeout = window.setTimeout(() => setOfflineNoticeVisible(false), 7000);
    return () => window.clearTimeout(timeout);
  }, [offline]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
        console.error("Impossible d’enregistrer le service worker HUGO FABLAB.", error);
      });
    }
  }, []);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    const recentlyDismissed = Date.now() - dismissedAt < 7 * 86400000;

    if (ios && !recentlyDismissed) {
      const t = setTimeout(() => setVisible(true), 2500);
      return () => clearTimeout(t);
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      if (!recentlyDismissed) setVisible(true);
    };
    const onInstalled = () => setVisible(false);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, [ios]);

  if (!visible && !offline) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  return (
    <>
      {offline && offlineNoticeVisible && (
        <div role="status" className="fixed inset-x-3 top-3 z-50 mx-auto flex max-w-xl items-start gap-2 rounded-2xl border border-amber-500/40 bg-card px-3 py-2.5 shadow-xl">
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p className="flex-1 text-sm leading-5">
            <span className="font-semibold">Hors connexion.</span>{" "}
            Les données peuvent être anciennes. Les réservations et pointages en attente seront vérifiés au retour d’Internet.
          </p>
          <button type="button" onClick={() => setOfflineNoticeVisible(false)} aria-label="Fermer le message hors connexion" className="-mr-1 -mt-1 rounded-lg p-1 text-muted-foreground hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {visible && (
        <div className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-md rounded-2xl border border-border bg-card p-4 shadow-2xl lg:bottom-6 lg:right-6 lg:left-auto">
          <div className="flex items-start gap-3">
            <Image src="/icons/icon-192.png" alt="" width={48} height={48} className="h-12 w-12 rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Installer HUGO FABLAB</p>
              {ios ? (
                <p className="text-sm text-muted-foreground">
                  Sur iPhone : touchez <Share className="inline h-3.5 w-3.5" /> <b>Partager</b> puis <b>« Sur l&apos;écran d&apos;accueil »</b>.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Ajoutez l&apos;application à votre écran d&apos;accueil : accès rapide, plein écran, notifications de réservation.</p>
              )}
              <div className="mt-3 flex gap-2">
                {!ios && deferred && (
                  <button
                    type="button"
                    onClick={async () => {
                      await deferred.prompt();
                      const { outcome } = await deferred.userChoice;
                      if (outcome === "accepted") setVisible(false);
                      setDeferred(null);
                    }}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-togo-green px-3 text-base font-medium text-white"
                  >
                    <Download className="h-4 w-4" /> Installer
                  </button>
                )}
                <button type="button" onClick={dismiss} className="h-9 rounded-xl px-3 text-base text-muted-foreground hover:bg-muted">
                  Plus tard
                </button>
              </div>
            </div>
            <button type="button" onClick={dismiss} aria-label="Fermer" className="rounded-lg p-1 text-muted-foreground hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
