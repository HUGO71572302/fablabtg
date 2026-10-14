import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, stat } from "node:fs/promises";
import assert from "node:assert/strict";

const base = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const DB = "postgresql://postgres:postgres@127.0.0.1:5432/app_db";
await mkdir("artifacts/print", { recursive: true });
const labId = Number(execFileSync("psql", [DB, "-tAc", "select lab_id from users where role='fabmanager' order by id limit 1"], { encoding: "utf8" }).trim());
const movementId = Number(execFileSync("psql", [DB, "-tAc", `select id from stock_movements where lab_id=${labId} order by id desc limit 1`], { encoding: "utf8" }).trim());
const stockId = Number(execFileSync("psql", [DB, "-tAc", `select id from stock_items where lab_id=${labId} order by id limit 1`], { encoding: "utf8" }).trim());
const routes = [
  { name: "apprenant", path: "/print/apprenant/2", title: "Fiche de suivi de l'apprenant" },
  { name: "recu", path: `/print/stock/recu/${movementId}`, title: "Reçu de mouvement" },
  { name: "fiche-stock", path: `/print/stock/fiche/${stockId}`, title: "Fiche de stock" },
  { name: "journal", path: "/print/stock/journal?periode=tout", title: "Journal des entrées et sorties" },
];
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(base + "/login");
await page.locator('input[name="identifier"]').fill(process.env.TEST_MANAGER_ID ?? "hkabrame");
await page.locator('input[name="secret"]').fill(process.env.TEST_MANAGER_PASSWORD ?? "");
await page.getByRole("button", { name: "Se connecter", exact: true }).click();
await page.waitForURL("**/admin", { timeout: 25000 });

for (const r of routes) {
  await page.goto(base + r.path, { waitUntil: "networkidle" });
  await page.getByText(r.title).first().waitFor();
  // Les éléments d'écran sont là avant impression
  assert.ok(await page.locator(".no-print").count() > 0, `${r.name}: toolbar absente à l'écran`);
  await page.emulateMedia({ media: "print" });
  const state = await page.evaluate(() => ({
    toolbar: getComputedStyle(document.querySelector(".no-print")).display,
    width: document.documentElement.scrollWidth,
    sheet: getComputedStyle(document.querySelector(".print-sheet")).width,
    header: Boolean(document.querySelector(".print-header")),
  }));
  assert.equal(state.toolbar, "none", `${r.name}: toolbar visible à l'impression`);
  assert.ok(state.header, `${r.name}: en-tête A4 absent`);
  const pdfPath = `artifacts/print/${r.name}.pdf`;
  await page.pdf({ path: pdfPath, format: "A4", printBackground: true, preferCSSPageSize: true });
  await page.screenshot({ path: `artifacts/print/${r.name}.png`, fullPage: true });
  const pdf = await readFile(pdfPath);
  const meta = await stat(pdfPath);
  assert.ok(pdf.subarray(0, 4).toString() === "%PDF", `${r.name}: le fichier produit n'est pas un PDF`);
  assert.ok(meta.size > 1_000, `${r.name}: PDF trop petit`);
  // Chrome produit toujours au moins une page : signature PDF + feuille rendue + layout print vérifié ci-dessus.
  console.log(`${r.name}: PDF A4 généré (${Math.round(meta.size / 1024)} Ko), toolbar=${state.toolbar}, feuille=${state.sheet}`);
  await page.emulateMedia({ media: "screen" });
}
await browser.close();
assert.equal(errors.length, 0, "Erreurs JS : " + errors.join(" | "));
console.log("All print layout checks passed.");
