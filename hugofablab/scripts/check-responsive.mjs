import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";

const base = process.env.TEST_BASE_URL ?? "http://localhost:3000";
await mkdir("artifacts", { recursive: true });
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const failures = [];
const errors = [];
async function check(page, path, label) {
  const response = await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded", timeout: 40000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const dims = await page.evaluate(() => ({ viewport: window.innerWidth, body: document.documentElement.scrollWidth, h1: document.querySelector("h1")?.textContent }));
  const ok = response?.status() === 200 && dims.body <= dims.viewport + 2;
  console.log(`${ok ? "OK" : "FAIL"} ${label} ${path}: ${response?.status()}, ${dims.body}/${dims.viewport}px`);
  if (!ok) {
    failures.push({ label, path, ...dims });
    const offenders = await page.evaluate(() => [...document.querySelectorAll("body *")].filter((e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return s.display !== "none" && s.visibility !== "hidden" && (r.right > innerWidth + 5 || r.left < -5) && r.width > 5; }).map((e) => ({ tag: e.tagName, cls: e.className?.toString().slice(0, 180), text: e.textContent?.slice(0, 60) })).slice(0, 15));
    console.log("Overflow:", offenders);
  }
}
const publicContext = await browser.newContext({ serviceWorkers: "block" });
const page = await publicContext.newPage();
page.on("pageerror", (e) => errors.push(e.message));
await page.setViewportSize({ width: 1440, height: 1000 });
await check(page, "/", "desktop");
await page.screenshot({ path: "artifacts/home-desktop.png" });
await page.getByRole("searchbox", { name: "Rechercher un FabLab" }).fill("zzzintrouvable");
await page.getByText("Aucun lab ne correspond").waitFor();
await page.getByRole("button", { name: "Réinitialiser les filtres" }).click();
for (const width of [360, 390, 768, 1440]) {
  await page.setViewportSize({ width, height: width >= 768 ? 1000 : 844 });
  for (const path of ["/", "/lab/hugo-fablab", "/login", "/register", "/creer-mon-lab"]) await check(page, path, `${width}px`);
  if (width === 390) {
    await page.goto(base); await page.waitForTimeout(500);
    await page.screenshot({ path: "artifacts/home-mobile.png", fullPage: true });
    await page.getByRole("button", { name: "Ouvrir le menu", exact: true }).click();
    await page.getByRole("dialog", { name: "Menu de navigation" }).waitFor();
    await page.screenshot({ path: "artifacts/menu-mobile.png" });
    await page.getByRole("button", { name: "Fermer le menu", exact: true }).click();
    await page.goto(`${base}/login`); await page.screenshot({ path: "artifacts/login-mobile.png", fullPage: true });
  }
}
await publicContext.close();

for (const role of ["manager", "student"]) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" });
  const p = await context.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(`${base}/login`);
  await p.locator('input[name="identifier"]').fill(role === "manager" ? process.env.TEST_MANAGER_ID ?? "hkabrame" : process.env.TEST_STUDENT_ID ?? "awa.lare");
  await p.locator('input[name="secret"]').fill(role === "manager" ? process.env.TEST_MANAGER_PASSWORD ?? "" : process.env.TEST_STUDENT_PIN ?? "");
  await p.getByRole("button", { name: "Se connecter", exact: true }).click();
  await p.waitForURL(role === "manager" ? "**/admin" : "**/app", { timeout: 25000 });
  console.log(`LOGIN ${role}: OK`);
  await p.screenshot({ path: `artifacts/${role}-desktop.png`, fullPage: true });
  const paths = role === "manager" ? ["/admin", "/admin/ressources", "/admin/identite", "/admin/projets", "/admin/utilisateurs", "/admin/reservations", "/admin/disponibilites", "/admin/statistiques", "/app/calendrier"] : ["/app", "/app/reserver", "/app/reservations", "/app/projets", "/app/profil", "/app/calendrier", "/app/notifications"];
  for (const width of [360, 768, 1024, 1440]) {
    await p.setViewportSize({ width, height: width >= 768 ? 1000 : 844 });
    for (const path of paths) await check(p, path, `${role} ${width}px`);
    if (width === 360) {
      await p.goto(`${base}${role === "manager" ? "/admin" : "/app"}`);
      await p.waitForTimeout(400);
      await p.screenshot({ path: `artifacts/${role}-mobile.png`, fullPage: true });
      await p.getByRole("button", { name: "Tous les menus", exact: true }).click();
      await p.getByRole("dialog", { name: "Tous les menus du FabLab" }).waitFor();
      await p.getByRole("link", { name: role === "manager" ? "Identité du lab" : "Mon profil", exact: true }).last().click();
      await p.waitForURL(role === "manager" ? "**/admin/identite" : "**/app/profil");
      console.log(`MOBILE complete menu ${role}: OK`);
    }
  }
  if (role === "manager") {
    await p.setViewportSize({ width: 390, height: 844 });
    await p.goto(`${base}/admin/ressources`);
    await p.getByRole("button", { name: "Nouvelle ressource", exact: true }).click();
    await p.getByRole("dialog", { name: "Nouvelle ressource", exact: true }).waitFor();
    await p.screenshot({ path: "artifacts/resource-modal-mobile.png" });
    await p.keyboard.press("Escape");
    await p.getByRole("dialog").waitFor({ state: "hidden" });
    console.log("RESOURCE modal / Escape: OK");
  }
  await p.goto(`${base}/app/profil`);
  await p.getByRole("button", { name: "Se déconnecter", exact: true }).first().click();
  await p.waitForURL(base + "/");
  await context.close();
}
await browser.close();
console.log("JS errors:", errors);
console.log("Layout failures:", failures);
assert.equal(errors.length, 0, "Client-side errors found");
assert.equal(failures.length, 0, "Responsive overflow found");
console.log("All responsive checks passed.");
