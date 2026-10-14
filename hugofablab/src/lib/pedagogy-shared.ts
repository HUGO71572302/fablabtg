/**
 * Définitions partagées du suivi pédagogique — sûres pour le navigateur (aucune requête, aucune base).
 * Les requêtes serveur vivent dans `src/lib/pedagogy.ts`.
 */

export type GradeKind = "note" | "observation";

export const GRADE_KINDS: { id: GradeKind; title: string }[] = [
  { id: "note", title: "Note (sur n)" },
  { id: "observation", title: "Observation / appréciation" },
];

export type GradeView = {
  id: number;
  label: string;
  kind: string;
  score: number | null;
  maxScore: number;
  comment: string | null;
  gradedAt: string;
  author: string | null;
};

export type GradeStats = { notes: number; observations: number; moyenne: number | null; best: number | null; worst: number | null };

export type LearnerRow = {
  id: number;
  name: string;
  username: string | null;
  phone: string | null;
  classLevel: string | null;
  section: string | null;
  sheetNumber: string | null;
  active: boolean;
  notes: number;
  observations: number;
  moyenne: number | null;
  lastAt: string | null;
};
