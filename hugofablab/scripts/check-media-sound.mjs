import { chromium, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";

const base = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const DB = "postgresql://postgres:postgres@127.0.0.1:5432/app_db";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const errors = [];
let marker = "";
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error" && !m.text().includes("favicon")) errors.push("console: " + m.text()); });

function createWav() {
  const rate = 16000, length = rate / 2, pcm = Buffer.alloc(length * 2);
  for (let i = 0; i < length; i++) pcm.writeInt16LE(Math.round(Math.sin((i / rate) * 2 * Math.PI * 660) * 13000), i * 2);
  const h = Buffer.alloc(44); h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVEfmt ", 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
await writeFile("/tmp/test-notification.wav", createWav());
const log = (t, d) => console.log(t, d ?? "OK");

try {
  // 1. All galleries work, including keyboard navigation and zoom
  await page.goto(base + "/", { waitUntil: "domcontentloaded" });
  const hero = page.locator('img[data-gallery="atelier"]').first();
  await hero.waitFor();
  await expect(hero).toHaveAttribute("role", "button", { timeout: 12000 });
  await hero.focus();
  await page.keyboard.press("Enter");
  let viewer = page.getByRole("dialog", { name: /Visionneuse/ });
  await viewer.waitFor();
  await page.keyboard.press("Escape");
  await viewer.waitFor({ state: "detached" });
  await hero.click();
  viewer = page.getByRole("dialog", { name: /Visionneuse/ });
  await viewer.waitFor();
  await expect(viewer).toContainText("1 / 3");
  await viewer.getByRole("button", { name: "Image suivante" }).click();
  await expect(viewer).toContainText("2 / 3");
  await viewer.getByRole("button", { name: "Agrandir l’image" }).click();
  await expect(viewer).toContainText("150%");
  const stage = viewer.locator(".touch-none");
  const box = await stage.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -200);
    await expect(viewer).toContainText("175%");
  }
  await page.keyboard.press("ArrowRight");
  await expect(viewer).toContainText("3 / 3");
  await expect(viewer).toContainText("100%");
  await page.keyboard.press("Escape");
  await viewer.waitFor({ state: "detached" });
  assert.equal(await page.locator("body").evaluate((el) => el.style.overflow), "");
  log("Accueil — 3 images, zoom, clavier, défilement rétabli");

  await page.goto(base + "/lab/hugo-fablab");
  const projectImages = page.locator('img[data-gallery="projets"]');
  const projectCount = await projectImages.count();
  assert.ok(projectCount >= 2);
  await projectImages.first().scrollIntoViewIfNeeded();
  await projectImages.first().click();
  viewer = page.getByRole("dialog", { name: /Visionneuse/ });
  await expect(viewer).toContainText(`1 / ${projectCount}`);
  await page.keyboard.press("ArrowRight");
  await expect(viewer).toContainText(`2 / ${projectCount}`);
  await page.keyboard.press("Escape");
  log("Galerie projets — navigation entre toutes les photos");

  // 2. Authenticated: machine photo, preview in identity form, sound settings
  await page.goto(base + "/login");
  await page.locator('input[name="identifier"]').fill(process.env.TEST_MANAGER_ID ?? "hkabrame");
  await page.locator('input[name="secret"]').fill(process.env.TEST_MANAGER_PASSWORD ?? "");
  await page.getByRole("button", { name: "Se connecter", exact: true }).click();
  await page.waitForURL("**/admin", { timeout: 25000 });
  await page.goto(base + "/admin/identite");
  const coverZoom = page.getByRole("button", { name: "Agrandir la photo : Couverture" });
  await coverZoom.click();
  viewer = page.getByRole("dialog", { name: /Visionneuse/ });
  await expect(viewer).toContainText("Couverture");
  await page.keyboard.press("Escape");
  await viewer.waitFor({ state: "detached" });
  await page.locator('input[type="file"][name="cover"]').setInputFiles("public/images/workshop.jpg");
  await page.locator('input[type="file"][name="cover"]').evaluate((el) => new Promise((res) => { const done = () => res(el.files?.[0]?.name ?? ""); setTimeout(done, 600); }));
  await coverZoom.click();
  viewer = page.getByRole("dialog", { name: /Visionneuse/ });
  await expect(viewer.locator("img")).toHaveAttribute("src", /^blob:/);
  await page.keyboard.press("Escape");
  log("Couverture — aperçu et photo choisie agrandis sans gêner le téléversement");

  await page.goto(base + "/admin/projets");
  const projectAdmin = page.locator('img[data-gallery="projets"]').first();
  await projectAdmin.scrollIntoViewIfNeeded(); await projectAdmin.click();
  viewer = page.getByRole("dialog", { name: /Visionneuse/ });
  await viewer.waitFor();
  await page.keyboard.press("Escape");
  log("Projets — photos agrandies dans l’espace responsable");

  const configButton = page.getByRole("button", { name: "Personnaliser les sons de notification" });
  await configButton.click();
  const settingsDialog = page.getByRole("dialog", { name: "Personnaliser les sons de notification" });
  await settingsDialog.waitFor();
  await expect(settingsDialog).toContainText("Volume général");
  await settingsDialog.locator("#sound-volume").fill("25");
  await settingsDialog.getByRole("checkbox", { name: "Vibration mobile" }).uncheck();
  await settingsDialog.getByRole("combobox", { name: "Son : Nouvelle demande" }).selectOption("douceur");
  await settingsDialog.getByRole("button", { name: "Écouter : Nouvelle demande" }).click();
  const pref = await page.evaluate(() => JSON.parse(localStorage.getItem("hf_sound_settings_v2")));
  assert.equal(pref.volume, 25); assert.equal(pref.vibrate, false); assert.equal(pref.events.en_attente, "douceur");
  log("Sons — volume, vibration, présélection et aperçu sauvegardés");

  await settingsDialog.locator('input[aria-label="Importer un son : Nouvelle demande"]').setInputFiles("/tmp/test-notification.wav");
  await expect(settingsDialog.getByRole("combobox", { name: "Son : Nouvelle demande" })).toHaveValue("personnalise");
  await expect(settingsDialog).toContainText("test-notification.wav");
  await settingsDialog.getByRole("button", { name: "Terminé" }).click();
  await page.reload();
  await page.getByRole("button", { name: "Personnaliser les sons de notification" }).click();
  const reopened = page.getByRole("dialog", { name: "Personnaliser les sons de notification" });
  await expect(reopened.getByRole("combobox", { name: "Son : Nouvelle demande" })).toHaveValue("personnalise");
  await expect(reopened).toContainText("test-notification.wav");
  await reopened.getByRole("button", { name: "Écouter : Nouvelle demande" }).click();
  await reopened.getByRole("button", { name: "Supprimer mon son : Nouvelle demande" }).click();
  await expect(reopened.getByRole("combobox", { name: "Son : Nouvelle demande" })).toHaveValue("original");
  log("Sons — fichier WAV conservé après rechargement, écoute et suppression");

  await reopened.getByRole("switch", { name: "Activer les notifications sonores" }).click();
  assert.equal((await page.evaluate(() => JSON.parse(localStorage.getItem("hf_sound_settings_v2")))).enabled, false);
  await reopened.getByRole("switch", { name: "Activer les notifications sonores" }).click();
  await reopened.getByRole("button", { name: "Réinitialiser les réglages" }).click();
  await reopened.getByRole("button", { name: "Terminé" }).click();
  log("Sons — coupure, réactivation et remise à zéro");

  // 3. A real SSE toast still arrives after personalization, without JS errors
  marker = "test-sound-" + Date.now();
  const managerId = Number(execFileSync("psql", [DB, "-tAc", "select id from users where role='fabmanager' order by id limit 1"], { encoding: "utf8" }).trim());
  execFileSync("psql", [DB, "-tAc", `insert into notifications_log (user_id, type, title, message) values (${managerId}, 'en_attente', '${marker}', 'Son personnalisé vérifié par le test');`]);
  await page.getByText(marker).last().waitFor({ timeout: 18000 });
  log("Nouvelle demande — toast temps réel toujours reçu");

  // 4. Mobile: viewer swipe, no overflow; settings from the complete menu
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: "block" });
  const mp = await mobile.newPage();
  mp.on("pageerror", (e) => errors.push(e.message));
  await mp.goto(base + "/lab/hugo-fablab");
  await mp.locator('img[data-gallery="projets"]').first().scrollIntoViewIfNeeded();
  await mp.locator('img[data-gallery="projets"]').first().click();
  const mobileViewer = mp.getByRole("dialog", { name: /Visionneuse/ });
  await mobileViewer.waitFor();
  assert.equal(await mp.evaluate(() => document.documentElement.scrollWidth), 390);
  await mobileViewer.getByRole("button", { name: "Agrandir l’image" }).click();
  await expect(mobileViewer).toContainText("150%");
  await mobileViewer.getByRole("button", { name: "Fermer la visionneuse" }).click();
  await mp.goto(base + "/login");
  await mp.locator('input[name="identifier"]').fill(process.env.TEST_MANAGER_ID ?? "hkabrame");
  await mp.locator('input[name="secret"]').fill(process.env.TEST_MANAGER_PASSWORD ?? "");
  await mp.getByRole("button", { name: "Se connecter", exact: true }).click();
  await mp.waitForURL("**/admin", { timeout: 25000 });
  await mp.getByRole("button", { name: "Tous les menus", exact: true }).click();
  await mp.getByRole("button", { name: "Personnaliser les sons de notification" }).click();
  await mp.getByRole("dialog", { name: "Personnaliser les sons de notification" }).waitFor();
  assert.equal(await mp.evaluate(() => document.documentElement.scrollWidth), 390);
  log("Mobile — plein écran et réglages sons accessibles dans le menu");
  await mobile.close();
} finally {
  if (marker) try { execFileSync("psql", [DB, "-tAc", `delete from notifications_log where title='${marker}'`]); } catch { /* test cleanup */ }
  await browser.close();
}
console.log("Erreurs JavaScript:", errors);
assert.equal(errors.length, 0, "Erreurs JavaScript : " + errors.join(" | "));
console.log("All image viewer & sound settings checks passed.");
