// MatchFav favicon 生成スクリプト (T-41 / bold heart v16)
// scripts/favicon/heart-v16.svg を元に icon.png(512) / apple-icon.png(180) を生成。
// 使い方: node scripts/favicon/generate.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(here, '../../src/app');
const svgPath = resolve(here, 'heart-v16.svg');

async function main() {
  const svg = await readFile(svgPath);

  // icon.png: 512x512（透過 RGBA を維持）
  const icon = await sharp(svg, { density: 384 })
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(resolve(appDir, 'icon.png'), icon);

  // apple-icon.png: 180x180（Apple は透過を黒で塗るため不透明背景にする）
  const apple = await sharp(svg, { density: 384 })
    .resize(180, 180, { fit: 'contain', background: { r: 11, g: 18, b: 32, alpha: 1 } })
    .flatten({ background: { r: 11, g: 18, b: 32 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
  await writeFile(resolve(appDir, 'apple-icon.png'), apple);

  console.log('生成完了: src/app/icon.png (512), src/app/apple-icon.png (180)');
}

main().catch((err) => {
  console.error('favicon 生成に失敗:', err);
  process.exit(1);
});
