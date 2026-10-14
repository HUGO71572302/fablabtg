import { chromium, expect } from "@playwright/test";
import { Pool } from "pg";
import "dotenv/config";
import assert from "node:assert/strict";

const base = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const db = new Pool({ connectionString: process.env.DATABASE_URL });
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const platform = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
const p = await platform.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
const stamp = Date.now().toString().slice(-7);
const email = `billing.${stamp}@example.com`;
const labName = `Lab abonnement ${stamp}`;
let labId = null;

async function login(page, identifier, secret, expected) {
  await page.goto(base + "/login");
  await page.locator('input[name="identifier"]').fill(identifier);
  await page.locator('input[name="secret"]').fill(secret);
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
  await page.waitForURL(`**${expected}`, { timeout: 25000 });
}

try {
  // 1. Nouveau lab → essai 10 min
  await p.goto(base + "/creer-mon-lab");
  await p.locator('#labName').fill(labName);
  await p.locator('#schoolName').fill("École test abonnement");
  await p.locator('#city').fill("Kara");
  await p.locator('#managerName').fill("Responsable Paiement");
  await p.locator('#email').fill(email);
  await p.locator('#phone').fill("90 10 20 30");
  await p.locator('input[name="password"]').fill("Paiement2026!");
  await p.locator('input[name="confirm"]').fill("Paiement2026!");
  await p.getByRole("button", { name: "Créer mon FabLab" }).click();
  await p.waitForURL("**/admin/ressources?bienvenue=1", { timeout: 30000 });
  const [lab] = (await db.query("select id from labs where contact_email = $1", [email])).rows;
  labId = lab.id;
  const [sub] = (await db.query("select status, trial_ends_at from lab_subscriptions where lab_id = $1", [labId])).rows;
  assert.equal(sub.status, "trial");
  assert.ok(new Date(sub.trial_ends_at).getTime() > Date.now());
  console.log("Création lab → essai gratuit de 10 min: OK");

  // 2. Page abonnement active et minuteur
  await p.goto(base + "/abonnement");
  await p.getByText(/Essai gratuit/).first().waitFor();
  await expect(p.getByText(/10 min|09 min/).first()).toBeVisible();
  console.log("Page abonnement → minuteur d'essai: OK");

  // 3. Simule fin d'essai → lab verrouillé mais abonnement disponible
  await db.query("update lab_subscriptions set status='expired', trial_ends_at = now() - interval '1 minute', active_until = null where lab_id = $1", [labId]);
  await p.goto(base + "/admin");
  await p.waitForURL("**/abonnement?reason=expired", { timeout: 20000 });
  console.log("Essai expiré → redirection abonnement: OK");

  // 4. Dépose demande Mobile Money
  await p.locator('input[name="transactionRef"]').fill(`TM-${stamp}`);
  await p.locator('input[name="payerPhone"]').fill("90 10 20 30");
  await p.getByRole("button", { name: "Envoyer ma demande de réactivation" }).click();
  await p.getByText(/Demande ABO-/).first().waitFor({ timeout: 20000 });
  const [payment] = (await db.query("select id, status, reference, amount, plan from payment_requests where lab_id = $1 order by id desc limit 1", [labId])).rows;
  assert.equal(payment.status, "pending");
  const [pendingSub] = (await db.query("select status from lab_subscriptions where lab_id = $1", [labId])).rows;
  assert.equal(pendingSub.status, "pending");
  console.log("Demande Mobile Money → paiement en attente: OK", payment.reference);

  // 5. Hugo / plateforme valide et active
  const adminCtx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
  const ap = await adminCtx.newPage();
  await login(ap, process.env.TEST_MANAGER_ID ?? "hkabrame", process.env.TEST_MANAGER_PASSWORD ?? "", "/admin");
  await ap.goto(base + "/gestion-abonnements");
  await ap.getByText(payment.reference).waitFor({ timeout: 20000 });
  const card = ap.locator("article").filter({ hasText: payment.reference }).first();
  await card.getByRole("button", { name: "Valider et activer" }).click();
  await ap.getByText(/Paiement validé/).first().waitFor({ timeout: 20000 });
  const [activeSub] = (await db.query("select status, plan, active_until from lab_subscriptions where lab_id = $1", [labId])).rows;
  assert.equal(activeSub.status, "active");
  assert.equal(activeSub.plan, "essentiel");
  assert.ok(new Date(activeSub.active_until).getTime() > Date.now());
  console.log("Validation gratuite plateforme → lab actif: OK");
  await adminCtx.close();

  // 6. Responsable retrouve l'accès au lab
  await platform.clearCookies();
  await login(p, email, "Paiement2026!", "/admin");
  await p.getByText("Tableau de bord").first().waitFor();
  console.log("Lab réactivé → retour au tableau de bord: OK");

  // 7. Sécurité : la gestion plateforme est refusée à un responsable non plateforme
  await p.goto(base + "/gestion-abonnements");
  await p.waitForURL("**/abonnement", { timeout: 20000 });
  console.log("Gestion plateforme protégée: OK");

  await p.goto(base + "/abonnement");
  await expect(p.getByText(/Abonnement actif/).first()).toBeVisible();
  console.log("Statut actif affiché: OK");

} finally {
  if (labId) await db.query("delete from labs where id = $1", [labId]).catch(() => {});
  await db.end();
  await browser.close();
}
assert.equal(errors.length, 0, "Erreurs JavaScript: " + errors.join(" | "));
console.log("All subscription checks passed.");
