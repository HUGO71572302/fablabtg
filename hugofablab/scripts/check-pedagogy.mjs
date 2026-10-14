import { chromium, expect } from "@playwright/test";
import { Pool } from "pg";
import "dotenv/config";
import assert from "node:assert/strict";

const base = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 950 }, serviceWorkers: "block" });
const page = await ctx.newPage();
page.on("dialog", (d) => d.accept());
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const label = `Évaluation test ${Date.now().toString().slice(-6)}`;
let createdUser = null;

try {
  // 1. Slogan réécrit sur la vitrine
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  const home = (await page.locator("body").innerText()).toLocaleLowerCase("fr");
  assert.ok(home.includes("créer. expérimenter. transmettre."), "Nouveau slogan absent");
  assert.ok(!home.includes("apprendre. partager"), "Ancien slogan encore présent");
  console.log("Slogan « Créer. Expérimenter. Transmettre. » : OK");

  // 2. Connexion responsable + liste du suivi (numéros de fiche par classe)
  await page.goto(base + "/login");
  await page.locator('input[name="identifier"]').fill(process.env.TEST_MANAGER_ID ?? "hkabrame");
  await page.locator('input[name="secret"]').fill(process.env.TEST_MANAGER_PASSWORD ?? "");
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
  await page.waitForURL("**/admin", { timeout: 25000 });
  await page.goto(base + "/admin/suivi");
  await page.getByRole("heading", { name: "Suivi pédagogique" }).waitFor();
  const listBody = await page.locator("body").innerText();
  assert.ok(/TLE-D2-\d{3}/.test(listBody), "Numéro de fiche TLE-D2 introuvable");
  assert.ok(/1RE-C1-\d{3}|3E-B-\d{3}/.test(listBody), "Autres classes non numérotées");
  console.log("Liste du suivi — numérotation par classe : OK");

  // 3. Filtre par classe
  await page.locator('select[name="classe"]').selectOption("TLE-D2");
  await page.getByRole("button", { name: "Filtrer" }).click();
  const filtered = await page.locator("body").innerText();
  assert.ok(filtered.includes("Awa Lare"), "Filtre de classe inefficace");
  console.log("Filtre par classe : OK");

  // 4. Ouverture d'un apprenant + ajout d'une note
  await page.goto(base + "/admin/suivi/2");
  await page.getByRole("heading", { name: "Awa Lare" }).waitFor();
  const detail = (await page.locator("body").innerText()).toLocaleLowerCase("fr");
  assert.ok(detail.includes("fiche tle-d2-001"), "N° de fiche absent de la fiche de l'apprenant");
  assert.ok(/n° 1 sur \d+/.test(detail), "Position de la fiche dans la classe absente");
  assert.ok(detail.includes("évaluations") || detail.includes("suivi pédagogique"), "Section évaluations absente");

  await page.locator("#grade-label").fill(label);
  await page.locator("#grade-score").fill("16");
  await page.locator("#grade-max").fill("20");
  await page.getByRole("button", { name: "Enregistrer dans le suivi" }).click();
  await expect(page.getByText(label).first()).toBeVisible({ timeout: 15000 });
  await page.getByText(/Note de 16\/20 enregistrée/).first().waitFor({ timeout: 15000 });
  console.log("Ajout d'une note (toast + ligne) : OK");

  // 5. Suppression de l'évaluation de test
  const row = page.locator("tr").filter({ hasText: label });
  await row.locator('button[aria-label="Supprimer cette évaluation"]').click();
  await page.getByText("Évaluation supprimée").first().waitFor({ timeout: 15000 });
  assert.equal(await page.locator("body").innerText().then((t) => t.includes(label)), false, "La note de test n'a pas disparu");
  console.log("Suppression d'une évaluation : OK");

  // 6. Fiche imprimable enrichie : n° de fiche, position et suivi pédagogique
  await page.goto(base + "/print/apprenant/2");
  const print = (await page.locator("body").innerText()).toLocaleLowerCase("fr");
  assert.ok(print.includes("fiche de suivi de l'apprenant"), "Titre de la fiche");
  assert.ok(print.includes("tle-d2-001"), "N° de fiche absent");
  assert.ok(/fiche 1 sur \d+/.test(print), "Position dans la classe absente");
  assert.ok(print.includes("suivi pédagogique"), "Section suivi absente");
  assert.ok(print.includes("moyenne / 20"), "Moyenne absente");
  assert.ok(print.includes("impression 3d"), "Notes du lab absentes");
  await page.screenshot({ path: "artifacts/fiche-apprenant.png", fullPage: true });
  console.log("Fiche imprimable avec suivi pédagogique : OK");

  // 7. Inscription d'un élève → attribution automatique du n° dans sa classe
  await ctx.clearCookies();
  await page.goto(base + "/register");
  const username = "test.classe.5e";
  const labId = await pool.query("select id from labs order by id limit 1").then((r) => r.rows[0].id);
  await page.locator('select[name="labId"]').selectOption(String(labId));
  await page.locator('input[name="name"]').fill("Élève Test Classe");
  await page.locator('select[name="classLevel"]').selectOption("5e");
  await page.locator('input[name="section"]').fill("A");
  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="pin"]').fill("4827");
  await page.locator('input[name="pinConfirm"]').fill("4827");
  await page.locator('input[name="phone"]').fill("90 11 22 33");
  await page.getByRole("button", { name: "Créer mon compte élève" }).click();
  await page.waitForURL("**/app**", { timeout: 25000 });
  const created = await pool.query("select id, sheet_number from users where username = $1", [username]);
  createdUser = created.rows[0]?.id ?? null;
  assert.ok(created.rows[0], "Élève non créé");
  assert.match(created.rows[0].sheet_number ?? "", /^5E-A-\d{3}$/, `N° de fiche inattendu : ${created.rows[0].sheet_number}`);
  console.log("Inscription → n° de fiche de classe attribué:", created.rows[0].sheet_number);

  // 8. Responsive des pages de suivi
  for (const w of [360, 1440]) {
    await ctx.clearCookies();
    await page.goto(base + "/login");
    await page.locator('input[name="identifier"]').fill(process.env.TEST_MANAGER_ID ?? "hkabrame");
    await page.locator('input[name="secret"]').fill(process.env.TEST_MANAGER_PASSWORD ?? "");
    await page.getByRole("button", { name: "Se connecter", exact: true }).click();
    await page.waitForURL("**/admin", { timeout: 25000 });
    await page.setViewportSize({ width: w, height: 900 });
    for (const path of ["/admin/suivi", "/admin/suivi/2"]) {
      await page.goto(base + path);
      await page.waitForTimeout(350);
      const dims = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
      assert.ok(dims[0] <= dims[1] + 2, `Débordement sur ${path} à ${w}px : ${dims[0]}/${dims[1]}`);
    }
    console.log(`Suivi responsive ${w}px : OK`);
  }

  console.log("Erreurs JS:", errors);
  assert.equal(errors.length, 0);
} finally {
  if (createdUser) {
    await pool.query("delete from notifications where user_id = $1", [createdUser]).catch(() => {});
    await pool.query("delete from user_skills where user_id = $1", [createdUser]).catch(() => {});
    await pool.query("delete from waitlist where user_id = $1", [createdUser]).catch(() => {});
    await pool.query("delete from sessions where user_id = $1", [createdUser]).catch(() => {});
    await pool.query("delete from grades where user_id = $1", [createdUser]).catch(() => {});
    await pool.query("delete from users where id = $1", [createdUser]).catch(() => {});
  }
  await pool.end();
  await browser.close();
}
console.log("All pedagogy checks passed.");
