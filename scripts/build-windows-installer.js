#!/usr/bin/env node

/**
 * Build Windows installer (.exe) on Mac using electron-builder
 * This creates a self-extracting installer that works offline
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

const projectRoot = process.cwd();

console.log('🎁 Building Windows Installer (.exe)...\n');

// Check if we have the latest package
const packagesDir = join(projectRoot, 'packages');
if (!existsSync(packagesDir)) {
  console.error('❌ No packages found. Run: npm run build:package first');
  process.exit(1);
}

// Get latest package
const packages = execSync('ls -t packages/stocksage-*.zip', { encoding: 'utf-8' })
  .trim()
  .split('\n');

if (packages.length === 0) {
  console.error('❌ No packages found. Run: npm run build:package first');
  process.exit(1);
}

const latestPackage = packages[0];
const packageName = latestPackage.replace('packages/', '').replace('.zip', '');

console.log(`📦 Using package: ${packageName}`);

// Create installer directory
const installerDir = join(projectRoot, 'installer-build');
const outputDir = join(installerDir, 'output');

if (existsSync(installerDir)) {
  console.log('🧹 Cleaning old installer build...');
  rmSync(installerDir, { recursive: true, force: true });
}

mkdirSync(installerDir, { recursive: true });
mkdirSync(outputDir, { recursive: true });

// Extract package
console.log('📦 Extracting package...');
execSync(`unzip -q "${latestPackage}" -d "${installerDir}"`);

const extractedDir = join(installerDir, packageName);

// Create installer script (NSIS format - can be built on Mac)
console.log('📝 Creating installer script...');

const nsisScript = `
; NSIS Installer Script for Igoodar
; This can be compiled on Mac using makensis

!define APP_NAME "Igoodar"
!define APP_VERSION "1.0.0"
!define APP_PUBLISHER "Your Company"
!define INSTALL_DIR "$PROGRAMFILES64\\Igoodar"

Name "\${APP_NAME}"
OutFile "${join(outputDir, 'igoodar-setup-1.0.0.exe')}"
InstallDir "\${INSTALL_DIR}"
RequestExecutionLevel admin

Page directory
Page instfiles

Section "Install"
  SetOutPath "$INSTDIR"
  
  ; Copy all files
  File /r "${extractedDir}\\*.*"
  
  ; Create shortcuts
  CreateDirectory "$SMPROGRAMS\\Igoodar"
  
  ; Desktop shortcut - opens browser to app
  CreateShortcut "$DESKTOP\\Igoodar.lnk" "http://localhost:5003" "" "$INSTDIR\\favicon.ico" 0 SW_SHOWNORMAL "" "Open Igoodar POS"
  
  ; Start Menu shortcuts
  CreateShortcut "$SMPROGRAMS\\Igoodar\\Igoodar.lnk" "http://localhost:5003" "" "$INSTDIR\\favicon.ico" 0 SW_SHOWNORMAL "" "Open Igoodar POS"
  CreateShortcut "$SMPROGRAMS\\Igoodar\\Uninstall.lnk" "$INSTDIR\\Uninstall.exe"
  
  ; Create uninstaller
  WriteUninstaller "$INSTDIR\\Uninstall.exe"
  
  ; Install dependencies
  DetailPrint "Installing dependencies (this may take a few minutes)..."
  ExecWait '"$INSTDIR\\nodejs\\npm.cmd" install --production' $0
  
  ; Initialize database
  DetailPrint "Initializing database..."
  ExecWait '"$INSTDIR\\nodejs\\node.exe" "$INSTDIR\\scripts\\init-sqlite.js"' $0
  
  ; Create startup batch file to run app in background
  FileOpen $0 "$INSTDIR\\start-service.bat" w
  FileWrite $0 '@echo off$\\r$\\n'
  FileWrite $0 'cd /d "$INSTDIR"$\\r$\\n'
  FileWrite $0 'start /B "$INSTDIR\\nodejs\\node.exe" start.js$\\r$\\n'
  FileClose $0
  
  ; Add to startup
  CreateShortcut "$SMSTARTUP\\Igoodar.lnk" "$INSTDIR\\start-service.bat" "" "$INSTDIR\\favicon.ico" 0 SW_SHOWMINIMIZED "" "Start Igoodar Service"
  
  ; Start application now
  DetailPrint "Starting Igoodar..."
  Exec '"$INSTDIR\\start-service.bat"'
  
  ; Wait a moment for server to start
  Sleep 3000
  
  ; Open browser
  ExecShell "open" "http://localhost:5003"
SectionEnd

Section "Uninstall"
  ; Stop application
  ExecWait 'taskkill /IM node.exe /F'
  
  ; Remove files
  RMDir /r "$INSTDIR"
  
  ; Remove shortcuts
  Delete "$DESKTOP\\Igoodar.lnk"
  RMDir /r "$SMPROGRAMS\\Igoodar"
SectionEnd
`;

const nsisScriptPath = join(installerDir, 'installer.nsi');
writeFileSync(nsisScriptPath, nsisScript);

console.log('\n========================================');
console.log('  Installer Script Created!');
console.log('========================================\n');

console.log('📋 Next Steps:\n');
console.log('Option 1: Build on Mac with makensis');
console.log('  1. Install NSIS: brew install makensis');
console.log(`  2. Run: makensis "${nsisScriptPath}"`);
console.log(`  3. Find: ${join(outputDir, 'igoodar-setup-1.0.0.exe')}\n`);

console.log('Option 2: Build on Windows');
console.log('  1. Copy installer-build folder to Windows PC');
console.log('  2. Install NSIS from: https://nsis.sourceforge.io/');
console.log('  3. Right-click installer.nsi → Compile NSIS Script');
console.log(`  4. Find: ${join(outputDir, 'igoodar-setup-1.0.0.exe')}\n`);

console.log('Option 3: Use Inno Setup (Windows only)');
console.log('  1. Copy project to Windows PC');
console.log('  2. Install Inno Setup: https://jrsoftware.org/isdl.php');
console.log('  3. Right-click installer.iss → Compile\n');

console.log('========================================\n');

// Try to build with makensis if available
try {
  execSync('which makensis', { stdio: 'ignore' });
  console.log('✅ makensis found! Building installer...\n');
  
  execSync(`makensis "${nsisScriptPath}"`, { stdio: 'inherit' });
  
  console.log('\n✅ Installer built successfully!');
  console.log(`📦 Output: ${join(outputDir, 'igoodar-setup-1.0.0.exe')}`);
} catch (error) {
  console.log('ℹ️  makensis not found. Install with: brew install makensis');
  console.log('   Or follow the manual steps above.\n');
}

console.log('✅ Installer preparation complete!');
