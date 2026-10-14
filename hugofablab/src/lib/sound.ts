"use client";

import type { NotificationType } from "@/db/schema";

export type SoundEvent = "en_attente" | "confirmee" | "modifiee" | "annulee" | "info";
export type SoundPreset = "original" | "douceur" | "atelier" | "signal" | "silence" | "personnalise";
export type SoundSettings = { enabled: boolean; volume: number; vibrate: boolean; events: Record<SoundEvent, SoundPreset> };
export const SOUND_EVENTS: { id: SoundEvent; title: string; subtitle: string; emoji: string }[] = [
  { id: "en_attente", title: "Nouvelle demande", subtitle: "Une réservation arrive au lab", emoji: "⏳" },
  { id: "confirmee", title: "Bonne nouvelle", subtitle: "Confirmation, place libérée ou nouveau niveau", emoji: "✅" },
  { id: "modifiee", title: "Modification", subtitle: "Créneau ou machine changé", emoji: "✏️" },
  { id: "annulee", title: "Annulation", subtitle: "Une réservation est annulée", emoji: "❌" },
  { id: "info", title: "Information", subtitle: "Présence pointée et autres nouvelles", emoji: "ℹ️" },
];
export const SOUND_PRESETS: { id: SoundPreset; title: string }[] = [
  { id: "original", title: "Son d'origine" },
  { id: "douceur", title: "Doux & discret" },
  { id: "atelier", title: "Atelier créatif" },
  { id: "signal", title: "Signal clair" },
  { id: "silence", title: "Silencieux" },
  { id: "personnalise", title: "Mon fichier audio" },
];
const STORAGE_KEY = "hf_sound_settings_v2";
const LEGACY_KEY = "hf_sound_enabled";
const EVENT = "hf-sound-pref";
const DB_NAME = "hugo-fablab-custom-sounds";
const CLIP_STORE = "clips";
export const MAX_SOUND_FILE_BYTES = 3 * 1024 * 1024;
export const DEFAULT_SOUND: SoundSettings = {
  enabled: true,
  volume: 65,
  vibrate: true,
  events: { en_attente: "original", confirmee: "original", modifiee: "original", annulee: "original", info: "original" },
};
let ctx: AudioContext | null = null;
let unlocked = false;

type StoredClip = { key: SoundEvent; blob: Blob; name: string };
const validPreset = (v: unknown): v is SoundPreset => SOUND_PRESETS.some((p) => p.id === v);
const validEvent = (v: unknown): v is SoundEvent => SOUND_EVENTS.some((e) => e.id === v);

function storage(): Storage | null { try { return typeof window !== "undefined" ? window.localStorage : null; } catch { return null; } }
export function getSoundSettings(): SoundSettings {
  const store = storage();
  try {
    const raw = store?.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as Partial<SoundSettings>;
      const events = { ...DEFAULT_SOUND.events };
      for (const { id } of SOUND_EVENTS) if (validPreset(data.events?.[id])) events[id] = data.events![id];
      return {
        enabled: typeof data.enabled === "boolean" ? data.enabled : DEFAULT_SOUND.enabled,
        volume: Number.isFinite(data.volume) ? Math.max(0, Math.min(100, Math.round(data.volume!))) : DEFAULT_SOUND.volume,
        vibrate: typeof data.vibrate === "boolean" ? data.vibrate : DEFAULT_SOUND.vibrate,
        events,
      };
    }
  } catch { /* préférence endommagée : revenir aux valeurs sûres */ }
  let enabled = true;
  try { enabled = store?.getItem(LEGACY_KEY) !== "0"; } catch { /* stockage bloqué (mode privé) */ }
  return { ...DEFAULT_SOUND, enabled, events: { ...DEFAULT_SOUND.events } };
}
export function setSoundSettings(value: SoundSettings) {
  const events = { ...DEFAULT_SOUND.events };
  for (const { id } of SOUND_EVENTS) if (validPreset(value.events?.[id])) events[id] = value.events[id];
  const safe = {
    enabled: Boolean(value.enabled),
    volume: Math.max(0, Math.min(100, Math.round(value.volume))),
    vibrate: Boolean(value.vibrate),
    events,
  } satisfies SoundSettings;
  const store = storage();
  try { store?.setItem(STORAGE_KEY, JSON.stringify(safe)); store?.setItem(LEGACY_KEY, safe.enabled ? "1" : "0"); } catch { /* stockage refusé : fonctionne pour la session */ }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: safe.enabled }));
  window.dispatchEvent(new CustomEvent("hf-sound-settings-changed", { detail: safe }));
  return safe;
}
export function soundEnabled() { return getSoundSettings().enabled; }
export function setSoundEnabled(on: boolean) { return setSoundSettings({ ...getSoundSettings(), enabled: on }); }
export function resetSoundSettings() { return setSoundSettings({ ...DEFAULT_SOUND, events: { ...DEFAULT_SOUND.events } }); }
export function soundEvent(type: NotificationType): SoundEvent {
  if (validEvent(type)) return type;
  if (["liste_attente", "niveau"].includes(type)) return "confirmee";
  return "info"; // présence, information…
}

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try { ctx ??= new AC(); return ctx; } catch { return null; }
}
/** À appeler au premier geste utilisateur (la lecture audio automatique est bloquée tant que l'utilisateur n'a pas interagi). */
export function unlockAudio() {
  const c = getCtx();
  if (!c) return;
  if (c.state === "suspended") void c.resume().catch(() => {});
  if (!unlocked) {
    const src = c.createBufferSource();
    src.buffer = c.createBuffer(1, 1, 22050);
    src.connect(c.destination);
    src.start(0);
    unlocked = true;
  }
}

