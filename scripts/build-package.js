#!/usr/bin/env node

/**
 * Build and package StockSage for deployment without touching the dev tree.
 *
 * Usage: node scripts/build-package.js [--branch main] [--out ../packages]
 */

import { execSync, spawnSync } from 'child_process';
import { mkdtempSync, rmSync, existsSync, mkdirSync, cpSync, readdirSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve, relative, sep } from 'path';

const args = process.argv.slice(2);
const outIndex = args.indexOf('--out');
const outDir = resolve(outIndex !== -1 ? args[outIndex + 1] : './packages');
const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const tempDir = mkdtempSync(join(tmpdir(), 'stocksage-build-'));

const repoPath = resolve('.');
const archiveName = `stocksage-${timestamp}.tgz`;

console.log(`📦 Creating deployment package ${archiveName}`);
console.log(`🔧 Using temp dir ${tempDir}`);
console.log(`📚 Source repo ${repoPath}`);

const buildDir = join(tempDir, 'build');
mkdirSync(buildDir);
console.log('🔁 Copying repository into isolated workspace...');

const excludedTopLevel = new Set(['.git', 'node_modules', 'data', 'release']);
const outDirRelative = relative(repoPath, outDir);
if (!outDirRelative.startsWith('..') && !outDirRelative.startsWith(sep) && outDirRelative !== '') {
  excludedTopLevel.add(outDirRelative.split(sep)[0]);
}

for (const entry of readdirSync(repoPath, { withFileTypes: true })) {
  if (excludedTopLevel.has(entry.name)) {
    continue;
  }

  const sourcePath = join(repoPath, entry.name);
  const destinationPath = join(buildDir, entry.name);
  cpSync(sourcePath, destinationPath, { recursive: true, force: true });
}

console.log('✅ Repository copied');

try {
  process.chdir(buildDir);

  console.log('📦 Installing and building (npm run setup)...');
  execSync('npm run setup', { stdio: 'inherit' });

  console.log('🧹 Removing local data folder (fresh install will reseed)...');
  if (existsSync('data')) {
    rmSync('data', { recursive: true, force: true });
  }

  console.log('📁 Preparing package workspace...');
  mkdirSync('release');
  const filesToCopy = [
    'dist',
    'server',
    'shared',
    'scripts',
    'drizzle',
    'start.js',
    'start.sh',
    'start.bat',
    'fix-windows.bat',
    'fix-windows-imports.js',
    'README.md',
    'README-WINDOWS.md',
    'package.json',
    'package-lock.json'
  ];

  for (const item of filesToCopy) {
    const src = resolve(item);
    const dest = resolve('release', item);
    cpSync(src, dest, { recursive: true });
  }

  console.log(`📚 Copying node_modules for offline install...`);
  cpSync(resolve('node_modules'), resolve('release', 'node_modules'), { recursive: true });

  const releaseName = `stocksage-${timestamp}`;
  const releaseOutputDir = join(outDir, releaseName);

  console.log('🚚 Copying release to output directory...');
  mkdirSync(outDir, { recursive: true });
  rmSync(releaseOutputDir, { recursive: true, force: true });
  cpSync(resolve('release'), releaseOutputDir, { recursive: true });

  console.log('🗜️ Creating archive...');
  const archivePath = join(outDir, archiveName);
  const tarResult = spawnSync('tar', ['-czf', archivePath, '-C', outDir, releaseName], {
    stdio: 'inherit'
  });

  if (tarResult.status !== 0) {
    throw new Error('tar command failed');
  }

  console.log(`✅ Package ready: ${archivePath}`);
  console.log(`📂 Release folder: ${releaseOutputDir}`);
} finally {
  console.log('🧽 Cleaning up temp directory...');
  process.chdir(repoPath);
  rmSync(tempDir, { recursive: true, force: true });
}
