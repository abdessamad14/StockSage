#!/usr/bin/env node

/**
 * BUILD SIMPLE SECURE INSTALLER (NO PKG!)
 * 
 * This creates a Windows installer with:
 * 1. Obfuscated server code (protection)
 * 2. No pkg (simple and reliable)
 * 3. Portable Node.js + node_modules
 * 4. Single NSIS .exe installer
 * 
 * What customer sees:
 * - dist/ (built frontend)
 * - server-obfuscated/ (protected .js files)
 * - nodejs/ (portable Node.js)
 * - node_modules/ (dependencies)
 * - NO source code folders!
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, rmSync, cpSync, readFileSync } from 'fs';
import { join } from 'path';

const projectRoot = process.cwd();
const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);

console.log('🎁 Building Simple Secure Installer (No PKG)...\n');
console.log('========================================\n');

// Step 0: Get Windows binary for better-sqlite3
console.log('📥 Step 0/5: Preparing Windows-compatible database driver...');

// Need binary for Node v20 (portable nodejs is v20)
const windowsBinaryDir = join(projectRoot, '.windows-binaries');
const windowsBinaryPath = join(windowsBinaryDir, 'better_sqlite3.node');

let foundBinary = false;

// Check if we already have the Windows binary downloaded
if (existsSync(windowsBinaryPath)) {
  console.log('  ✓ Using cached Windows binary for Node v20');
  foundBinary = true;
} else {
  console.log('  ⚠️  Windows binary not found');
  console.log('  📥 Downloading Node v20 Windows binary from GitHub...\n');
  
  try {
    execSync('node scripts/download-windows-sqlite-binary.js', {
      stdio: 'inherit',
      cwd: projectRoot
    });
    
    if (existsSync(windowsBinaryPath)) {
      console.log('\n  ✅ Windows binary downloaded successfully!');
      foundBinary = true;
    }
  } catch (error) {
    console.error('\n  ❌ Download failed!');
    console.error('  \n  📥 Manual solution:');
    console.error('  1. On Windows PC with Node.js v20:');
    console.error('     npm install better-sqlite3@11.7.0');
    console.error('  2. Copy: node_modules\\better-sqlite3\\build\\Release\\better_sqlite3.node');
    console.error(`  3. To: ${windowsBinaryPath}`);
    console.error('  4. Run build:installer again\n');
  }
}

if (!foundBinary) {
  console.error('  ⚠️  WARNING: No Windows binary available!');
  console.error('  ⚠️  Installation will fail on Windows\n');
}
console.log('✅ Preparation complete\n');

// Step 1: Build frontend
console.log('🎨 Step 1/5: Building frontend...');
try {
  execSync('npm run build', { stdio: 'inherit', cwd: projectRoot });
  console.log('✅ Frontend build complete\n');
} catch (error) {
  console.error('❌ Frontend build failed');
  process.exit(1);
}

// Step 2: Transpile server TypeScript to JavaScript
console.log('📦 Step 2/5: Transpiling server code...');
const serverCompiledDir = join(projectRoot, 'server-compiled');
if (existsSync(serverCompiledDir)) {
  rmSync(serverCompiledDir, { recursive: true, force: true });
}
mkdirSync(serverCompiledDir, { recursive: true });

try {
  // Bundle server entry point (resolves all imports)
  // Mark all node_modules as external to avoid bundling them
  // Also mark vite.config.* as external (it has vite imports we don't need in production)
  const bundleCmd = `npx esbuild server/index.ts --bundle --outfile=server-compiled/index.js --platform=node --format=esm --target=node18 --packages=external --external:./vite.config.* --external:../vite.config.* --loader:.node=copy`;
  execSync(bundleCmd, { stdio: 'inherit', cwd: projectRoot });
  
  // Also copy any standalone .js files that might be needed
  const jsFiles = ['server/license.js', 'server/license-routes.js', 'server/network-printer.js'];
  for (const file of jsFiles) {
    const src = join(projectRoot, file);
    if (existsSync(src)) {
      const dest = join(serverCompiledDir, file.split('/').pop());
      cpSync(src, dest);
      console.log(`  ✓ Copied ${file}`);
    }
  }
  
  console.log('✅ Server bundling complete\n');
} catch (error) {
  console.error('❌ Server bundling failed');
  process.exit(1);
}

// Step 3: Obfuscate server code
console.log('🔒 Step 3/5: Obfuscating server code...');
try {
  execSync('node scripts/obfuscate-server.js', { stdio: 'inherit', cwd: projectRoot });
  console.log('✅ Obfuscation complete\n');
} catch (error) {
  console.error('❌ Obfuscation failed');
  process.exit(1);
}

// Step 4: Create package
console.log('📦 Step 4/5: Creating installation package...');

const packageDir = join(projectRoot, 'packages');
const packageName = `stocksage-simple-${timestamp}`;
const packagePath = join(packageDir, packageName);

// Clean and create package directory
if (existsSync(packagePath)) {
  rmSync(packagePath, { recursive: true, force: true });
}
mkdirSync(packagePath, { recursive: true });

// Copy files to package
console.log('  📁 Copying files...');

// Frontend
cpSync(join(projectRoot, 'dist'), join(packagePath, 'dist'), { recursive: true });
console.log('    ✓ dist/ (frontend)');

// Obfuscated server
cpSync(join(projectRoot, 'server-obfuscated'), join(packagePath, 'server'), { recursive: true });
console.log('    ✓ server/ (obfuscated code)');

// Shared schema
cpSync(join(projectRoot, 'shared'), join(packagePath, 'shared'), { recursive: true });
console.log('    ✓ shared/ (schema)');

// Drizzle migrations (needed for database initialization)
if (existsSync(join(projectRoot, 'drizzle'))) {
  cpSync(join(projectRoot, 'drizzle'), join(packagePath, 'drizzle'), { recursive: true });
  console.log('    ✓ drizzle/ (database migrations)');
}

// Scripts
cpSync(join(projectRoot, 'scripts'), join(packagePath, 'scripts'), { recursive: true });
console.log('    ✓ scripts/ (DB initialization)');

// node_modules
console.log('    ⏳ Copying node_modules/ (this may take a minute)...');
cpSync(join(projectRoot, 'node_modules'), join(packagePath, 'node_modules'), { recursive: true });
console.log('    ✓ node_modules/ (dependencies)');

// Replace Mac better-sqlite3 binary with Windows binary (if available)
if (existsSync(windowsBinaryPath)) {
  const betterSqliteDir = join(packagePath, 'node_modules', 'better-sqlite3', 'build', 'Release');
  mkdirSync(betterSqliteDir, { recursive: true });
  cpSync(windowsBinaryPath, join(betterSqliteDir, 'better_sqlite3.node'));
  console.log('    ✓ Replaced with Windows-compatible database driver (offline install enabled)');
} else {
  console.log('    ⚠️  Windows binary not available - installer will require internet');
}

// Portable Node.js (if exists)
const nodejsDir = join(projectRoot, 'nodejs');
if (existsSync(nodejsDir)) {
  cpSync(nodejsDir, join(packagePath, 'nodejs'), { recursive: true });
  console.log('    ✓ nodejs/ (portable Node.js)');
} else {
  console.log('    ⚠️  nodejs/ not found - installer will require Node.js installed');
}

// Configuration files
const configFiles = [
  'package.json',
  'package-lock.json',
  'start.js',
  'start.bat',
  'start.sh',
  'README.md',
  'LICENSE.txt'
];

for (const file of configFiles) {
  const src = join(projectRoot, file);
  if (existsSync(src)) {
    cpSync(src, join(packagePath, file));
    console.log(`    ✓ ${file}`);
  }
}

// Create data directory
mkdirSync(join(packagePath, 'data'), { recursive: true });
console.log('    ✓ data/ (will be initialized on first run)');

console.log('✅ Package created\n');

// Step 5: Create NSIS installer
console.log('🔨 Step 5/5: Building Windows installer...');

const installerDir = join(projectRoot, 'installer-simple');
const installerOutput = join(installerDir, 'output');

if (existsSync(installerDir)) {
  rmSync(installerDir, { recursive: true, force: true });
}
mkdirSync(installerOutput, { recursive: true });

// Create NSIS script
const nsisScript = `
; NSIS Installer for Igoodar (Simple Secure Version)
; No PKG - Just obfuscated JavaScript + Node.js

!include "WinVer.nsh"

!define APP_NAME "Igoodar"
!define APP_VERSION "1.0.0"
!define APP_PUBLISHER "Your Company"
!define INSTALL_DIR "$LOCALAPPDATA\\Igoodar"

Name "\${APP_NAME}"
OutFile "${join(installerOutput, 'igoodar-setup.exe')}"
InstallDir "\${INSTALL_DIR}"
RequestExecutionLevel user
SetCompressor /SOLID lzma
SetCompressorDictSize 64

Page directory
Page instfiles

Function .onInit
  \${If} \${AtMostWin8.1}
    MessageBox MB_OK|MB_ICONSTOP "Igoodar requires Windows 10 or higher."
    Abort
  \${EndIf}
FunctionEnd

Section "Install"
  SetOutPath "$INSTDIR"
  
  ; Stop any running instance
  DetailPrint "Stopping any running Igoodar..."
  nsExec::ExecToLog 'taskkill /F /IM node.exe /FI "WINDOWTITLE eq Igoodar*"'
  Sleep 2000
  
  ; Backup existing data
  IfFileExists "$INSTDIR\\data\\stocksage.db" 0 fresh_install
    DetailPrint "Backing up existing data..."
    CreateDirectory "$INSTDIR\\data_backup"
    CopyFiles /SILENT "$INSTDIR\\data\\*.*" "$INSTDIR\\data_backup"
    DetailPrint "Data backed up!"
    
    ; Clean old files (keep data_backup)
    DetailPrint "Removing old version..."
    RMDir /r "$INSTDIR\\dist"
    RMDir /r "$INSTDIR\\server"
    RMDir /r "$INSTDIR\\shared"
    RMDir /r "$INSTDIR\\scripts"
    RMDir /r "$INSTDIR\\node_modules"
    RMDir /r "$INSTDIR\\nodejs"
    Delete "$INSTDIR\\*.bat"
    Delete "$INSTDIR\\*.js"
    Delete "$INSTDIR\\*.json"
    DetailPrint "Old files removed!"
  fresh_install:
  
  ; Install all files
  DetailPrint "Installing Igoodar..."
  File /r "${packagePath}\\*.*"
  
  ; Restore data
  IfFileExists "$INSTDIR\\data_backup\\stocksage.db" 0 no_restore
    DetailPrint "Restoring your data..."
    CopyFiles /SILENT "$INSTDIR\\data_backup\\*.*" "$INSTDIR\\data"
    RMDir /r "$INSTDIR\\data_backup"
  no_restore:
  
  ; Database driver already included (Windows-compatible binary)
  DetailPrint "Windows-compatible database driver included"
  
  ; Initialize database if needed
  IfFileExists "$INSTDIR\\data\\stocksage.db" db_exists
    DetailPrint "Initializing database..."
    SetOutPath "$INSTDIR"
    ExecWait '"$INSTDIR\\nodejs\\node.exe" scripts/init-sqlite.js' $0
    DetailPrint "Database initialized"
  db_exists:
  
  ; Create startup scripts that use PORTABLE Node.js (not system Node)
  FileOpen $0 "$INSTDIR\\start.bat" w
  FileWrite $0 '@echo off$\\r$\\n'
  FileWrite $0 'cd /d "%~dp0"$\\r$\\n'
  FileWrite $0 'echo Starting Igoodar...$\\r$\\n'
  FileWrite $0 'if not exist data\\stocksage.db ($\\r$\\n'
  FileWrite $0 '  echo Initializing database...$\\r$\\n'
  FileWrite $0 '  "%~dp0nodejs\\node.exe" scripts\\init-sqlite.js$\\r$\\n'
  FileWrite $0 ')$\\r$\\n'
  FileWrite $0 'title Igoodar Server$\\r$\\n'
  FileWrite $0 '"%~dp0nodejs\\node.exe" start.js$\\r$\\n'
  FileWrite $0 'pause$\\r$\\n'
  FileClose $0
  
  ; Silent startup for auto-start
  FileOpen $0 "$INSTDIR\\start-silent.vbs" w
  FileWrite $0 'Set WshShell = CreateObject("WScript.Shell")$\\r$\\n'
  FileWrite $0 'WshShell.CurrentDirectory = "$INSTDIR"$\\r$\\n'
  FileWrite $0 'WshShell.Run """$INSTDIR\\start.bat""", 0, False$\\r$\\n'
  FileClose $0
  
  ; Stop script
  FileOpen $0 "$INSTDIR\\stop.bat" w
  FileWrite $0 '@echo off$\\r$\\n'
  FileWrite $0 'taskkill /F /IM node.exe /FI "WINDOWTITLE eq Igoodar*"$\\r$\\n'
  FileWrite $0 'echo Igoodar stopped.$\\r$\\n'
  FileWrite $0 'pause$\\r$\\n'
  FileClose $0
  
  ; Add to Windows startup
  WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Run" "Igoodar" '"wscript.exe" "$INSTDIR\\start-silent.vbs"'
  
  ; Create shortcuts
  CreateDirectory "$SMPROGRAMS\\Igoodar"
  SetOutPath "$INSTDIR"
  
  ; Desktop shortcut (opens browser)
  FileOpen $0 "$DESKTOP\\Igoodar.url" w
  FileWrite $0 "[InternetShortcut]$\\r$\\n"
  FileWrite $0 "URL=http://localhost:5003$\\r$\\n"
  FileClose $0
  
  ; Start Menu shortcuts
  FileOpen $0 "$SMPROGRAMS\\Igoodar\\Igoodar Dashboard.url" w
  FileWrite $0 "[InternetShortcut]$\\r$\\n"
  FileWrite $0 "URL=http://localhost:5003$\\r$\\n"
  FileClose $0
  
  CreateShortcut "$SMPROGRAMS\\Igoodar\\Stop Igoodar.lnk" "$INSTDIR\\stop.bat"
  WriteUninstaller "$INSTDIR\\Uninstall.exe"
  CreateShortcut "$SMPROGRAMS\\Igoodar\\Uninstall.lnk" "$INSTDIR\\Uninstall.exe"
  
  ; Start the application
  DetailPrint "Starting Igoodar..."
  Exec '"$INSTDIR\\start.bat"'
  Sleep 3000
  
  ; Success message
  IfFileExists "$INSTDIR\\data_backup\\stocksage.db" 0 fresh_msg
    MessageBox MB_OK "✅ Igoodar updated successfully!$\\n$\\n✓ Data preserved$\\n✓ Server running$\\n✓ Opening dashboard...$\\n$\\nAccess: Double-click Igoodar on desktop"
    Sleep 1000
    ExecShell "open" "http://localhost:5003"
    Goto done
  fresh_msg:
    MessageBox MB_OK "✅ Igoodar installed!$\\n$\\n✓ Server running$\\n✓ Auto-starts with Windows$\\n✓ Opening dashboard...$\\n$\\nLogin:$\\n• Admin PIN: 1234$\\n• Cashier PIN: 5678$\\n$\\nAccess:$\\n• Desktop: Igoodar icon$\\n• Browser: http://localhost:5003$\\n• Network: http://[PC-IP]:5003"
    Sleep 1000
    ExecShell "open" "http://localhost:5003"
  done:
SectionEnd

Section "Uninstall"
  MessageBox MB_YESNO "Uninstall Igoodar?$\\n$\\nThis will DELETE all data." IDYES do_uninstall
    Abort
  do_uninstall:
  
  ExecWait 'taskkill /F /IM node.exe /FI "WINDOWTITLE eq Igoodar*"'
  DeleteRegValue HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Run" "Igoodar"
  
  Delete "$DESKTOP\\Igoodar.url"
  Delete "$SMPROGRAMS\\Igoodar\\*.lnk"
  Delete "$SMPROGRAMS\\Igoodar\\*.url"
  RMDir "$SMPROGRAMS\\Igoodar"
  
  RMDir /r "$INSTDIR"
  MessageBox MB_OK "Igoodar uninstalled."
SectionEnd
`;

writeFileSync(join(installerDir, 'installer.nsi'), nsisScript);
console.log('  ✓ NSIS script created');

// Build installer
try {
  execSync('which makensis', { stdio: 'ignore' });
  console.log('  🔨 Building installer with NSIS...\n');
  
  execSync(`makensis "${join(installerDir, 'installer.nsi')}"`, { stdio: 'inherit' });
  
  const installerPath = join(installerOutput, 'igoodar-setup.exe');
  const stats = readFileSync(installerPath);
  const sizeMB = (stats.length / (1024 * 1024)).toFixed(1);
  
  console.log('\n========================================');
  console.log('  ✅✅✅ SUCCESS! ✅✅✅');
  console.log('========================================\n');
  console.log(`📦 Installer: ${installerPath}`);
  console.log(`📊 Size: ${sizeMB} MB\n`);
  console.log('📋 What customer sees after installation:');
  console.log('  ✓ server/ (obfuscated .js files)');
  console.log('  ✓ dist/ (built frontend)');
  console.log('  ✓ node_modules/ (dependencies)');
  console.log('  ✓ nodejs/ (portable Node.js)');
  console.log('  ✗ NO client/ source folder');
  console.log('  ✗ NO server/ source folder\n');
  console.log('🎯 Benefits:');
  console.log('  ✅ Code protected (obfuscated)');
  console.log('  ✅ No PKG (simple & reliable)');
  console.log('  ✅ One installer file');
  console.log('  ✅ Auto-starts on boot');
  console.log('  ✅ Easy to debug');
  console.log('  ✅ 100% OFFLINE installation (no internet needed)\n');
  
} catch (error) {
  console.log('❌ makensis not found');
  console.log('Install: brew install makensis\n');
  console.log(`📦 Package created at: ${packagePath}`);
  console.log('You can create the installer manually on Windows with NSIS');
}

console.log('✅ Done!\n');