function tone(c: AudioContext, freq: number, start: number, duration: number, gain: number, kind: OscillatorType = "sine") {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = kind;
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), start + 0.018);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(g).connect(c.destination);
  osc.start(start);
  osc.stop(start + duration + 0.03);
  osc.onended = () => { osc.disconnect(); g.disconnect(); };
}
function playBuiltIn(event: SoundEvent, preset: SoundPreset, volume: number) {
  const c = getCtx();
  if (!c || c.state !== "running") return false;
  const t = c.currentTime + 0.01;
  const v = (volume / 100) * 0.26;
  const note = (freq: number, offset: number, duration: number, gain = 1, kind: OscillatorType = "sine") => tone(c, freq, t + offset, duration, v * gain, kind);
  switch (preset) {
    case "original":
      if (event === "annulee") { note(523, 0, 0.2, 0.9, "triangle"); note(392, 0.2, 0.36, 0.9, "triangle"); }
      else if (event === "modifiee") { note(784, 0, 0.13); note(659, 0.14, 0.13); note(784, 0.28, 0.23); }
      else if (event === "en_attente") { note(988, 0, 0.24); note(784, 0.25, 0.42); }
      else if (event === "confirmee") { note(659, 0, 0.17); note(880, 0.15, 0.2); note(1175, 0.31, 0.32, 0.8); }
      else note(880, 0, 0.25);
      break;
    case "douceur":
      note(523, 0, 0.26, 0.5, "sine"); note(659, 0.19, 0.42, 0.44, "sine");
      break;
    case "atelier":
      note(494, 0, 0.12, 0.75, "triangle"); note(740, 0.13, 0.15, 0.7, "triangle"); note(988, 0.3, 0.3, 0.6, "triangle");
      break;
    case "signal":
      note(880, 0, 0.12, 0.8, "square"); note(880, 0.17, 0.12, 0.8, "square");
      break;
    default: return false;
  }
  return true;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("Le stockage local des sons n'est pas disponible dans ce navigateur."));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(CLIP_STORE)) req.result.createObjectStore(CLIP_STORE, { keyPath: "key" }); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Impossible d'ouvrir le stockage des sons."));
  });
}
async function loadClip(event: SoundEvent): Promise<StoredClip | null> {
  const db = await openDB();
  try {
    return await new Promise((resolve, reject) => {
      const req = db.transaction(CLIP_STORE, "readonly").objectStore(CLIP_STORE).get(event);
      req.onsuccess = () => resolve((req.result as StoredClip | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } finally { db.close(); }
}
export async function listCustomSoundNames(): Promise<Partial<Record<SoundEvent, string>>> {
  try {
    const db = await openDB();
    try {
      const records = await new Promise<StoredClip[]>((resolve, reject) => {
        const req = db.transaction(CLIP_STORE, "readonly").objectStore(CLIP_STORE).getAll();
        req.onsuccess = () => resolve(req.result as StoredClip[]);
        req.onerror = () => reject(req.error);
      });
      return Object.fromEntries(records.filter((r) => validEvent(r.key)).map((r) => [r.key, r.name]));
    } finally { db.close(); }
  } catch { return {}; }
}
/** Enregistre un court son personnel (MP3/WAV/OGG/M4A/WebM, 3 Mo max) directement sur l'appareil. */
export async function saveCustomSound(event: SoundEvent, file: File) {
  if (!validEvent(event)) throw new Error("Type de notification inconnu.");
  if (!file.type.startsWith("audio/") && !/\.(mp3|wav|ogg|m4a|webm)$/i.test(file.name)) throw new Error("Choisissez un fichier audio MP3, WAV, OGG ou M4A.");
  if (!file.size || file.size > MAX_SOUND_FILE_BYTES) throw new Error("Choisissez un son de moins de 3 Mo.");
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(CLIP_STORE, "readwrite");
      tx.objectStore(CLIP_STORE).put({ key: event, blob: file, name: file.name } satisfies StoredClip);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Impossible de conserver le son."));
      tx.onabort = () => reject(tx.error ?? new Error("Stockage audio interrompu."));
    });
  } finally { db.close(); }
}
export async function deleteCustomSound(event: SoundEvent) {
  const db = await openDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(CLIP_STORE, "readwrite");
      tx.objectStore(CLIP_STORE).delete(event);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}

/** Lecture depuis le système de toasts temps réel et depuis les boutons « Écouter » des réglages. */
export async function playNotificationSound(type: NotificationType, opts?: { preview?: boolean; preset?: SoundPreset }): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const settings = getSoundSettings();
  if (!settings.enabled && !opts?.preview) return false;
  const event = soundEvent(type);
  const preset = opts?.preset ?? settings.events[event];
  if (preset === "silence" || settings.volume === 0) return false;
  if (settings.vibrate && !opts?.preview) {
    try { navigator.vibrate?.(event === "annulee" ? [80, 60, 80] : 60); } catch { /* non supporté */ }
  }
  if (preset === "personnalise") {
    try {
      const clip = await loadClip(event);
      if (!clip) return false;
      const url = URL.createObjectURL(clip.blob);
      const audio = new Audio(url);
      audio.volume = settings.volume / 100;
      audio.onended = () => URL.revokeObjectURL(url);
      audio.onerror = () => URL.revokeObjectURL(url);
      try {
        await audio.play();
      } catch {
        URL.revokeObjectURL(url);
        return false;
      }
      return true;
    } catch { return false; }
  }
  const c = getCtx();
  if (!c) return false;
  if (c.state === "suspended") try { await c.resume(); } catch { return false; }
  return playBuiltIn(event, preset, settings.volume);
}
