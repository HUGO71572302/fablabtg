// Toutes les dates sont manipulées en "heure du FabLab" = UTC (Lomé, GMT+0, sans heure d'été).
export const DAY_NAMES = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
export const DAY_SHORT = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
export const MONTH_NAMES = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];
export const MONTH_SHORT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export const pad = (n: number) => String(n).padStart(2, "0");

export function fmtTime(d: Date) {
  return `${pad(d.getUTCHours())}h${pad(d.getUTCMinutes())}`;
}
export function fmtTimeInput(d: Date) {
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}
export function fmtShortDate(d: Date) {
  return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`;
}
export function fmtDate(d: Date) {
  return `${DAY_NAMES[d.getUTCDay()]} ${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
export function fmtDateCompact(d: Date) {
  return `${DAY_SHORT[d.getUTCDay()]} ${d.getUTCDate()} ${MONTH_SHORT[d.getUTCMonth()]}`;
}
export function fmtDateTime(d: Date) {
  return `${fmtDate(d)} à ${fmtTime(d)}`;
}
export function fmtRange(a: Date, b: Date) {
  return `${fmtDateCompact(a)} · ${fmtTime(a)} – ${fmtTime(b)}`;
}
export function dayKey(d: Date) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
export function parseDayKey(k: string | null | undefined): Date | null {
  if (!k) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(k);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return isNaN(d.getTime()) ? null : d;
}
export function labDate(dateStr: string, timeStr: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !/^\d{2}:\d{2}$/.test(timeStr)) return null;
  const d = new Date(`${dateStr}T${timeStr}:00.000Z`);
  return isNaN(d.getTime()) ? null : d;
}
export function startOfDayUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
export function addDays(d: Date, n: number) {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}
export function addMinutes(d: Date, n: number) {
  return new Date(d.getTime() + n * 60000);
}
export function startOfWeek(d: Date) {
  const x = startOfDayUTC(d);
  const off = (x.getUTCDay() + 6) % 7;
  return addDays(x, -off);
}
export function minutesOfDay(d: Date) {
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}
export function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}
export function minutesToTime(m: number) {
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}
export function durationLabel(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (!h) return `${m} min`;
  return m ? `${h}h${pad(m)}` : `${h}h`;
}
export function relativeDay(d: Date, now = new Date()) {
  const k = dayKey(d);
  if (k === dayKey(now)) return "Aujourd'hui";
  if (k === dayKey(addDays(now, 1))) return "Demain";
  return fmtDateCompact(d);
}
export function timeAgo(d: Date, now = new Date()) {
  const s = Math.max(0, Math.floor((now.getTime() - d.getTime()) / 1000));
  if (s < 60) return "à l'instant";
  const m = Math.floor(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.floor(h / 24);
  return j === 1 ? "hier" : `il y a ${j} jours`;
}
