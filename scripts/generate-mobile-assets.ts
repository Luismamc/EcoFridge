/**
 * Script para generar iconos y splash screens para Android e iOS
 * Uso: npx tsx scripts/generate-mobile-assets.ts
 */
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

const SOURCE_ICON = path.join(__dirname, '../public/icon.png');
const OUTPUT_DIR = path.join(__dirname, '../mobile-resources');

async function generateRoundedIcon(inputPath: string, outputPath: string, size: number) {
  const roundedSize = Math.max(1, size);
  await sharp(inputPath)
    .resize(roundedSize, roundedSize, { fit: 'cover' })
    .composite([{
      input: Buffer.from(
        `<svg width="${roundedSize}" height="${roundedSize}">
          <rect x="0" y="0" width="${roundedSize}" height="${roundedSize}" rx="${roundedSize * 0.2}" ry="${roundedSize * 0.2}" fill="white"/>
        </svg>`
      ),
      blend: 'dest-in',
    }])
    .png()
    .toFile(outputPath);
}

async function generateSplash(inputPath: string, outputPath: string, width: number, height: number) {
  const iconSize = Math.floor(Math.min(width, height) * 0.25);
  const bgBuffer = await sharp({
    create: {
      width, height, channels: 3,
      background: { r: 22, g: 163, b: 74 },
    },
  }).png().toBuffer();

  const iconBuffer = await sharp(inputPath)
    .resize(iconSize, iconSize, { fit: 'contain', background: { r: 22, g: 163, b: 74, alpha: 0 } })
    .png().toBuffer();

  const position = Math.floor((height - iconSize) / 2);
  await sharp(bgBuffer)
    .composite([{
      input: iconBuffer,
      top: position - iconSize * 0.15,
      left: Math.floor((width - iconSize) / 2),
    }])
    .png()
    .toFile(outputPath);
}

async function main() {
  if (!fs.existsSync(SOURCE_ICON)) {
    console.error(`Icono fuente no encontrado: ${SOURCE_ICON}`);
    process.exit(1);
  }

  const ANDROID_ICONS = [
    { name: 'mipmap-mdpi/ic_launcher.png', size: 48, round: false },
    { name: 'mipmap-mdpi/ic_launcher_round.png', size: 48, round: true },
    { name: 'mipmap-hdpi/ic_launcher.png', size: 72, round: false },
    { name: 'mipmap-hdpi/ic_launcher_round.png', size: 72, round: true },
    { name: 'mipmap-xhdpi/ic_launcher.png', size: 96, round: false },
    { name: 'mipmap-xhdpi/ic_launcher_round.png', size: 96, round: true },
    { name: 'mipmap-xxhdpi/ic_launcher.png', size: 144, round: false },
    { name: 'mipmap-xxhdpi/ic_launcher_round.png', size: 144, round: true },
    { name: 'mipmap-xxxhdpi/ic_launcher.png', size: 192, round: false },
    { name: 'mipmap-xxxhdpi/ic_launcher_round.png', size: 192, round: true },
  ];

  const PWA_ICONS = [
    { name: 'icon-72x72.png', size: 72 },
    { name: 'icon-96x96.png', size: 96 },
    { name: 'icon-128x128.png', size: 128 },
    { name: 'icon-144x144.png', size: 144 },
    { name: 'icon-152x152.png', size: 152 },
    { name: 'icon-192x192.png', size: 192 },
    { name: 'icon-384x384.png', size: 384 },
    { name: 'icon-512x512.png', size: 512 },
  ];

  const ANDROID_SPLASH = [
    { name: 'drawable-mdpi/splash.png', width: 480, height: 800 },
    { name: 'drawable-hdpi/splash.png', width: 720, height: 1280 },
    { name: 'drawable-xhdpi/splash.png', width: 960, height: 1600 },
    { name: 'drawable-xxhdpi/splash.png', width: 1440, height: 2560 },
    { name: 'drawable-xxxhdpi/splash.png', width: 1920, height: 3200 },
  ];

  // Create dirs
  ['android/app/src/main/res', 'ios/App/Assets.xcassets/AppIcon.appiconset', 'public']
    .forEach(d => fs.mkdirSync(path.join(OUTPUT_DIR, d), { recursive: true }));

  console.log('Generando iconos Android...');
  for (const icon of ANDROID_ICONS) {
    const out = path.join(OUTPUT_DIR, 'android/app/src/main/res', icon.name);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    if (icon.round) {
      await generateRoundedIcon(SOURCE_ICON, out, icon.size);
    } else {
      await sharp(SOURCE_ICON).resize(icon.size, icon.size, { fit: 'cover' }).png().toFile(out);
    }
    console.log(`  OK ${icon.name}`);
  }

  console.log('Generando splash screens Android...');
  for (const s of ANDROID_SPLASH) {
    const out = path.join(OUTPUT_DIR, 'android/app/src/main/res', s.name);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await generateSplash(SOURCE_ICON, out, s.width, s.height);
    console.log(`  OK ${s.name}`);
  }

  console.log('Generando iconos PWA...');
  for (const icon of PWA_ICONS) {
    const out = path.join(OUTPUT_DIR, 'public', icon.name);
    await sharp(SOURCE_ICON).resize(icon.size, icon.size, { fit: 'cover' }).png().toFile(out);
    console.log(`  OK ${icon.name}`);
  }

  console.log(`\nRecursos generados en: ${OUTPUT_DIR}`);
}

main().catch(console.error);
