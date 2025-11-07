#!/usr/bin/env node

const fs = require('fs/promises');
const path = require('path');

async function ensureFallback() {
  const projectRoot = process.cwd();
  const outputDir = path.join(projectRoot, 'dist', 'FinPocket');
  const browserDir = path.join(outputDir, 'browser');

  const candidates = [
    path.join(browserDir, 'index.html'),
    path.join(outputDir, 'index.html'),
  ];

  let sourcePath;
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      sourcePath = candidate;
      break;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  if (!sourcePath) {
    console.warn('[create-404] index.html не найден, пропускаем создание 404.html');
    return;
  }

  const html = await fs.readFile(sourcePath, 'utf8');
  const targets = new Set([
    path.join(outputDir, '404.html'),
    path.join(browserDir, '404.html'),
  ]);

  for (const target of targets) {
    const directory = path.dirname(target);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(target, html, 'utf8');
    console.log(`[create-404] Скопирован fallback: ${path.relative(projectRoot, target)}`);
  }
}

ensureFallback().catch((error) => {
  console.error('[create-404] Ошибка создания fallback страницы:', error);
  process.exitCode = 1;
});
