import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";

const base = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const DB = "postgresql://postgres:postgres@127.0.0.1:5432/app_db";
const NOTE = "TEST journal automatique";
const BENEF = "Élève Test 3e";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
let itemId = null;
let movementId = null;

try {
  await page.goto(base + "/login");
  await page.locator('input[name="identifier"]').fill(process.env.TEST_MANAGER_ID ?? "hkabrame");
  await page.locator('input[name="secret"]').fill(process.env.TEST_MANAGER_PASSWORD ?? "");
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
  await page.waitForURL("**/admin", { timeout: 25000 });

  // 1) Sortie enregistrée depuis le journal d'un article, avec bénéficiaire et motif
  await page.goto(base + "/admin/stock");
  const card = page.locator("[data-stock-item]").filter({ hasText: "Colle blanche" }).first();
  await card.waitFor();
  itemId = Number(await card.getAttribute("data-stock-item"));
  await card.getByRole("button", { name: "Journal" }).click();
  const dlg = page.getByRole("dialog").first();
  await dlg.waitFor();
  await dlg.locator("#movement-type").selectOption("sortie");
  await dlg.locator('input[name="amount"]').fill("1");
  await dlg.locator('input[name="beneficiary"]').fill(BENEF);
  await dlg.locator("#movement-note").fill(NOTE);
  await dlg.getByRole("button", { name: "Enregistrer le mouvement" }).click();
  await page.getByText(/Colle blanche 500 ml : \d+ → \d+/).first().waitFor({ timeout: 20000 });
  await page.keyboard.press("Escape");
  console.log("Sortie enregistrée avec bénéficiaire: OK");

  // 2) Journal global : le mouvement est retrouvé avec son bénéficiaire
  await page.goto(base + "/admin/stock/journal?periode=tout");
  await page.getByRole("heading", { name: "Journal des entrées et sorties" }).waitFor();
  const row = page.locator("tr").filter({ hasText: NOTE }).first();
  await row.waitFor({ timeout: 15000 });
  assert.ok((await row.innerText()).includes(BENEF), "Bénéficiaire absent du journal");
  const receiptHref = await row.locator('a[href^="/print/stock/recu/"]').first().getAttribute("href");
  movementId = Number(receiptHref.split("/").pop());
  console.log("Journal global, mouvement", receiptHref, "avec bénéficiaire: OK");

  // 3) Filtres : type + article
  await page.goto(base + `/admin/stock/journal?periode=tout&type=sortie&item=${itemId}`);
  await page.locator("tr").filter({ hasText: NOTE }).first().waitFor({ timeout: 15000 });
  console.log("Filtres type + article: OK");

  // 4) Reçu imprimable
  await page.goto(base + receiptHref);
  await page.getByText("Reçu de mouvement").first().waitFor();
  assert.ok((await page.locator("body").innerText()).includes(BENEF), "Le reçu ne mentionne pas le bénéficiaire");
  await page.screenshot({ path: "artifacts/recu.png", fullPage: true });
  console.log("Reçu imprimable: OK");

  // 5) Fiche article : historique et solde
  await page.goto(base + `/print/stock/fiche/${itemId}`);
  await page.getByText("Fiche de stock").first().waitFor();
  assert.ok((await page.locator("body").innerText()).includes(NOTE), "La fiche n'affiche pas le mouvement");
  await page.screenshot({ path: "artifacts/fiche.png", fullPage: true });
  console.log("Fiche article: OK");

  // 6) Journal imprimable et export CSV
  await page.goto(base + "/print/stock/journal?periode=tout");
  await page.getByText("Journal des entrées et sorties").first().waitFor();
  console.log("Journal imprimable: OK");
  const csv = await ctx.request.get(base + "/api/stock/journal?periode=tout");
  assert.equal(csv.status(), 200);
  const text = await csv.text();
  assert.ok(text.includes("Référence") && text.includes(NOTE), "CSV incomplet");
  assert.ok((csv.headers()["content-type"] ?? "").includes("text/csv"));
  console.log("Export CSV: OK");

  // 7) Sécurité : export refusé sans session responsable
  const anon = await browser.newContext();
  const ap = await anon.newPage();
  const denied = await ap.goto(base + "/api/stock/journal");
  assert.equal(denied.status(), 403, "Export accessible sans droits");
  await anon.close();
  console.log("Export protégé: OK");

  // 8) Mise en page du journal sur petit écran
  for (const w of [360, 1024]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto(base + "/admin/stock/journal?periode=tout");
    await page.waitForTimeout(300);
    const dims = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
    console.log(`journal ${w}px: largeur ${dims[0]}px`);
  }
} finally {
  // Remet le stock d'origine et supprime le mouvement de test
  if (movementId) {
    execSync(`psql "${DB}" -qtAc "UPDATE stock_items SET quantity = quantity + 1 WHERE id = ${itemId} AND EXISTS (SELECT 1 FROM stock_movements WHERE id = ${movementId}); DELETE FROM stock_movements WHERE id = ${movementId};"`);
  }
  await browser.close();
}
assert.equal(errors.length, 0, "Erreurs JS: " + errors.join(" | "));
console.log("All journal checks passed.");
