"use client";

import { useEffect, useState } from "react";
import { Settings2, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { playNotificationSound, setSoundEnabled, soundEnabled, unlockAudio } from "@/lib/sound";

/** Commandes rapides : marche/arrêt + accès aux réglages détaillés par événement. */
export function SoundToggle() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    setOn(soundEnabled());
    const h = (e: Event) => setOn((e as CustomEvent<boolean>).detail);
    const storage = (e: StorageEvent) => { if (e.key?.startsWith("hf_sound_")) setOn(soundEnabled()); };
    window.addEventListener("hf-sound-pref", h);
    window.addEventListener("storage", storage);
    return () => { window.removeEventListener("hf-sound-pref", h); window.removeEventListener("storage", storage); };
  }, []);
  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        aria-label={on ? "Désactiver le son des notifications" : "Activer le son des notifications"}
        title={on ? "Son activé · cliquez pour couper" : "Son coupé · cliquez pour activer"}
        onClick={() => {
          unlockAudio();
          const next = !on;
          setSoundEnabled(next);
          setOn(next);
          if (next) {
            void playNotificationSound("confirmee", { preview: true });
            toast.success("Son activé", { description: "Vous entendrez les prochains événements." });
          } else toast("Son coupé", { description: "Les toasts restent visibles." });
        }}
        className="icon-button"
      >
        {on ? <Volume2 className="h-4.5 w-4.5" /> : <VolumeX className="h-4.5 w-4.5 text-togo-red" />}
      </button>
      <button
        type="button"
        aria-label="Personnaliser les sons de notification"
        title="Personnaliser les sons"
        onClick={() => {
          unlockAudio();
          window.dispatchEvent(new Event("hf-close-mobile-menu"));
          window.dispatchEvent(new Event("hf-open-sound-settings"));
        }}
        className="icon-button"
      >
        <Settings2 className="h-4 w-4" />
      </button>
    </div>
  );
}
