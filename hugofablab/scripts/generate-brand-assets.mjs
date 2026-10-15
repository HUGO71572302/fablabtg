import sharp from "sharp";
import { mkdir } from "node:fs/promises";

await mkdir("public/icons", { recursive: true });
function svg(maskable = false) {
  const scale = maskable ? 0.71 : 0.88;
  const offset = (512 - 512 * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="${maskable ? 0 : 112}" fill="#173f30"/><g transform="translate(${offset} ${offset}) scale(${scale})"><path d="m256 60 166 97v194L256 451 90 351V157L256 60Z" stroke="#ffffff" stroke-width="18" fill="none" stroke-linejoin="round"/><path d="m90 157 166 97 166-97M256 254v197M256 60v99m0 0-83 48m83-48 83 48" stroke="#ffffff" stroke-width="18" fill="none" stroke-linejoin="round"/><path d="M256 254v83l71-41v-84l-71 42Z" fill="#d6e8b5"/></g><circle cx="425" cy="83" r="22" fill="#f2cc69"/></svg>`;
}
for (const n of [192, 512]) {
  await sharp(Buffer.from(svg())).resize(n, n).png().toFile(`public/icons/icon-${n}.png`);
  await sharp(Buffer.from(svg(true))).resize(n, n).png().toFile(`public/icons/maskable-${n}.png`);
}
await sharp(Buffer.from(svg())).resize(180, 180).png().toFile("public/icons/apple-touch-icon.png");
await sharp(Buffer.from(svg())).resize(64, 64).png().toFile("public/favicon.png");
if (!process.argv.includes("--icons-only")) {
  for (const name of ["makers-hero", "electronics-detail"]) {
    const image = await sharp(`public/images/${name}.jpg`).rotate().resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
    await sharp(image).toFile(`public/images/${name}.jpg`);
    console.log(`${name}: ${Math.round(image.length / 1024)} Ko`);
  }
}
console.log("Brand assets generated.");
