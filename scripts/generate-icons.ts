import sharp from "sharp";
import fs from "fs";
import path from "path";

const svgPath = path.join(process.cwd(), "public", "logo.svg");
const outDir = path.join(process.cwd(), "public");

async function main() {
  const sizes = [192, 512];
  for (const size of sizes) {
    const png = await sharp(svgPath).png().resize(size, size).toBuffer();
    fs.writeFileSync(path.join(outDir, `icon-${size}x${size}.png`), png);
    // maskable variant
    const maskable = await sharp(svgPath)
      .png()
      .resize(size, size)
      .extend({
        top: size * 0.25,
        bottom: size * 0.25,
        left: size * 0.25,
        right: size * 0.25,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .toBuffer();
    fs.writeFileSync(path.join(outDir, `maskable-icon-${size}x${size}.png`), maskable);
    console.log(`Generated icon-${size}x${size}.png and maskable-icon-${size}x${size}.png`);
  }
}

main().catch(console.error);
