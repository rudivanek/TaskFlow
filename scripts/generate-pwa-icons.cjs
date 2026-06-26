const sharp = require('sharp');
const path = require('path');

const outputDir = path.join(__dirname, '../public');

// The TaskFlow favicon SVG (blue checkbox square)
const svgSource = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <rect x="0" y="0" width="24" height="24" rx="4" fill="#2563eb"/>
  <polyline points="9 11 12 14 22 4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`);

async function generate() {
  const sizes = [64, 192, 512];
  for (const size of sizes) {
    await sharp(svgSource, { density: Math.round(size / 24 * 72) })
      .resize(size, size)
      .png()
      .toFile(path.join(outputDir, `pwa-${size}.png`));
    console.log(`Generated pwa-${size}.png`);
  }

  await sharp(svgSource, { density: Math.round(180 / 24 * 72) })
    .resize(180, 180)
    .png()
    .toFile(path.join(outputDir, 'apple-touch-icon.png'));
  console.log('Generated apple-touch-icon.png');

  // favicon.png for legacy support
  await sharp(svgSource, { density: Math.round(32 / 24 * 72) })
    .resize(32, 32)
    .png()
    .toFile(path.join(outputDir, 'favicon.png'));
  console.log('Generated favicon.png');
}

generate().catch(err => { console.error(err); process.exit(1); });
