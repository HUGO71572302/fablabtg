import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const errors = [];

// 1) Avec JS : les éléments se révèlent au scroll, la barre de progression avance.
let ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
let page = await ctx.newPage(); page.on("pageerror", (e) => errors.push(e.message));
await page.goto(base + "/", { waitUntil: "networkidle" });
const beforeScroll = await page.evaluate(() => ({
  js: document.documentElement.classList.contains("js"),
  total: document.querySelectorAll("[data-reveal]").length,
  inAtTop: document.querySelectorAll("[data-reveal].in").length,
  hiddenBelow: [...document.querySelectorAll("[data-reveal]:not(.in)")].filter((e) => getComputedStyle(e).opacity === "0").length,
}));
console.log("Top of page:", beforeScroll);
assert.ok(beforeScroll.js, "html.js manquant");
assert.ok(beforeScroll.inAtTop > 0, "Le hero devrait être révélé immédiatement");
assert.ok(beforeScroll.hiddenBelow > 0, "Les sections sous la ligne de flottaison devraient être masquées avant le scroll");
// Défilement progressif jusqu'en bas
await page.evaluate(async () => { for (let y = 0; y <= document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)); } });
await page.waitForTimeout(1300);
const afterScroll = await page.evaluate(() => ({
  total: document.querySelectorAll("[data-reveal]").length,
  revealed: document.querySelectorAll("[data-reveal].in").length,
  // Les groupes hors viewport (ex. sticky) ne sont jamais masqués : seuls les éléments masquables comptent
  notRevealedMaskable: [...document.querySelectorAll("[data-reveal]:not(.in)")].filter((e) => e.getAttribute("data-reveal") !== "group").length,
  stillHidden: [...document.querySelectorAll("[data-reveal]")].filter((e) => getComputedStyle(e).opacity === "0").map((e) => e.className.toString().slice(0, 60)),
  progress: getComputedStyle(document.querySelector(".scroll-progress")).transform,
  counters: [...document.querySelectorAll("[aria-label]")].filter((e) => /^\d+$/.test(e.getAttribute("aria-label") ?? "")).map((e) => ({ shown: e.textContent, expected: e.getAttribute("aria-label") })),
  marquee: getComputedStyle(document.querySelector(".marquee-inner")).animationName,
  scrollTimeline: CSS.supports("animation-timeline: scroll()"),
}));
console.log("After scroll:", afterScroll);
assert.equal(afterScroll.stillHidden.length, 0, "Des éléments restent invisibles après défilement : " + afterScroll.stillHidden.join(" | "));
assert.equal(afterScroll.notRevealedMaskable, 0, "Éléments masquables non révélés après défilement");
for (const c of afterScroll.counters) assert.equal(Number(c.shown), Number(c.expected), "Compteur non terminé");
assert.ok(afterScroll.progress !== "none" && !afterScroll.progress.includes("matrix(0,"), "Barre de progression immobile");
assert.equal(afterScroll.marquee, "marquee");
await page.screenshot({ path: "artifacts/motion-scrolled.png" });
await ctx.close();

// 2) Sans JavaScript : tout est visible dès le premier rendu.
ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
page = await ctx.newPage();
await page.goto(base + "/");
const noJs = await page.evaluate(() => ({ js: document.documentElement.classList.contains("js"), hidden: [...document.querySelectorAll("[data-reveal]")].filter((e) => getComputedStyle(e).opacity === "0").length, h1: document.querySelector("h1")?.textContent }));
console.log("No-JS:", noJs);
assert.equal(noJs.js, false); assert.equal(noJs.hidden, 0, "Contenu invisible sans JS");
await ctx.close();

// 3) Mouvement réduit : visible sans attendre, sans animations.
ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
page = await ctx.newPage();
await page.goto(base + "/lab/hugo-fablab", { waitUntil: "networkidle" });
const reduced = await page.evaluate(() => ({ hidden: [...document.querySelectorAll("[data-reveal]")].filter((e) => getComputedStyle(e).opacity === "0").length, marquee: getComputedStyle(document.querySelector(".marquee-inner") ?? document.body).animationName }));
console.log("Reduced motion:", reduced);
assert.equal(reduced.hidden, 0, "Contenu masqué en mouvement réduit");
await ctx.close();

// 4) Pages du groupe (public) : footer et barre présents une seule fois ; URL inchangées.
ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
page = await ctx.newPage();
for (const path of ["/", "/lab/hugo-fablab", "/creer-mon-lab", "/login", "/register"]) {
  const r = await page.goto(base + path);
  const shape = await page.evaluate(() => ({ footers: document.querySelectorAll("footer#contact").length, bars: document.querySelectorAll(".scroll-progress").length, h1: document.querySelectorAll("h1").length }));
  console.log(path, r?.status(), shape);
  assert.equal(r?.status(), 200);
  if (["/", "/lab/hugo-fablab", "/creer-mon-lab"].includes(path)) { assert.equal(shape.footers, 1); assert.equal(shape.bars, 1); }
  assert.equal(shape.h1, 1, "Une seule balise h1 par page");
}
await browser.close();
assert.equal(errors.length, 0, "Erreurs JS : " + errors.join(" | "));
console.log("All motion & structure checks passed.");
