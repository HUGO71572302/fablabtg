import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string | null | undefined) {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const a = scryptSync(password, salt, 64);
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Règle de robustesse (production) : 10+ caractères, minuscule, majuscule, chiffre. */
export function passwordIssue(password: string): string | null {
  if (password.length < 10) return "Le mot de passe doit contenir au moins 10 caractères.";
  if (!/[a-z]/.test(password)) return "Le mot de passe doit contenir au moins une minuscule.";
  if (!/[A-Z]/.test(password)) return "Le mot de passe doit contenir au moins une majuscule.";
  if (!/[0-9]/.test(password)) return "Le mot de passe doit contenir au moins un chiffre.";
  return null;
}

export function generateToken(bytes = 24) {
  return randomBytes(bytes).toString("hex");
}
