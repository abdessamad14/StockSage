#!/usr/bin/env node

/**
 * Build and package StockSage for deployment without touching the dev tree.
 *
 * Usage: node scripts/build-package.js [--branch main] [--out ../packages]
 */

import { execSync, spawnSync } from 'child_process';
import { mkdtempSync, rmSync, existsSync, mkdirSync, cpSync, readdirSync, readFileSync } from 'fs';
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
    
    // Remove Mac-compiled better-sqlite3 binary and download Windows version for Node v16
    console.log('🔧 Downloading Windows binaries for better-sqlite3 (Node.js v16)...');
    const betterSqlitePath = resolve('release', 'node_modules', 'better-sqlite3');
    const buildPath = join(betterSqlitePath, 'build');
    
    // Remove Mac build
    if (existsSync(buildPath)) {
      rmSync(buildPath, { recursive: true, force: true });
      console.log('   Removed Mac binaries');
    }
    
    // Download Windows prebuild for Node.js v16.20.2 specifically
    // NODE_MODULE_VERSION 93 is for Node v16
    try {
      execSync('npx --yes prebuild-install --runtime=node --target=16.20.2 --platform=win32 --arch=x64', {
        cwd: betterSqlitePath,
        stdio: 'inherit'
      });
      console.log('✅ Windows binaries for Node.js v16 downloaded');
    } catch (error) {
      console.log('⚠️  Failed to download prebuilt binaries');
      console.log('   Trying alternative approach...');
      
      // Alternative: try without specific version (gets latest compatible)
      try {
        execSync('npx --yes prebuild-install --platform=win32 --arch=x64', {
          cwd: betterSqlitePath,
          stdio: 'inherit'
        });
        console.log('✅ Windows binaries downloaded');
      } catch (err) {
        console.log('❌ Could not download Windows binaries');
        console.log('   The installer may fail on Windows');
        console.log('   Error:', err.message);
      }
    }
    
    // Fix esbuild platform binaries - remove Mac binaries and download Windows binaries
    console.log('🔧 Fixing esbuild platform binaries...');
    const nodeModulesPath = resolve('release', 'node_modules');
    
    // Remove Mac esbuild binaries
    const macEsbuildPaths = [
      join(nodeModulesPath, '@esbuild', 'darwin-arm64'),
      join(nodeModulesPath, '@esbuild', 'darwin-x64')
    ];
    
    macEsbuildPaths.forEach(path => {
      if (existsSync(path)) {
        rmSync(path, { recursive: true, force: true });
        console.log(`   Removed ${path.split('/').pop()}`);
      }
    });
    
    // Download Windows esbuild binary manually (npm install won't work on Mac)
    const esbuildVersion = '0.25.0'; // MUST match the version in package.json
    const esbuildWinPkgPath = join(nodeModulesPath, '@esbuild', 'win32-x64');
    
    try {
      // Create @esbuild directory if it doesn't exist
      const esbuildDir = join(nodeModulesPath, '@esbuild');
      if (!existsSync(esbuildDir)) {
        mkdirSync(esbuildDir, { recursive: true });
      }
      
      // Download and extract Windows esbuild package
      execSync(`npm pack @esbuild/win32-x64@${esbuildVersion} --pack-destination="${esbuildDir}"`, {
        stdio: 'inherit'
      });
      
      // Extract the tarball
      const tarball = join(esbuildDir, `esbuild-win32-x64-${esbuildVersion}.tgz`);
      if (existsSync(tarball)) {
        execSync(`tar -xzf "${tarball}" -C "${esbuildDir}"`, {
          stdio: 'inherit'
        });
        
        // Move package contents to final location
        const packageDir = join(esbuildDir, 'package');
        if (existsSync(packageDir)) {
          cpSync(packageDir, esbuildWinPkgPath, { recursive: true });
          rmSync(packageDir, { recursive: true, force: true });
        }
        
        // Clean up tarball
        rmSync(tarball, { force: true });
        console.log('✅ Windows esbuild binaries installed');
      }
    } catch (error) {
      console.log('⚠️  Failed to install Windows esbuild binaries');
      console.log('   Error:', error.message);
    }
    
    // Fix rollup platform binaries - remove Mac binaries and download Windows binaries
    console.log('🔧 Fixing rollup platform binaries...');
    
    // Remove Mac rollup binaries
    const macRollupPaths = [
      join(nodeModulesPath, '@rollup', 'rollup-darwin-arm64'),
      join(nodeModulesPath, '@rollup', 'rollup-darwin-x64')
    ];
    
    macRollupPaths.forEach(path => {
      if (existsSync(path)) {
        rmSync(path, { recursive: true, force: true });
        console.log(`   Removed ${path.split('/').pop()}`);
      }
    });
    
    // Get rollup version from node_modules
    const rollupPkgJson = join(nodeModulesPath, 'rollup', 'package.json');
    let rollupVersion = '4.24.4'; // default fallback
    if (existsSync(rollupPkgJson)) {
      try {
        const rollupPkg = JSON.parse(readFileSync(rollupPkgJson, 'utf8'));
        rollupVersion = rollupPkg.version;
        console.log(`   Detected rollup version: ${rollupVersion}`);
      } catch (e) {
        console.log(`   Using default rollup version: ${rollupVersion}`);
      }
    }
    
    const rollupWinPkgPath = join(nodeModulesPath, '@rollup', 'rollup-win32-x64-msvc');
    
    try {
      // Create @rollup directory if it doesn't exist
      const rollupDir = join(nodeModulesPath, '@rollup');
      if (!existsSync(rollupDir)) {
        mkdirSync(rollupDir, { recursive: true });
      }
      
      // Download and extract Windows rollup package
      execSync(`npm pack @rollup/rollup-win32-x64-msvc@${rollupVersion} --pack-destination="${rollupDir}"`, {
        stdio: 'inherit'
      });
      
      // Extract the tarball
      const tarball = join(rollupDir, `rollup-rollup-win32-x64-msvc-${rollupVersion}.tgz`);
      if (existsSync(tarball)) {
        execSync(`tar -xzf "${tarball}" -C "${rollupDir}"`, {
          stdio: 'inherit'
        });
        
        // Move package contents to final location
        const packageDir = join(rollupDir, 'package');
        if (existsSync(packageDir)) {
          cpSync(packageDir, rollupWinPkgPath, { recursive: true });
          rmSync(packageDir, { recursive: true, force: true });
        }
        
        // Clean up tarball
        rmSync(tarball, { force: true });
        console.log('✅ Windows rollup binaries installed');
      }
    } catch (error) {
      console.log('⚠️  Failed to install Windows rollup binaries');
      console.log('   Error:', error.message);
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
