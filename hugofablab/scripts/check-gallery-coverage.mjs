import { chromium, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { Pool } from "pg";
import "dotenv/config";
import assert from "node:assert/strict";

const base = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block", hasTouch: true });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
let mediaId = 0, roomId = 0, machineId = 0, stockId = 0;

async function checkImage(path, selector, groupLabel) {
  await page.goto(base + path);
  const image = page.locator(selector).first();
  await image.scrollIntoViewIfNeeded();
  await expect(image).toHaveAttribute("role", "button");
  await image.click();
  const dialog = page.getByRole("dialog", { name: /Visionneuse/ });
  await dialog.waitFor();
  const full = dialog.locator("img");
  await expect(full).toHaveAttribute("src", /\/api\/media\//);
  const displayed = await full.evaluate((el) => ({ complete: el.complete, naturalWidth: el.naturalWidth }));
  assert.ok(displayed.complete && displayed.naturalWidth > 0, `Image ${groupLabel} ne charge pas en plein écran`);
  await dialog.getByRole("button", { name: "Agrandir l’image" }).click();
  await expect(dialog).toContainText("150%");
  const downloadEvent = page.waitForEvent("download", { timeout: 10000 });
  await dialog.getByRole("link", { name: "Télécharger l’image" }).click();
  const download = await downloadEvent;
  assert.ok(download.suggestedFilename());
  await dialog.getByRole("button", { name: "Fermer la visionneuse" }).click();
  await dialog.waitFor({ state: "detached" });
  console.log(`${groupLabel} : plein écran + zoom + téléchargement OK`);
}

try {
  const photo = await readFile("public/images/real-1.jpg");
  const [m] = (await pool.query("insert into media (lab_id, mime, data, bytes) values (1, 'image/jpeg', $1, $2) returning id", [photo.toString("base64"), photo.length])).rows;
  mediaId = m.id;
  const [room] = (await pool.query("insert into resources (lab_id, type, name, category, photo_id, icon, capacity) values (1,'salle','Salle de test photo','Salle', $1, 'room', 12) returning id", [mediaId])).rows;
  roomId = room.id;
  const [machine] = (await pool.query("insert into resources (lab_id, type, name, category, photo_id, icon, room_id) values (1,'machine','Machine de test photo','Impression 3D', $1, 'printer', $2) returning id", [mediaId, roomId])).rows;
  machineId = machine.id;
  const [stock] = (await pool.query("insert into stock_items (lab_id, name, category, photo_id, quantity) values (1,'Article de test photo','piece',$1,1) returning id", [mediaId])).rows;
  stockId = stock.id;

  await checkImage("/lab/hugo-fablab", `img[data-gallery="machines"][alt="Machine de test photo"]`, "Machine (vitrine publique)");
  await checkImage("/lab/hugo-fablab", `img[data-gallery="salles"][alt="Salle de test photo"]`, "Salle (vitrine publique)");

  await page.goto(base + "/login");
  await page.locator('input[name="identifier"]').fill(process.env.TEST_MANAGER_ID ?? "hkabrame");
  await page.locator('input[name="secret"]').fill(process.env.TEST_MANAGER_PASSWORD ?? "");
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
  await page.waitForURL("**/admin", { timeout: 25000 });
  await checkImage("/admin/ressources", `img[data-gallery="machines"][alt="Machine de test photo"]`, "Machine (espace responsable)");
  await checkImage("/admin/ressources", `img[data-gallery="salles"][alt="Salle de test photo"]`, "Salle (espace responsable)");
  await checkImage("/admin/stock", `img[data-gallery="stock"][alt="Article de test photo"]`, "Matériel en stock");

  // Le formulaire de réservation possède un bouton de zoom séparé : il ne doit pas changer la machine choisie.
  await page.goto(base + "/app/reserver");
  const selectedBefore = await page.locator('input[name="resourceId"]').inputValue();
  await page.getByRole("button", { name: "Agrandir la photo de Machine de test photo" }).click();
  await page.getByRole("dialog", { name: /Visionneuse/ }).waitFor();
  await page.getByRole("button", { name: "Fermer la visionneuse" }).click();
  assert.equal(await page.locator('input[name="resourceId"]').inputValue(), selectedBefore, "Agrandir la photo a modifié la sélection de la machine.");
  console.log("Formulaire : photo agrandie sans changer la sélection OK");

  console.log("Erreurs JS:", errors);
  assert.equal(errors.length, 0);
} finally {
  await pool.query("delete from stock_items where id = $1", [stockId]).catch(() => {});
  await pool.query("delete from resources where id = $1", [machineId]).catch(() => {});
  await pool.query("delete from resources where id = $1", [roomId]).catch(() => {});
  await pool.query("delete from media where id = $1", [mediaId]).catch(() => {});
  await pool.end();
  await browser.close();
}
console.log("All photo gallery coverage checks passed.");
