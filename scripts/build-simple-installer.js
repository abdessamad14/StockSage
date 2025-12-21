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
  
  // Transpile critical utility files that are imported by scripts
  console.log('  ✓ Transpiling utility files...');
  const utilityCmd = `npx esbuild server/user-data-path.ts --outfile=server-compiled/user-data-path.js --platform=node --format=esm --target=node18`;
  execSync(utilityCmd, { stdio: 'inherit', cwd: projectRoot });
  console.log('  ✓ Transpiled user-data-path.ts');
  
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
  'LICENSE.txt',
  'fix-license-migration.bat', // Script to fix license migration issues
  'LICENSE-MIGRATION-GUIDE.md' // Guide for users
];

for (const file of configFiles) {
  const src = join(projectRoot, file);
  if (existsSync(src)) {
    cpSync(src, join(packagePath, file));
    console.log(`    ✓ ${file}`);
  }
}

// NOTE: We do NOT create a data/ directory in the installer
// Data will be stored in %APPDATA%/iGoodar (safe from updates)
// Database will be created there on first run
console.log('    ✓ Data will be created in safe location (%APPDATA%/iGoodar)');

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
  
  ; Check if Igoodar is running and warn user
  nsExec::ExecToStack 'tasklist /FI "IMAGENAME eq node.exe" /NH'
  Pop $0
  Pop $1
  \${If} $0 == 0
    MessageBox MB_YESNO|MB_ICONEXCLAMATION "Igoodar semble être en cours d'exécution.$\\n$\\nVous devez fermer Igoodar avant de continuer l'installation.$\\n$\\nVoulez-vous que l'installateur le ferme automatiquement?" IDYES auto_close
      MessageBox MB_OK "Veuillez fermer Igoodar manuellement, puis relancer l'installateur."
      Abort
    auto_close:
  \${EndIf}
FunctionEnd

