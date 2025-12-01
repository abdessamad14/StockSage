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
; Requires Windows 10 or higher
; NO ADMIN RIGHTS REQUIRED - Installs to user's AppData

!include "WinVer.nsh"

!define APP_NAME "Igoodar"
!define APP_VERSION "1.0.0"
!define APP_PUBLISHER "Your Company"
!define INSTALL_DIR "$LOCALAPPDATA\\Igoodar"

Name "\${APP_NAME}"
OutFile "${join(outputDir, 'igoodar-setup-1.0.0.exe')}"
InstallDir "\${INSTALL_DIR}"
RequestExecutionLevel user

Page directory
Page instfiles

; Check Windows version on init
Function .onInit
  ; Check if running on Windows 10 or higher
  ; Windows 10 = 10.0 (NT 6.2 kernel version changed to 10.0)
  \${If} \${AtMostWin8.1}
    MessageBox MB_OK|MB_ICONSTOP "Igoodar requires Windows 10 or higher.$\\n$\\nYour Windows version is not supported.$\\n$\\nPlease upgrade to Windows 10, Windows 11, or Windows Server 2016+ to install this application."
    Abort
  \${EndIf}
FunctionEnd

Section "Install"
  SetOutPath "$INSTDIR"
  
  ; ========================================
  ; PRESERVE DATA FOLDER DURING UPDATE
  ; ========================================
  
  ; Check if this is an update (data folder exists)
  IfFileExists "$INSTDIR\\data\\stocksage.db" 0 fresh_install
    ; This is an UPDATE - backup data first
    DetailPrint "Existing installation detected - backing up data..."
    CreateDirectory "$INSTDIR\\data_backup"
    CopyFiles /SILENT "$INSTDIR\\data\\*.*" "$INSTDIR\\data_backup"
    DetailPrint "Data backed up to data_backup folder"
  fresh_install:
  
  ; Copy all files (this overwrites everything except what we backed up)
  File /r "${extractedDir}\\*.*"
  
  ; Restore data if this was an update
  IfFileExists "$INSTDIR\\data_backup\\stocksage.db" 0 no_restore
    DetailPrint "Restoring your data..."
    CreateDirectory "$INSTDIR\\data"
    CopyFiles /SILENT "$INSTDIR\\data_backup\\*.*" "$INSTDIR\\data"
    DetailPrint "Data restored successfully!"
  no_restore:
  
  ; Create silent startup VBS script for background running
  DetailPrint "Creating auto-start script..."
  FileOpen $0 "$INSTDIR\\start-silent.vbs" w
  FileWrite $0 'Set WshShell = CreateObject("WScript.Shell")$\\r$\\n'
  FileWrite $0 'WshShell.CurrentDirectory = "$INSTDIR"$\\r$\\n'
  FileWrite $0 'WshShell.Run """$INSTDIR\\start.bat""", 0, False$\\r$\\n'
  FileClose $0
  
  ; Add to Windows Startup (runs automatically on boot for current user)
  DetailPrint "Adding to Windows Startup..."
  WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Run" "Igoodar" '"wscript.exe" "$INSTDIR\\start-silent.vbs"'
  
  ; Create shortcuts (optional, for manual control)
  CreateDirectory "$SMPROGRAMS\\Igoodar"
  
  ; Set working directory for shortcuts (critical for finding node_modules!)
  SetOutPath "$INSTDIR"
  
  ; Create URL file for browser shortcut on desktop
  FileOpen $0 "$DESKTOP\\Igoodar Dashboard.url" w
  FileWrite $0 "[InternetShortcut]$\\r$\\n"
  FileWrite $0 "URL=http://localhost:5003$\\r$\\n"
  FileClose $0
  
  ; Start Menu shortcuts
  FileOpen $0 "$SMPROGRAMS\\Igoodar\\Igoodar Dashboard.url" w
  FileWrite $0 "[InternetShortcut]$\\r$\\n"
  FileWrite $0 "URL=http://localhost:5003$\\r$\\n"
  FileClose $0
  
  ; Create stop script
  FileOpen $0 "$INSTDIR\\stop-igoodar.bat" w
  FileWrite $0 '@echo off$\\r$\\n'
  FileWrite $0 'taskkill /F /IM node.exe /FI "WINDOWTITLE eq Igoodar*"$\\r$\\n'
  FileWrite $0 'echo Igoodar has been stopped.$\\r$\\n'
  FileWrite $0 'pause$\\r$\\n'
  FileClose $0
  
  CreateShortcut "$SMPROGRAMS\\Igoodar\\Restart Igoodar.lnk" "$INSTDIR\\start.bat"
  CreateShortcut "$SMPROGRAMS\\Igoodar\\Stop Igoodar.lnk" "$INSTDIR\\stop-igoodar.bat"
  CreateShortcut "$SMPROGRAMS\\Igoodar\\Debug Install.lnk" "$INSTDIR\\debug-install.bat"
  CreateShortcut "$SMPROGRAMS\\Igoodar\\Uninstall.lnk" "$INSTDIR\\Uninstall.exe"
  
  ; Create uninstaller
  WriteUninstaller "$INSTDIR\\Uninstall.exe"
  
  ; Verify node_modules exists (should be pre-included)
  DetailPrint "Verifying dependencies..."
  IfFileExists "$INSTDIR\\node_modules\\*.*" deps_ok deps_missing
  deps_missing:
    MessageBox MB_OK|MB_ICONEXCLAMATION "Error: node_modules folder is missing!$\\nThis package should include all dependencies.$\\nPlease contact support."
    Abort "Installation failed: Missing dependencies"
  deps_ok:
  DetailPrint "Dependencies verified (pre-installed)"
  
  ; Initialize database
  DetailPrint "Initializing database..."
  ExecWait '"$INSTDIR\\nodejs\\node.exe" "$INSTDIR\\scripts\\init-sqlite.js"' $0
  
  ; Installation complete message
  DetailPrint "Installation completed successfully!"
  
  ; Start the application automatically in background
  DetailPrint "Starting Igoodar service..."
  Exec '"wscript.exe" "$INSTDIR\\start-silent.vbs"'
  
  ; Wait 3 seconds for server to start
  Sleep 3000
  
  ; Show different message for update vs fresh install
  IfFileExists "$INSTDIR\\data_backup\\stocksage.db" 0 show_fresh_message
    ; UPDATE message
    MessageBox MB_OK|MB_ICONINFORMATION "Igoodar has been UPDATED successfully!$\\n$\\nYour data has been preserved:$\\n- All products$\\n- All sales history$\\n- All customers$\\n- All settings$\\n$\\n✅ Igoodar is now running in the background$\\n✅ Auto-starts with Windows (no admin needed)$\\n$\\nTo access the app:$\\n- Double-click 'Igoodar Dashboard' on your desktop$\\n- Or go to: http://localhost:5003$\\n$\\nLogin with your existing credentials."
    ; Auto-open browser for updates
    ExecShell "open" "http://localhost:5003"
    Goto done_message
  show_fresh_message:
    ; FRESH INSTALL message
    MessageBox MB_OK|MB_ICONINFORMATION "Igoodar has been installed successfully!$\\n$\\n✅ Igoodar is now running in the background$\\n✅ Auto-starts with Windows (no admin needed)$\\n✅ Runs silently in system tray$\\n$\\nDefault Login Credentials:$\\n- Admin PIN: 1234$\\n- Cashier PIN: 5678$\\n$\\nTo access the app:$\\n- Double-click 'Igoodar Dashboard' on your desktop$\\n- Or go to: http://localhost:5003$\\n$\\nThe browser will now open automatically..."
    ; Auto-open browser for fresh installs
    ExecShell "open" "http://localhost:5003"
  done_message:
