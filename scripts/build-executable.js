#!/usr/bin/env node

/**
 * Build secure Windows executable with obfuscated code
 * This script:
 * 1. Builds the frontend
 * 2. Compiles TypeScript server code
 * 3. Obfuscates the compiled server code
 * 4. Packages everything into a single .exe using pkg
 */

import { execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync, cpSync, writeFileSync } from 'fs';
import { join } from 'path';

const projectRoot = process.cwd();

console.log('🎁 Building Secure Windows Executable...\n');
console.log('========================================\n');

// Step 1: Clean build directories
console.log('🧹 Step 1/6: Cleaning build directories...');
const buildDirs = ['dist', 'server-compiled', 'server-obfuscated', 'build-exe'];
for (const dir of buildDirs) {
  const dirPath = join(projectRoot, dir);
  if (existsSync(dirPath)) {
    rmSync(dirPath, { recursive: true, force: true });
  }
}
console.log('✅ Clean complete\n');

// Step 2: Build frontend
console.log('🎨 Step 2/6: Building frontend...');
try {
  execSync('npm run build', { stdio: 'inherit', cwd: projectRoot });
  console.log('✅ Frontend build complete\n');
} catch (error) {
  console.error('❌ Frontend build failed');
  process.exit(1);
}

// Step 3: Transpile server code with esbuild (fast, no type checking)
console.log('📦 Step 3/6: Transpiling server code...');
try {
  // Create server-compiled directory
  mkdirSync(join(projectRoot, 'server-compiled'), { recursive: true });
  
  // Transpile all TypeScript files to JavaScript without bundling
  const transpileCmd = `npx esbuild server/**/*.ts --outdir=server-compiled --platform=node --format=esm --target=node18 --loader:.node=copy`;
  
  execSync(transpileCmd, { stdio: 'inherit', cwd: projectRoot });
  console.log('✅ Server transpilation complete\n');
} catch (error) {
  console.error('❌ Server transpilation failed');
  process.exit(1);
}

// Step 4: Obfuscate compiled server code
console.log('🔒 Step 4/5: Obfuscating server code...');
try {
  execSync('node scripts/obfuscate-server.js', { stdio: 'inherit', cwd: projectRoot });
  console.log('✅ Obfuscation complete\n');
} catch (error) {
  console.error('❌ Obfuscation failed');
  process.exit(1);
}

// Step 5: Build executable with pkg
console.log('🔨 Step 5/5: Building Windows executable with pkg...');
console.log('⏳ This may take a few minutes...\n');

const buildDir = join(projectRoot, 'build-exe');
mkdirSync(buildDir, { recursive: true });

try {
  // pkg command with proper configuration
  const pkgCommand = [
    'npx pkg',
    'server-obfuscated/pkg-entry.js',
    '--target node18-win-x64',
    '--output build-exe/igoodar-server.exe',
    '--compress Brotli',
    '--public',
    '--no-bytecode'
  ].join(' ');

  execSync(pkgCommand, { stdio: 'inherit', cwd: projectRoot });
  
  console.log('\n✅ Executable built successfully!\n');
} catch (error) {
  console.error('❌ pkg build failed');
  process.exit(1);
}

// Copy necessary files to build directory
console.log('📋 Copying additional files...');

// Copy dist folder
cpSync(join(projectRoot, 'dist'), join(buildDir, 'dist'), { recursive: true });
console.log('  ✓ dist/ (frontend build)');

// Copy data folder structure (empty, will be initialized on first run)
mkdirSync(join(buildDir, 'data'), { recursive: true });
console.log('  ✓ data/ (database folder)');

// Copy shared folder
cpSync(join(projectRoot, 'shared'), join(buildDir, 'shared'), { recursive: true });
console.log('  ✓ shared/ (schema files)');

// Copy scripts folder (for database initialization)
cpSync(join(projectRoot, 'scripts'), join(buildDir, 'scripts'), { recursive: true });
console.log('  ✓ scripts/ (initialization scripts)');

// Create startup script for Windows
const startupScript = `@echo off
echo ========================================
echo    Starting Igoodar
echo ========================================
echo.

REM Start the executable
start /B igoodar-server.exe

REM Wait for server to start
timeout /t 3 /nobreak >nul

REM Open browser
start http://localhost:5003

echo.
echo ✅ Igoodar is running!
echo 📱 Access from mobile: http://[YOUR-PC-IP]:5003
echo.
echo Press Ctrl+C to stop the server
pause
`;

writeFileSync(join(buildDir, 'start-igoodar.bat'), startupScript, 'utf8');
console.log('  ✓ start-igoodar.bat');

console.log('\n========================================');
console.log('  ✅ BUILD COMPLETE!');
console.log('========================================\n');

console.log('📦 Output location: build-exe/\n');
console.log('📋 Contents:');
console.log('  • igoodar-server.exe (obfuscated, single executable)');
console.log('  • dist/ (frontend files)');
console.log('  • data/ (database - auto-initialized on first run)');
console.log('  • scripts/ (initialization scripts)');
console.log('  • start-igoodar.bat (startup script)\n');

console.log('🚀 To test:');
console.log('  1. cd build-exe');
console.log('  2. start-igoodar.bat\n');

console.log('📱 Mobile Access:');
console.log('  - Server listens on 0.0.0.0:5003');
console.log('  - Access from phone: http://[YOUR-PC-IP]:5003\n');
