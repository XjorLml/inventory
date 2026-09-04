/**
 * Icon Generation Script
 * Generates all PWA icons, favicon, and apple-touch-icon from the master SVG.
 *
 * Usage: node scripts/generate-icons.mjs
 */
import sharp from "sharp";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

const ROOT = join(import.meta.dirname, "..");
const ICONS_DIR = join(ROOT, "public", "icons");
const SRC_APP_DIR = join(ROOT, "src", "app");
const SVG_PATH = join(ICONS_DIR, "icon.svg");

// PWA icon sizes required by the manifest + apple-touch-icon + favicon sizes
const PWA_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const APPLE_TOUCH_SIZE = 180;
const FAVICON_SIZES = [16, 32, 48];

/**
 * Creates a minimal .ico file from PNG buffers.
 * ICO format: ICONDIR header + ICONDIRENTRY per image + embedded PNG data.
 */
function createIco(pngBuffers) {
  const HEADER_SIZE = 6;
  const ENTRY_SIZE = 16;
  const totalEntries = pngBuffers.length;

  // Calculate offsets: data starts after header + all entries
  const dataOffset = HEADER_SIZE + totalEntries * ENTRY_SIZE;

  // ICONDIR header
  const header = Buffer.alloc(HEADER_SIZE);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(totalEntries, 4); // image count

  // Build entries and collect data
  const entries = [];
  const dataChunks = [];
  let currentOffset = dataOffset;

  for (const { size, png } of pngBuffers) {
    const entry = Buffer.alloc(ENTRY_SIZE);
    entry.writeUInt8(size === 256 ? 0 : size, 0); // width (0 = 256)
    entry.writeUInt8(size === 256 ? 0 : size, 1); // height (0 = 256)
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(png.length, 8); // data size
    entry.writeUInt32LE(currentOffset, 12); // data offset

    entries.push(entry);
    dataChunks.push(png);
    currentOffset += png.length;
  }

  return Buffer.concat([header, ...entries, ...dataChunks]);
}

async function main() {
  console.log("🎨 Generating icons from master SVG...\n");

  // Read the master SVG
  const svgBuffer = readFileSync(SVG_PATH);

  // Ensure output directories exist
  mkdirSync(ICONS_DIR, { recursive: true });

  // --- Generate PWA PNG icons ---
  console.log("📦 PWA icons:");
  for (const size of PWA_SIZES) {
    const filename = `icon-${size}x${size}.png`;
    const outPath = join(ICONS_DIR, filename);
    await sharp(svgBuffer).resize(size, size).png().toFile(outPath);
    console.log(`   ✅ ${filename} (${size}x${size})`);
  }

  // --- Generate apple-touch-icon ---
  console.log("\n🍎 Apple touch icon:");
  const applePath = join(ICONS_DIR, "apple-touch-icon.png");
  await sharp(svgBuffer).resize(APPLE_TOUCH_SIZE, APPLE_TOUCH_SIZE).png().toFile(applePath);
  console.log(`   ✅ apple-touch-icon.png (${APPLE_TOUCH_SIZE}x${APPLE_TOUCH_SIZE})`);

  // Also place in src/app/ for Next.js auto-detection
  const appleSrcPath = join(SRC_APP_DIR, "apple-icon.png");
  await sharp(svgBuffer).resize(APPLE_TOUCH_SIZE, APPLE_TOUCH_SIZE).png().toFile(appleSrcPath);
  console.log(`   ✅ src/app/apple-icon.png (${APPLE_TOUCH_SIZE}x${APPLE_TOUCH_SIZE})`);

  // --- Generate favicon PNGs and combine into .ico ---
  console.log("\n🔑 Favicon:");
  const icoParts = [];
  for (const size of FAVICON_SIZES) {
    const png = await sharp(svgBuffer).resize(size, size).png().toBuffer();
    icoParts.push({ size, png });

    // Also save individual PNG favicons for modern browsers
    const pngPath = join(ICONS_DIR, `favicon-${size}x${size}.png`);
    writeFileSync(pngPath, png);
    console.log(`   ✅ favicon-${size}x${size}.png`);
  }

  // Create .ico file
  const icoBuffer = createIco(icoParts);
  const icoPath = join(SRC_APP_DIR, "favicon.ico");
  writeFileSync(icoPath, icoBuffer);
  console.log(`   ✅ src/app/favicon.ico (${FAVICON_SIZES.join("+")}px)`);

  // Also save a favicon.svg for modern browsers
  const faviconSvgPath = join(ICONS_DIR, "favicon.svg");
  writeFileSync(faviconSvgPath, svgBuffer);
  console.log(`   ✅ favicon.svg`);

  // --- Copy master SVG to public root for direct access ---
  const publicSvgPath = join(ROOT, "public", "icon.svg");
  writeFileSync(publicSvgPath, svgBuffer);
  console.log(`   ✅ public/icon.svg`);

  console.log("\n🎉 All icons generated successfully!");
  console.log(`\n📁 Output locations:`);
  console.log(`   public/icons/  - PWA manifest icons + apple-touch-icon`);
  console.log(`   src/app/       - favicon.ico + apple-icon.png (Next.js auto-detect)`);
}

main().catch((err) => {
  console.error("❌ Error generating icons:", err);
  process.exit(1);
});
