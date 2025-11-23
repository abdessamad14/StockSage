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
const archiveName = `stocksage-${timestamp}.zip`;

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
    'start-background.vbs',
    'uninstall.bat',
    'update.bat',
    'fix-windows.bat',
    'debug-install.bat',
    'README.md',
    'README-WINDOWS.md',
    'INSTALL-README.txt',
    'UPDATE-GUIDE.md',
    'LICENSE.txt',
    'package.json',
    'package-lock.json'
  ];

  for (const item of filesToCopy) {
    const src = resolve(item);
    const dest = resolve('release', item);
    // Skip if file doesn't exist (optional files)
    if (!existsSync(src)) {
      console.log(`⊙ Skipping ${item} (not found)`);
      continue;
    }
    cpSync(src, dest, { recursive: true });
  }

  // Include node_modules for true offline installation
  console.log('📦 Including node_modules for offline installation...');
  const nodeModulesSource = join(repoPath, 'node_modules');
  if (existsSync(nodeModulesSource)) {
    const nodeModulesDest = resolve('release', 'node_modules');
    cpSync(nodeModulesSource, nodeModulesDest, { recursive: true });
    console.log('✅ node_modules included');
    
    // Remove Mac-compiled better-sqlite3 binary and download Windows version
    console.log('🔧 Downloading Windows binaries for better-sqlite3...');
    const betterSqlitePath = resolve('release', 'node_modules', 'better-sqlite3');
    const buildPath = join(betterSqlitePath, 'build');
    
    // Remove Mac build
    if (existsSync(buildPath)) {
      rmSync(buildPath, { recursive: true, force: true });
      console.log('   Removed Mac binaries');
    }
    
    // Download Windows prebuild using npm
    try {
      execSync('npm rebuild better-sqlite3 --platform=win32 --arch=x64', {
        cwd: resolve('release'),
        stdio: 'inherit'
      });
      console.log('✅ Windows binaries downloaded');
    } catch (error) {
      console.log('⚠️  Failed to download Windows binaries automatically');
      console.log('   Will try alternative method...');
      
      // Alternative: use prebuild-install
      try {
        execSync('npx prebuild-install --platform=win32 --arch=x64', {
          cwd: betterSqlitePath,
          stdio: 'inherit'
        });
        console.log('✅ Windows binaries downloaded via prebuild-install');
      } catch (err) {
        console.log('❌ Could not download Windows binaries');
        console.log('   The installer may fail on Windows');
      }
    }
  } else {
    console.log('⚠️  node_modules not found - run npm install first');
  }

  // Check if nodejs portable exists in source repo and copy it
  const nodejsPortableSource = join(repoPath, 'nodejs');
  if (existsSync(nodejsPortableSource)) {
    console.log('📦 Including Node.js portable for offline installation...');
    const nodejsPortableDest = resolve('release', 'nodejs');
    cpSync(nodejsPortableSource, nodejsPortableDest, { recursive: true });
    console.log('✅ Node.js portable included');
  } else {
    console.log('⚠️  Node.js portable not found - package will require internet or system Node.js');
    console.log('   Run: ./scripts/download-nodejs-portable.sh to include Node.js portable');
  }

  const releaseName = `stocksage-${timestamp}`;
  const releaseOutputDir = join(outDir, releaseName);

  console.log('🚚 Copying release to output directory...');
  mkdirSync(outDir, { recursive: true });
  rmSync(releaseOutputDir, { recursive: true, force: true });
  cpSync(resolve('release'), releaseOutputDir, { recursive: true });

  console.log('🗜️ Creating ZIP archive...');
  const archivePath = join(outDir, archiveName);
  const zipResult = spawnSync('zip', ['-r', '-q', archivePath, releaseName], {
    cwd: outDir,
    stdio: 'inherit'
  });

  if (zipResult.status !== 0) {
    throw new Error('zip command failed');
  }

  console.log(`✅ Package ready: ${archivePath}`);
  console.log(`📂 Release folder: ${releaseOutputDir}`);
} finally {
  console.log('🧽 Cleaning up temp directory...');
  process.chdir(repoPath);
  rmSync(tempDir, { recursive: true, force: true });
}
