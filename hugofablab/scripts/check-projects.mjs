import { chromium } from "@playwright/test";
import sharp from "sharp";
import { writeFile } from "node:fs/promises";

const base = process.env.TEST_BASE_URL ?? "http://localhost:3000";
// Photo « téléphone » : ~8 Mo, comme une photo prise à l'appareil.
const big = await sharp({ create: { width: 4800, height: 3600, channels: 3, background: { r: 120, g: 130, b: 110 }, noise: { type: "gaussian", mean: 128, sigma: 40 } } }).jpeg({ quality: 96 }).toBuffer();
const small = await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 200, g: 120, b: 60 } } }).jpeg().toBuffer();
await writeFile("/tmp/photo-big.jpg", big);
const mid = await sharp({ create: { width: 3000, height: 2250, channels: 3, background: { r: 90, g: 120, b: 100 }, noise: { type: "gaussian", mean: 128, sigma: 40 } } }).jpeg({ quality: 96 }).toBuffer();
await writeFile("/tmp/photo-mid.jpg", mid);
console.log(`photo moyenne: ${(mid.length / 1048576).toFixed(1)} Mo`);
await writeFile("/tmp/photo-small.jpg", small);
console.log(`photo grande: ${(big.length / 1048576).toFixed(1)} Mo · photo petite: ${Math.round(small.length / 1024)} Ko`);

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
const page = await ctx.newPage();
const pageErrors = [];
page.on("pageerror", (e) => pageErrors.push(e.message));
const posts = [];
const requests = [];
page.on("request", (r) => { if (r.method() === "POST") requests.push(new URL(r.url()).pathname); });
page.on("response", async (r) => {
  if (r.request().method() === "POST") posts.push({ url: new URL(r.url()).pathname, status: r.status(), body: (await r.text().catch(() => "")).slice(0, 160) });
});

await page.goto(base + "/login");
await page.locator('input[name="identifier"]').fill(process.env.TEST_MANAGER_ID ?? "hkabrame");
await page.locator('input[name="secret"]').fill(process.env.TEST_MANAGER_PASSWORD ?? "");
await page.getByRole("button", { name: "Se connecter", exact: true }).click();
await page.waitForURL("**/admin", { timeout: 25000 });

async function publish(file, title) {
  posts.length = 0;
  requests.length = 0;
  await page.goto(base + "/admin/projets");
  await page.locator("#title").fill(title);
  await page.locator("#description").fill("Test automatique de publication");
  await page.locator('input[type="file"][name="photo"]').setInputFiles(file);
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Publier le projet" }).click();
  const outcome = await Promise.race([
    page.getByText(/Projet (enregistré|publié)|Projet envoyé/).first().waitFor({ timeout: 25000 }).then(() => "SUCCÈS"),
    page.locator("form .text-togo-red").first().waitFor({ timeout: 25000 }).then(async () => "ERREUR AFFICHÉE : " + (await page.locator("form .text-togo-red").first().innerText())),
    page.getByText(/Une erreur est survenue|Application error/).first().waitFor({ timeout: 25000 }).then(() => "PAGE D'ERREUR"),
  ]).catch((e) => "AUCUNE RÉPONSE : " + e.message.split("\n")[0]);
  console.log(`\n[${title}] → ${outcome}`);
  console.log("  POST émis:", JSON.stringify(requests), "réponses:", JSON.stringify(posts.slice(-2)));
  console.log("  titre saisi:", await page.locator("#title").inputValue(), "· fichier:", await page.locator('input[type="file"][name="photo"]').evaluate((el) => el.files?.[0]?.name ?? "aucun"));
}

await publish("/tmp/photo-small.jpg", "Projet photo légère");
await publish("/tmp/photo-mid.jpg", "Projet photo moyenne (6 Mo)");
await publish("/tmp/photo-big.jpg", "Projet photo téléphone");

// Basculer la publication d'un projet existant
await page.goto(base + "/admin/projets");
const toggle = page.getByRole("button", { name: /^(Retirer|Publier)$/ }).first();
if (await toggle.count()) {
  const label = await toggle.innerText();
  posts.length = 0;
  await toggle.click();
  const toastText = await Promise.race([
    page.getByText(/Projet (publié|retiré)/).first().waitFor({ timeout: 15000 }).then(() => "SUCCÈS"),
    page.getByRole("status").first().waitFor({ timeout: 15000 }).then(async () => "TOAST : " + (await page.getByRole("status").first().innerText())),
  ]).catch((e) => "AUCUNE RÉPONSE : " + e.message.split("\n")[0]);
  console.log(`\n[bascule « ${label.trim()} »] → ${toastText}`, JSON.stringify(posts.slice(-1)));
} else console.log("\n[bascule] aucun projet à basculer");

await browser.close();
console.log("\nerreurs JS:", pageErrors.length ? pageErrors : "aucune");
