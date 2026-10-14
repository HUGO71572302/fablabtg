"use client";

import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const DISMISS_KEY = "hf_install_dismissed_at";

/** Enregistre le service worker et affiche une bannière « Installer l'application » (Android/Chrome, iOS Safari). */
export function PwaSetup() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    const recentlyDismissed = Date.now() - dismissedAt < 7 * 86400000;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
    if (isIos && !recentlyDismissed) {
      setIos(true);
      const t = setTimeout(() => setVisible(true), 2500);
      return () => clearTimeout(t);
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      if (!recentlyDismissed) setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setVisible(false));
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  return (
    <div className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-md rounded-2xl border border-border bg-card p-4 shadow-2xl lg:bottom-6 lg:right-6 lg:left-auto">
      <div className="flex items-start gap-3">
        <img src="/icons/icon-192.png" alt="" className="h-12 w-12 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Installer HUGO FABLAB</p>
          {ios ? (
            <p className="text-sm text-muted-foreground">
              Sur iPhone : touchez <Share className="inline h-3.5 w-3.5" /> <b>Partager</b> puis <b>« Sur l'écran d'accueil »</b>.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Ajoutez l'application à votre écran d'accueil : accès rapide, plein écran, notifications de réservation.</p>
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
  );
}