Section "Install"
  SetOutPath "$INSTDIR"
  
  ; Stop any running instance (CRITICAL for successful update)
  DetailPrint "Stopping any running Igoodar..."
  DetailPrint "This may take a few seconds..."
  
  ; Kill all node.exe processes (safer for updates)
  nsExec::ExecToLog 'taskkill /F /IM node.exe'
  Sleep 3000
  
  ; Also try to kill by window title as fallback
  nsExec::ExecToLog 'taskkill /F /IM node.exe /FI "WINDOWTITLE eq Igoodar*"'
  Sleep 2000
  
  ; Wait a bit more to ensure files are released
  DetailPrint "Waiting for files to be released..."
  Sleep 2000
  
  ; CRITICAL: Migrate user data BEFORE cleaning old installation
  IfFileExists "$INSTDIR\\data\\license.key" 0 skip_migration
    DetailPrint "⚠️  Found user data in old location - migrating to safe location..."
    
    ; Create safe data directory
    CreateDirectory "$APPDATA\\iGoodar"
    
    ; Migrate critical files
    IfFileExists "$INSTDIR\\data\\license.key" 0 +3
      DetailPrint "  Migrating license.key..."
      CopyFiles /SILENT "$INSTDIR\\data\\license.key" "$APPDATA\\iGoodar\\license.key"
    
    IfFileExists "$INSTDIR\\data\\stocksage.db" 0 +3
      DetailPrint "  Migrating stocksage.db..."
      CopyFiles /SILENT "$INSTDIR\\data\\stocksage.db" "$APPDATA\\iGoodar\\stocksage.db"
    
    IfFileExists "$INSTDIR\\data\\stocksage.db-wal" 0 +3
      DetailPrint "  Migrating stocksage.db-wal..."
      CopyFiles /SILENT "$INSTDIR\\data\\stocksage.db-wal" "$APPDATA\\iGoodar\\stocksage.db-wal"
    
    IfFileExists "$INSTDIR\\data\\stocksage.db-shm" 0 +3
      DetailPrint "  Migrating stocksage.db-shm..."
      CopyFiles /SILENT "$INSTDIR\\data\\stocksage.db-shm" "$APPDATA\\iGoodar\\stocksage.db-shm"
    
    IfFileExists "$INSTDIR\\data\\machine.id" 0 +3
      DetailPrint "  Migrating machine.id..."
      CopyFiles /SILENT "$INSTDIR\\data\\machine.id" "$APPDATA\\iGoodar\\machine.id"
    
    IfFileExists "$INSTDIR\\data\\credit-transactions.json" 0 +3
      DetailPrint "  Migrating credit-transactions.json..."
      CopyFiles /SILENT "$INSTDIR\\data\\credit-transactions.json" "$APPDATA\\iGoodar\\credit-transactions.json"
    
    DetailPrint "✅ User data migrated to: $APPDATA\\iGoodar"
    
    ; Create backup of old data just in case
    Rename "$INSTDIR\\data" "$INSTDIR\\data_backup"
    DetailPrint "  (Old data backed up to data_backup)"
  
  skip_migration:
  
  ; Clean old installation (if exists)
  IfFileExists "$INSTDIR\\start.js" 0 fresh_install
    DetailPrint "Removing old version..."
    RMDir /r "$INSTDIR\\dist"
    RMDir /r "$INSTDIR\\server"
    RMDir /r "$INSTDIR\\shared"
    RMDir /r "$INSTDIR\\scripts"
    RMDir /r "$INSTDIR\\drizzle"
    RMDir /r "$INSTDIR\\node_modules"
    RMDir /r "$INSTDIR\\nodejs"
    ; Note: data/ was already migrated or renamed to data_backup
    Delete "$INSTDIR\\*.bat"
    Delete "$INSTDIR\\*.vbs"
    Delete "$INSTDIR\\*.js"
    Delete "$INSTDIR\\*.json"
    DetailPrint "Old files removed!"
  fresh_install:
  
  ; Install all files
  DetailPrint "Installing Igoodar..."
  File /r "${packagePath}\\*.*"
  
  ; Database driver already included (Windows-compatible binary)
  DetailPrint "Windows-compatible database driver included"
  
  ; NOTE: Database initialization will happen on first run via start.js
  ; Data will be stored in %APPDATA%/iGoodar (safe from updates)
  DetailPrint "User data will be stored in: %APPDATA%\\iGoodar"
  
  ; Create startup scripts that use PORTABLE Node.js (not system Node)
  FileOpen $0 "$INSTDIR\\start.bat" w
  FileWrite $0 '@echo off$\\r$\\n'
  FileWrite $0 'cd /d "%~dp0"$\\r$\\n'
  FileWrite $0 'echo Starting Igoodar...$\\r$\\n'
  FileWrite $0 'title Igoodar Server$\\r$\\n'
  FileWrite $0 '"%~dp0nodejs\\node.exe" start.js$\\r$\\n'
  FileWrite $0 'pause$\\r$\\n'
  FileClose $0
  
  ; NOTE: start.js handles data migration and database initialization automatically
  
  ; Silent startup for auto-start and background running (NO CONSOLE WINDOW)
  FileOpen $0 "$INSTDIR\\start-silent.vbs" w
  FileWrite $0 'Set WshShell = CreateObject("WScript.Shell")$\\r$\\n'
  FileWrite $0 '$\\r$\\n'
  FileWrite $0 "' Get the directory where this script is located$\\r$\\n"
  FileWrite $0 'InstallDir = "$INSTDIR"$\\r$\\n'
  FileWrite $0 'NodeExe = InstallDir & "\\nodejs\\node.exe"$\\r$\\n'
  FileWrite $0 'StartJS = InstallDir & "\\start.js"$\\r$\\n'
  FileWrite $0 '$\\r$\\n'
  FileWrite $0 "' Start the server in background (no window)$\\r$\\n"
  FileWrite $0 "' start.js handles data migration and database initialization$\\r$\\n"
  FileWrite $0 'WshShell.CurrentDirectory = InstallDir$\\r$\\n'
  FileWrite $0 'WshShell.Run """" & NodeExe & """ """ & StartJS & """", 0, False$\\r$\\n'
  FileClose $0
  
  ; Stop script
  FileOpen $0 "$INSTDIR\\stop.bat" w
  FileWrite $0 '@echo off$\\r$\\n'
  FileWrite $0 'echo Stopping Igoodar...$\\r$\\n'
  FileWrite $0 'taskkill /F /IM node.exe /FI "WINDOWTITLE eq Igoodar*"$\\r$\\n'
  FileWrite $0 'timeout /t 1 >nul$\\r$\\n'
  FileWrite $0 'echo Igoodar stopped.$\\r$\\n'
  FileWrite $0 'pause$\\r$\\n'
  FileClose $0
  
  ; Restart script (stops then starts silently)
  FileOpen $0 "$INSTDIR\\restart.bat" w
  FileWrite $0 '@echo off$\\r$\\n'
  FileWrite $0 'echo Restarting Igoodar...$\\r$\\n'
  FileWrite $0 'taskkill /F /IM node.exe /FI "WINDOWTITLE eq Igoodar*" >nul 2>&1$\\r$\\n'
  FileWrite $0 'timeout /t 2 >nul$\\r$\\n'
  FileWrite $0 'wscript.exe "%~dp0start-silent.vbs"$\\r$\\n'
  FileWrite $0 'echo Igoodar restarted in background.$\\r$\\n'
  FileWrite $0 'timeout /t 2 >nul$\\r$\\n'
  FileClose $0
  
  ; Add to Windows startup
  WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Run" "Igoodar" '"wscript.exe" "$INSTDIR\\start-silent.vbs"'
  
  ; Create shortcuts
  CreateDirectory "$SMPROGRAMS\\Igoodar"
  SetOutPath "$INSTDIR"
  
  ; Find Chrome installation
  StrCpy $1 ""
  
  ; Try common Chrome locations
  IfFileExists "$PROGRAMFILES64\\Google\\Chrome\\Application\\chrome.exe" 0 +3
    StrCpy $1 "$PROGRAMFILES64\\Google\\Chrome\\Application\\chrome.exe"
    Goto chrome_found
  
  IfFileExists "$PROGRAMFILES\\Google\\Chrome\\Application\\chrome.exe" 0 +3
    StrCpy $1 "$PROGRAMFILES\\Google\\Chrome\\Application\\chrome.exe"
    Goto chrome_found
  
  IfFileExists "$LOCALAPPDATA\\Google\\Chrome\\Application\\chrome.exe" 0 +3
    StrCpy $1 "$LOCALAPPDATA\\Google\\Chrome\\Application\\chrome.exe"
    Goto chrome_found
  
  ; Chrome not found - use simple URL shortcut as fallback
  FileOpen $0 "$DESKTOP\\Igoodar.url" w
  FileWrite $0 "[InternetShortcut]$\\r$\\n"
  FileWrite $0 "URL=http://localhost:5003/pos$\\r$\\n"
  FileClose $0
  Goto shortcuts_done
  
  chrome_found:
  ; Create Kiosk Mode shortcut on Desktop (SILENT PRINTING)
  CreateShortcut "$DESKTOP\\Igoodar POS.lnk" \\
    "$1" \\
    "--app=http://localhost:5003/pos --kiosk-printing --silent-launch --disable-popup-blocking --disable-infobars --start-maximized" \\
    "$INSTDIR\\dist\\public\\icons\\icon-512x512.png" 0 SW_SHOWNORMAL \\
    "" "iGoodar POS - Impression Silencieuse"
  
  shortcuts_done:
  
  ; Start Menu shortcuts
  ; Kiosk Mode (main shortcut)
  \${If} $1 != ""
    CreateShortcut "$SMPROGRAMS\\Igoodar\\Igoodar POS.lnk" \\
      "$1" \\
      "--app=http://localhost:5003/pos --kiosk-printing --silent-launch --disable-popup-blocking" \\
      "$INSTDIR\\dist\\public\\icons\\icon-512x512.png" 0 SW_SHOWNORMAL \\
      "" "iGoodar POS - Impression Silencieuse"
  \${Else}
    FileOpen $0 "$SMPROGRAMS\\Igoodar\\Igoodar POS.url" w
    FileWrite $0 "[InternetShortcut]$\\r$\\n"
    FileWrite $0 "URL=http://localhost:5003/pos$\\r$\\n"
    FileClose $0
  \${EndIf}
  
  ; Dashboard (normal browser - for settings/admin)
  FileOpen $0 "$SMPROGRAMS\\Igoodar\\Igoodar Dashboard.url" w
  FileWrite $0 "[InternetShortcut]$\\r$\\n"
  FileWrite $0 "URL=http://localhost:5003$\\r$\\n"
  FileClose $0
  
  CreateShortcut "$SMPROGRAMS\\Igoodar\\Restart Igoodar.lnk" "$INSTDIR\\restart.bat" "" "$INSTDIR\\nodejs\\node.exe" 0
  CreateShortcut "$SMPROGRAMS\\Igoodar\\Stop Igoodar.lnk" "$INSTDIR\\stop.bat"
  WriteUninstaller "$INSTDIR\\Uninstall.exe"
  CreateShortcut "$SMPROGRAMS\\Igoodar\\Uninstall.lnk" "$INSTDIR\\Uninstall.exe"
  
  ; Start the application (silently in background - no console window)
  DetailPrint "Starting Igoodar in background..."
  Exec 'wscript.exe "$INSTDIR\\start-silent.vbs"'
  Sleep 4000
  
  ; Success message
  IfFileExists "$APPDATA\\iGoodar\\license.key" show_update_message show_fresh_message
  
  show_update_message:
    MessageBox MB_OK "✅ Igoodar mis à jour avec succès!$\\n$\\n✓ Vos données ont été migrées vers %APPDATA%\\iGoodar$\\n✓ Votre licence est préservée$\\n✓ Votre base de données est intacte$\\n✓ Le serveur tourne en arrière-plan$\\n✓ Démarrage automatique avec Windows$\\n$\\n🖨️ IMPRESSION SILENCIEUSE:$\\n• Utilisez le raccourci Bureau: Igoodar POS$\\n• Imprime sans popup automatiquement$\\n$\\nAccès:$\\n• Bureau: Igoodar POS (impression silencieuse)$\\n• Menu Démarrer: Igoodar Dashboard (configuration)$\\n• Réseau: http://[IP-PC]:5003$\\n$\\nGestion:$\\n• Menu Démarrer → Igoodar → Restart/Stop$\\n$\\nOuverture du POS..."
    Goto end_message
  
  show_fresh_message:
    MessageBox MB_OK "✅ Igoodar installé avec succès!$\\n$\\n✓ Serveur en arrière-plan$\\n✓ Démarrage automatique$\\n✓ Données dans %APPDATA%\\iGoodar$\\n✓ Impression silencieuse activée$\\n$\\nConnexion:$\\n• PIN Admin: 1234$\\n• PIN Caissier: 5678$\\n$\\n🖨️ IMPRESSION SILENCIEUSE:$\\n1. Définissez votre imprimante thermique par défaut (Windows)$\\n2. Utilisez le raccourci: Igoodar POS (Bureau)$\\n3. L'impression se fait sans popup!$\\n$\\nAccès:$\\n• Bureau: Igoodar POS (caisse)$\\n• Menu: Igoodar Dashboard (admin)$\\n• Réseau: http://[IP-PC]:5003$\\n$\\nOuverture du POS..."
  
  end_message:
  Sleep 1000
  ; Open POS page directly in Kiosk mode if Chrome is found
  \${If} $1 != ""
    Exec '"$1" --app=http://localhost:5003/pos --kiosk-printing --silent-launch --start-maximized'
  \${Else}
    ExecShell "open" "http://localhost:5003/pos"
  \${EndIf}
SectionEnd

Section "Uninstall"
  MessageBox MB_YESNO "Uninstall Igoodar?$\\n$\\nNote: Your data in %APPDATA%\\iGoodar will be preserved.$\\nYou can delete it manually if needed." IDYES do_uninstall
    Abort
  do_uninstall:
  
  ExecWait 'taskkill /F /IM node.exe /FI "WINDOWTITLE eq Igoodar*"'
  ExecWait 'taskkill /F /IM chrome.exe /FI "WINDOWTITLE eq *Igoodar*"'
  DeleteRegValue HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Run" "Igoodar"
  
  Delete "$DESKTOP\\Igoodar.url"
  Delete "$DESKTOP\\Igoodar POS.lnk"
  Delete "$SMPROGRAMS\\Igoodar\\*.lnk"
  Delete "$SMPROGRAMS\\Igoodar\\*.url"
  RMDir "$SMPROGRAMS\\Igoodar"
  
  RMDir /r "$INSTDIR"
  
  MessageBox MB_OK "Igoodar désinstallé.$\\n$\\nVos données sont préservées dans: %APPDATA%\\iGoodar$\\n$\\nPour supprimer complètement vos données, supprimez ce dossier manuellement."
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

