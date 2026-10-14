"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { BellRing, Check, Headphones, Loader2, RotateCcw, Trash2, Upload, Volume2, VolumeX, X } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Badge, Button, cn } from "@/components/ui";
import {
  DEFAULT_SOUND, MAX_SOUND_FILE_BYTES, SOUND_EVENTS, SOUND_PRESETS,
  deleteCustomSound, getSoundSettings, listCustomSoundNames, playNotificationSound,
  resetSoundSettings, saveCustomSound, setSoundSettings, unlockAudio,
  type SoundEvent, type SoundPreset, type SoundSettings,
} from "@/lib/sound";

const PRESETS = SOUND_PRESETS.filter((p) => p.id !== "personnalise");

/**
 * Modale unique au niveau du layout racine : reste montée même lorsque le menu mobile se referme.
 * La préférence (localStorage) et les fichiers audio personnels (IndexedDB) sont propres à cet appareil.
 */
export function SoundSettingsHost() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<SoundSettings>({ ...DEFAULT_SOUND, events: { ...DEFAULT_SOUND.events } });
  const [clips, setClips] = useState<Partial<Record<SoundEvent, string>>>({});
  const [busy, setBusy] = useState<SoundEvent | null>(null);

  useEffect(() => {
    const show = () => { setSettings(getSoundSettings()); void listCustomSoundNames().then(setClips); setOpen(true); };
    window.addEventListener("hf-open-sound-settings", show);
    const sync = (e: StorageEvent) => { if (e.key?.startsWith("hf_sound_")) setSettings(getSoundSettings()); };
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener("hf-open-sound-settings", show); window.removeEventListener("storage", sync); };
  }, []);

  const save = (next: SoundSettings) => setSettings(setSoundSettings(next));
  const update = <K extends keyof SoundSettings>(key: K, value: SoundSettings[K]) => save({ ...settings, [key]: value });
  const setPreset = (event: SoundEvent, preset: SoundPreset) => save({ ...settings, events: { ...settings.events, [event]: preset } });
  const preview = async (event: SoundEvent) => {
    unlockAudio();
    const ok = await playNotificationSound(event, { preview: true, preset: settings.events[event] });
    if (!ok) toast.info(settings.events[event] === "silence" ? "Mode silencieux pour cette notification" : "Son indisponible sur cet appareil.");
  };

  async function addCustom(event: SoundEvent, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(event);
    try {
      await saveCustomSound(event, file);
      setClips((prev) => ({ ...prev, [event]: file.name }));
      setPreset(event, "personnalise");
      toast.success("Son personnel enregistré", { description: file.name });
      unlockAudio();
      void playNotificationSound(event, { preview: true, preset: "personnalise" });
    } catch (err) {
      toast.error("Fichier refusé", { description: err instanceof Error ? err.message : "Veuillez réessayer." });
    } finally { setBusy(null); }
  }
  async function removeCustom(event: SoundEvent) {
    try {
      await deleteCustomSound(event);
      setClips((prev) => { const next = { ...prev }; delete next[event]; return next; });
      if (settings.events[event] === "personnalise") setPreset(event, "original");
      toast.success("Son personnel supprimé");
    } catch { toast.error("Impossible de supprimer ce fichier sur cet appareil."); }
  }

  if (!open) return null;
  return (
    <Modal onClose={() => setOpen(false)} label="Personnaliser les sons de notification" className="max-w-[600px]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lime text-forest"><BellRing className="h-5 w-5" /></span>
          <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-togo-green dark:text-lime">À votre oreille</p><h2 className="text-[19px] font-extrabold tracking-tight">Sons de notification</h2></div>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="icon-button" aria-label="Fermer les réglages sonores"><X className="h-4 w-4" /></button>
      </div>
      <p className="mt-4 text-[13px] leading-6 text-muted-foreground">Choisissez une ambiance pour chaque événement. Vos réglages sont conservés sur cet appareil.</p>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-border bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-2">
          {settings.enabled ? <Volume2 className="h-5 w-5 text-togo-green dark:text-lime" /> : <VolumeX className="h-5 w-5 text-muted-foreground" />}
          <span className="text-[14px] font-bold">Notifications sonores</span>
        </div>
        <button type="button" role="switch" aria-checked={settings.enabled} aria-label="Activer les notifications sonores" onClick={() => { if (!settings.enabled) unlockAudio(); update("enabled", !settings.enabled); }} className={cn("relative h-7 w-12 rounded-full transition", settings.enabled ? "bg-togo-green dark:bg-lime" : "bg-border")}><span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform", settings.enabled ? "translate-x-[10px]" : "-translate-x-[10px]")} /></button>
      </div>

      <div className="mt-4 grid gap-4 rounded-[16px] border border-border p-4 sm:grid-cols-[1fr_auto]">
        <div>
          <label htmlFor="sound-volume" className="flex items-center justify-between text-[13px] font-bold"><span>Volume général</span><span className="font-mono tabular-nums text-togo-green dark:text-lime">{settings.volume}%</span></label>
          <input id="sound-volume" type="range" min={0} max={100} step={5} value={settings.volume} onChange={(e) => update("volume", Number(e.target.value))} className="mt-3 w-full cursor-pointer accent-togo-green dark:accent-lime" />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-[13px] font-bold"><input type="checkbox" checked={settings.vibrate} onChange={(e) => update("vibrate", e.target.checked)} className="h-4 w-4 accent-togo-green" />Vibration mobile</label>
      </div>

      <p className="mt-6 mb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">Un son pour chaque événement</p>
      <div className="divide-y divide-border rounded-[16px] border border-border">
        {SOUND_EVENTS.map((event) => (
          <div key={event.id} className="space-y-2.5 px-4 py-3.5">
            <div className="flex items-center gap-2.5"><span className="text-lg" aria-hidden="true">{event.emoji}</span><div className="min-w-0 flex-1"><p className="text-[13px] font-extrabold">{event.title}</p><p className="text-[11px] text-muted-foreground">{event.subtitle}</p></div>{clips[event.id] && <Badge tone="green">Fichier enregistré</Badge>}</div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={settings.events[event.id]}
                onChange={(e) => setPreset(event.id, e.target.value as SoundPreset)}
                aria-label={`Son : ${event.title}`}
                className="min-h-10 min-w-[150px] flex-1 rounded-xl border border-border bg-card px-3 text-[13px] font-semibold text-foreground"
              >
                {PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.title}</option>)}
                {clips[event.id] && <option value="personnalise">Mon fichier audio</option>}
              </select>
              <button type="button" onClick={() => void preview(event.id)} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-[12px] font-bold hover:bg-muted" aria-label={`Écouter : ${event.title}`}><Headphones className="h-4 w-4" />Écouter</button>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <label className={cn("inline-flex cursor-pointer items-center gap-1.5 font-bold text-togo-green hover:underline dark:text-lime", busy === event.id && "pointer-events-none opacity-50")}><Upload className="h-3.5 w-3.5" />{clips[event.id] ? "Remplacer mon son" : "Importer mon son"}<input type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.webm" className="sr-only" aria-label={`Importer un son : ${event.title}`} onChange={(e) => void addCustom(event.id, e)} /></label>
              {busy === event.id && <Loader2 className="h-4 w-4 animate-spin" />}
              {clips[event.id] && <><span className="max-w-[180px] truncate text-muted-foreground" title={clips[event.id]}>{clips[event.id]}</span><button type="button" onClick={() => void removeCustom(event.id)} className="inline-flex items-center gap-1 text-togo-red hover:underline" aria-label={`Supprimer mon son : ${event.title}`}><Trash2 className="h-3.5 w-3.5" />Supprimer</button></>}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] leading-5 text-muted-foreground">Fichier MP3, WAV, OGG ou M4A · {Math.floor(MAX_SOUND_FILE_BYTES / 1048576)} Mo maximum. Les sons personnels restent sur cet appareil (aucun envoi au serveur).</p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><button type="button" onClick={() => { setSettings(resetSoundSettings()); toast.success("Sons par défaut restaurés"); }} className="inline-flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground hover:text-foreground"><RotateCcw className="h-3.5 w-3.5" />Réinitialiser les réglages</button><Button type="button" onClick={() => setOpen(false)}><Check className="h-4 w-4" />Terminé</Button></div>
    </Modal>
  );
}
