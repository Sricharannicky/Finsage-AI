import sharp from "sharp";
import fs from "fs";
import path from "path";

const svgPath = path.join(process.cwd(), "public", "logo.svg");
const outDir = path.join(process.cwd(), "android", "app", "src", "main", "res");

const sizes = {
  "mipmap-mdpi": 48,
  "mipmap-hdpi": 72,
  "mipmap-xhdpi": 96,
  "mipmap-xxhdpi": 144,
  "mipmap-xxxhdpi": 192,
};

async function main() {
  for (const [dir, px] of Object.entries(sizes)) {
    const png = await sharp(svgPath).png().resize(px, px).toBuffer();
    fs.writeFileSync(path.join(outDir, dir, "ic_launcher.png"), png);
    fs.writeFileSync(path.join(outDir, dir, "ic_launcher_round.png"), png);
    // foreground (for adaptive icon)
    const fg = await sharp(svgPath).png().resize(px, px).toBuffer();
    fs.writeFileSync(path.join(outDir, dir, "ic_launcher_foreground.png"), fg);
    console.log(`Generated ${dir} icons (${px}px)`);
  }
  console.log("Done!");
}

main().catch(console.error);
