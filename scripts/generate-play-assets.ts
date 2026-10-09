import sharp from "sharp";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "play");
const LOGO = join(process.cwd(), "public", "logo.svg");
mkdirSync(OUT, { recursive: true });

const FONT = "Helvetica, Arial, sans-serif";

const featureGraphicSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0f172a"/>
      <stop offset="0.55" stop-color="#0b3b34"/>
      <stop offset="1" stop-color="#0d9488"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.82" cy="0.25" r="0.75">
      <stop offset="0" stop-color="#34d399" stop-opacity="0.45"/>
      <stop offset="1" stop-color="#34d399" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#34d399"/>
      <stop offset="1" stop-color="#10b981"/>
    </linearGradient>
  </defs>

  <rect width="1024" height="500" fill="url(#bg)"/>
  <rect width="1024" height="500" fill="url(#glow)"/>

  <g fill="none" stroke="#ffffff" stroke-opacity="0.12" stroke-width="2">
    <path d="M660 400 L720 345 L780 365 L840 285 L900 305 L960 205"/>
  </g>
  <path d="M660 400 L720 345 L780 365 L840 285 L900 305 L960 205 L960 445 L660 445 Z"
        fill="#34d399" fill-opacity="0.10"/>

  <text x="366" y="243" font-family="${FONT}" font-size="76" font-weight="700"
        fill="#ffffff" letter-spacing="-1.5">FinSage AI</text>
  <rect x="368" y="276" width="150" height="6" rx="3" fill="url(#accent)"/>
  <text x="368" y="334" font-family="${FONT}" font-size="30" font-weight="400"
        fill="#a7f3d0" letter-spacing="0.4">Budget smarter with an AI financial advisor</text>
</svg>`;

const storeIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="ibg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0f172a"/>
      <stop offset="1" stop-color="#0b3b34"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#ibg)"/>
</svg>`;

async function main() {
  const logoBuffer = readFileSync(LOGO);

  // 1) Play feature graphic: 1024 x 500
  await sharp(Buffer.from(featureGraphicSvg))
    .composite([{ input: logoBuffer, left: 76, top: 130, density: 270 }])
    .png({ compressionLevel: 9 })
    .toFile(join(OUT, "feature-graphic-1024x500.png"));

  // 2) Play store icon: 512 x 512
  await sharp(Buffer.from(storeIconSvg))
    .composite([{ input: logoBuffer, left: 36, top: 36, density: 495 }])
    .png({ compressionLevel: 9 })
    .toFile(join(OUT, "icon-512x512.png"));

  for (const f of ["feature-graphic-1024x500.png", "icon-512x512.png"]) {
    const m = await sharp(join(OUT, f)).metadata();
    console.log(f, "=>", m.width, "x", m.height, `${m.width / m.height} AR`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
