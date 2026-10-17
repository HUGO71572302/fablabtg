import sharp from "sharp";
import { mkdir } from "node:fs/promises";

await mkdir("public/icons", { recursive: true });
function svg(maskable = false) {
  const mark = `<g stroke-linejoin="round">
    <ellipse cx="20" cy="35.4" rx="14.7" ry="2.2" fill="#061D18" opacity=".65"/>
    <path d="M4.5 13.5 20 22.3 35.5 13.5V29L20 37.5 4.5 29V13.5Z" fill="url(#cube-side-shadow)" stroke="#03271F" stroke-width=".8"/>
    <path d="M4.5 12.5 20 21.3V36.5L4.5 27.7V12.5Z" fill="url(#cube-left)" stroke="#68D6A3" stroke-width=".8"/>
    <path d="M20 21.3 35.5 12.5V27.7L20 36.5V21.3Z" fill="url(#cube-right)" stroke="#77EAC0" stroke-width=".8"/>
    <path d="M20 3.5 35.5 12.5 20 21.3 4.5 12.5 20 3.5Z" fill="url(#cube-top)" stroke="#A0F0C9" stroke-width="1"/>
    <path d="M5.8 12.5 20 4.3 34.2 12.5" stroke="#E0FFF0" stroke-opacity=".6" stroke-width=".5" fill="none"/>
    <path d="M6 14.1 19.2 21.8V34.2L6 26.9V14.1Z" fill="url(#face-gloss-left)" opacity=".7"/>
    <path d="M21 22 34 14.7V26.9L21 34.2V22Z" fill="url(#face-gloss-right)" opacity=".52"/>
    <path d="M8 12.5 20 5.6 31.7 12.4 20 19.2 8 12.5Z" fill="url(#top-gloss)" opacity=".7"/>
    <path d="M8.5 13.2 20 20 31.5 13.2" stroke="#D6FFF0" stroke-opacity=".75" stroke-width=".45" fill="none"/>
    <path d="M20 17.7V9.2M20 13.7 14.6 10.7M20 13.7 25.4 10.7" stroke="#073F32" stroke-width="3.1" stroke-linecap="round" opacity=".7"/>
    <path d="M20 17.3V9M20 13.4 14.6 10.4M20 13.4 25.4 10.4" stroke="url(#circuit-metal)" stroke-width="2.1" stroke-linecap="round"/>
    <circle cx="20" cy="8.1" r="2.2" fill="url(#node-metal)" stroke="#E7FFF4" stroke-width=".35"/><circle cx="13.7" cy="10" r="2" fill="url(#node-metal)" stroke="#E7FFF4" stroke-width=".35"/><circle cx="26.3" cy="10" r="2" fill="url(#node-metal)" stroke="#E7FFF4" stroke-width=".35"/><circle cx="20" cy="21.3" r="1.45" fill="url(#node-metal)" stroke="#D9FFF0" stroke-width=".3"/>
    <circle cx="36.3" cy="3.7" r="2.35" fill="url(#gold-orb)" stroke="#FBE4A3" stroke-width=".25"/>
    <ellipse cx="35.55" cy="2.95" rx=".7" ry=".4" fill="#FFF7D5" opacity=".82"/>
  </g>`;
  const inner = maskable ? `<g transform="translate(5.6 5.6)"><g transform="scale(.72)">${mark}</g></g>` : mark;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 40 40"><defs>
    <linearGradient id="cube-top" x1="6" y1="4" x2="31" y2="20"><stop stop-color="#9AF4C5"/><stop offset=".32" stop-color="#27C983"/><stop offset="1" stop-color="#087149"/></linearGradient>
    <linearGradient id="cube-left" x1="4" y1="13" x2="20" y2="36"><stop stop-color="#18A875"/><stop offset=".48" stop-color="#08724F"/><stop offset="1" stop-color="#034332"/></linearGradient>
    <linearGradient id="cube-right" x1="19" y1="19" x2="36" y2="34"><stop stop-color="#19B982"/><stop offset=".5" stop-color="#087A59"/><stop offset="1" stop-color="#034536"/></linearGradient>
    <linearGradient id="cube-side-shadow" x1="20" y1="20" x2="20" y2="38"><stop stop-color="#07523F"/><stop offset="1" stop-color="#021E18"/></linearGradient>
    <linearGradient id="face-gloss-left" x1="5" y1="14" x2="19" y2="24"><stop stop-color="#E2FFF0" stop-opacity=".42"/><stop offset="1" stop-color="#E2FFF0" stop-opacity="0"/></linearGradient>
    <linearGradient id="face-gloss-right" x1="21" y1="22" x2="35" y2="28"><stop stop-color="#DFFFF2" stop-opacity=".3"/><stop offset="1" stop-color="#DFFFF2" stop-opacity="0"/></linearGradient>
    <linearGradient id="top-gloss" x1="20" y1="5" x2="20" y2="20"><stop stop-color="#F4FFF8" stop-opacity=".68"/><stop offset="1" stop-color="#9AF4C5" stop-opacity="0"/></linearGradient>
    <linearGradient id="circuit-metal" x1="14" y1="9" x2="26" y2="18"><stop stop-color="#FFFFFF"/><stop offset=".52" stop-color="#D7E8E2"/><stop offset="1" stop-color="#91B2A7"/></linearGradient>
    <radialGradient id="node-metal" cx=".35" cy=".28"><stop stop-color="#FFFFFF"/><stop offset=".55" stop-color="#E5F2ED"/><stop offset="1" stop-color="#99B9AD"/></radialGradient>
    <radialGradient id="gold-orb" cx=".32" cy=".25"><stop stop-color="#FFF1B6"/><stop offset=".48" stop-color="#F6D36E"/><stop offset="1" stop-color="#C28A28"/></radialGradient>
  </defs><rect width="40" height="40" fill="#173F30"/>${inner}</svg>`;
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
