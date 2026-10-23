const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

function createIco(pngBuffers) {
  // pngBuffers: array of { width, height, buffer }
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(count, 4); // count

  let offset = 6 + count * 16;
  const dirEntries = [];

  for (const item of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(item.width >= 256 ? 0 : item.width, 0);
    entry.writeUInt8(item.height >= 256 ? 0 : item.height, 1);
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(item.buffer.length, 8); // size
    entry.writeUInt32LE(offset, 12); // offset
    dirEntries.push(entry);
    offset += item.buffer.length;
  }

  return Buffer.concat([
    header,
    ...dirEntries,
    ...pngBuffers.map((b) => b.buffer),
  ]);
}

async function run() {
  const root = process.cwd();
  const svgPath = path.join(root, "public", "logo.svg");
  const svgContent = fs.readFileSync(svgPath);

  // Sizes for icons
  const s16 = await sharp(svgContent).resize(16, 16).png().toBuffer();
  const s32 = await sharp(svgContent).resize(32, 32).png().toBuffer();
  const s48 = await sharp(svgContent).resize(48, 48).png().toBuffer();
  const s64 = await sharp(svgContent).resize(64, 64).png().toBuffer();
  const s180 = await sharp(svgContent).resize(180, 180).png().toBuffer();
  const s192 = await sharp(svgContent).resize(192, 192).png().toBuffer();
  const s512 = await sharp(svgContent).resize(512, 512).png().toBuffer();

  // Create favicon.ico with 16, 32, 48
  const icoBuffer = createIco([
    { width: 16, height: 16, buffer: s16 },
    { width: 32, height: 32, buffer: s32 },
    { width: 48, height: 48, buffer: s48 },
  ]);

  // Write favicon.ico to public and src/app
  fs.writeFileSync(path.join(root, "public", "favicon.ico"), icoBuffer);
  fs.writeFileSync(path.join(root, "src", "app", "favicon.ico"), icoBuffer);
  fs.writeFileSync(path.join(root, "public", "favicon-32x32.png"), s32);
  fs.writeFileSync(path.join(root, "public", "favicon-16x16.png"), s16);

  // Write Next.js App Router special icon files
  fs.writeFileSync(path.join(root, "src", "app", "icon.svg"), svgContent);
  fs.writeFileSync(path.join(root, "src", "app", "apple-icon.png"), s180);

  // Write standard PNGs to public
  fs.writeFileSync(path.join(root, "public", "apple-touch-icon.png"), s180);
  fs.writeFileSync(path.join(root, "public", "icon-192x192.png"), s192);
  fs.writeFileSync(path.join(root, "public", "icon-512x512.png"), s512);

  // Write maskables
  const maskable192 = await sharp(svgContent)
    .resize(192, 192)
    .extend({
      top: 24,
      bottom: 24,
      left: 24,
      right: 24,
      background: { r: 5, g: 150, b: 105, alpha: 1 },
    })
    .resize(192, 192)
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(root, "public", "maskable-icon-192x192.png"), maskable192);

  const maskable512 = await sharp(svgContent)
    .resize(512, 512)
    .extend({
      top: 64,
      bottom: 64,
      left: 64,
      right: 64,
      background: { r: 5, g: 150, b: 105, alpha: 1 },
    })
    .resize(512, 512)
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(root, "public", "maskable-icon-512x512.png"), maskable512);

  console.log("Successfully generated all FinSage AI favicons, ICO, and app icons!");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