SectionEnd

Section "Uninstall"
  ; Warn user about data deletion
  MessageBox MB_YESNO|MB_ICONQUESTION "Are you sure you want to uninstall Igoodar?$\\n$\\nWARNING: This will DELETE all your data including:$\\n- Products$\\n- Sales history$\\n- Customers$\\n- Settings$\\n$\\nTo keep your data, click NO and backup the 'data' folder first." IDYES proceed_uninstall
    Abort "Uninstall cancelled"
  proceed_uninstall:
  
  ; Stop application if running
  DetailPrint "Stopping Igoodar service..."
  ExecWait 'taskkill /IM node.exe /F /FI "WINDOWTITLE eq Igoodar*"'
  
  ; Remove from Windows Startup
  DetailPrint "Removing from Windows Startup..."
  DeleteRegValue HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Run" "Igoodar"
  
  ; Remove shortcuts
  Delete "$DESKTOP\\Igoodar Dashboard.url"
  Delete "$SMPROGRAMS\\Igoodar\\Igoodar Dashboard.url"
  Delete "$SMPROGRAMS\\Igoodar\\Restart Igoodar.lnk"
  Delete "$SMPROGRAMS\\Igoodar\\Stop Igoodar.lnk"
  Delete "$SMPROGRAMS\\Igoodar\\Debug Install.lnk"
  Delete "$SMPROGRAMS\\Igoodar\\Uninstall.lnk"
  RMDir "$SMPROGRAMS\\Igoodar"
  
  ; Remove files
  RMDir /r "$INSTDIR"
  
  MessageBox MB_OK|MB_ICONINFORMATION "Igoodar has been uninstalled.$\\n$\\nThe auto-start feature has been removed from Windows Startup."
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
