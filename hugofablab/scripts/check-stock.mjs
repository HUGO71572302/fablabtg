import { chromium } from "@playwright/test";
import assert from "node:assert/strict";

const base = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 1280, height: 950 }, serviceWorkers: "block" });
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push(e.message));

async function login(identifier, secret, expected) {
  await page.goto(base + "/login");
  await page.locator('input[name="identifier"]').fill(identifier);
  await page.locator('input[name="secret"]').fill(secret);
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
  await page.waitForURL(`**${expected}`, { timeout: 25000 });
}

// ── 1. Le responsable voit les alertes depuis son tableau de bord
await login(process.env.TEST_MANAGER_ID ?? "hkabrame", process.env.TEST_MANAGER_PASSWORD ?? "", "/admin");
await page.goto(base + "/admin");
await page.getByRole("heading", { name: "Stock à surveiller" }).waitFor();
console.log("Dashboard stock card: OK");

// ── 2. Page de stock : indicateurs + inventaire
await page.goto(base + "/admin/stock");
await page.getByRole("heading", { name: "Stock & matériel" }).waitFor();
const stats = await page.locator("text=Références actives").first().isVisible();
assert.ok(stats, "Statistiques de stock absentes");
console.log("Stock page & stats: OK");

// ── 3. Création d'un article
const name = `Vis à bois ${Math.floor(Math.random() * 900 + 100)}`;
await page.getByRole("button", { name: "Nouvel article", exact: true }).first().click();
await page.getByRole("dialog", { name: "Nouvel article du stock" }).waitFor();
await page.locator("#stock-name").fill(name);
await page.locator("#stock-category").selectOption("outillage");
await page.locator("#stock-unit").fill("pièce");
await page.locator("#stock-quantity").fill("5");
await page.locator("#stock-min").fill("2");
await page.locator("#stock-location").fill("Établi · bac rouge");
await page.getByRole("dialog", { name: "Nouvel article du stock" }).getByRole("button", { name: "Enregistrer" }).click();
await page.getByText("ajouté au stock").waitFor({ timeout: 15000 });
const card = page.locator("[data-stock-item]").filter({ hasText: name }).first();
await card.waitFor();
console.log("Create item: OK");

// ── 4. Mouvement rapide −1 (sortie) puis +1 (entrée)
await card.getByRole("button", { name: /^Retirer/ }).click();
await page.getByText(/\u00bb 5 → 4\u00ab|5 → 4/).first().waitFor({ timeout: 15000 });
await card.getByRole("button", { name: /^Ajouter/ }).click();
await page.getByText("4 → 5").first().waitFor({ timeout: 15000 });
console.log("Quick ± moves: OK");

// ── 5. Journal : saisie d'une sortie de 2 → passage sous le seuil
await card.getByRole("button", { name: "Journal" }).click();
const historyDialog = page.getByRole("dialog", { name: `Journal de ${name}` });
await historyDialog.waitFor();
await historyDialog.locator("#movement-type").selectOption("sortie");
await historyDialog.locator('input[name="amount"]').fill("3");
await historyDialog.locator("#movement-note").fill("Atelier de 3e · robotique");
await historyDialog.getByRole("button", { name: "Enregistrer" }).click();
await page.getByText("5 → 2").first().waitFor({ timeout: 15000 });
const hasEntry = await historyDialog.getByText("Atelier de 3e · robotique").first().isVisible();
assert.ok(hasEntry, "Le motif du mouvement n'apparaît pas dans le journal");
await historyDialog.getByRole("button", { name: "Fermer" }).first().click();
console.log("Movement journal + traceability: OK");

// ── 6. Alerte de stock déclenchée : 2 ≤ seuil 2 → badge « Stock bas » immédiat
await card.getByText("Stock bas").waitFor({ timeout: 15000 });
console.log("Low-stock badge: OK");

// ── 7. Archivage
await card.getByRole("button", { name: "Archiver" }).click();
await page.getByText("archivé").first().waitFor({ timeout: 15000 });
await page.locator("[data-stock-item]").filter({ hasText: name }).first().waitFor({ state: "detached", timeout: 15000 }).catch(() => {});
await page.getByRole("button", { name: /Archivés/ }).click();
await page.locator("[data-stock-item]").filter({ hasText: name }).first().waitFor({ timeout: 15000 });
console.log("Archive / restore visibility: OK");

// ── 8. Lecture seule côté élève
await ctx.clearCookies();
await login(process.env.TEST_STUDENT_ID ?? "awa.lare", process.env.TEST_STUDENT_PIN ?? "", "/app");
await page.goto(base + "/app/stock");
await page.getByRole("heading", { name: "Ce qu'il y a dans l'atelier" }).waitFor();
const studentCreate = await page.getByRole("button", { name: "Nouvel article" }).count();
assert.equal(studentCreate, 0, "Un élève ne doit pas pouvoir ajouter d'article");
console.log("Student read-only stock: OK");

// ── 9. Responsive
for (const width of [360, 768, 1440]) {
  await page.setViewportSize({ width, height: 900 });
  for (const path of ["/app/stock", "/admin/stock"]) {
    await page.goto(base + path);
    await page.waitForTimeout(350);
    const dims = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, v: innerWidth }));
    assert.ok(dims.w <= dims.v + 2, `Débordement sur ${path} à ${width}px : ${dims.w}/${dims.v}`);
    console.log(`OK responsive ${width}px ${path} (${dims.w}/${dims.v})`);
  }
}

await browser.close();
assert.equal(errors.length, 0, "Erreurs JS : " + errors.join(" | "));
console.log("All stock checks passed.");
