#!/usr/bin/env node

/**
 * Build secure Windows installer from obfuscated executable
 * Creates a single .exe installer containing the obfuscated igoodar-server.exe
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, rmSync, cpSync } from 'fs';
import { join } from 'path';

const projectRoot = process.cwd();

console.log('🎁 Building Secure Windows Installer...\n');

// Check if build-exe exists
const buildExeDir = join(projectRoot, 'build-exe');
if (!existsSync(buildExeDir)) {
  console.error('❌ build-exe/ not found. Run: npm run build:exe first');
  process.exit(1);
}

// Create installer directory
const installerDir = join(projectRoot, 'installer-secure');
const outputDir = join(installerDir, 'output');

if (existsSync(installerDir)) {
  console.log('🧹 Cleaning old installer...');
  rmSync(installerDir, { recursive: true, force: true });
}

mkdirSync(installerDir, { recursive: true });
mkdirSync(outputDir, { recursive: true });

// Copy build-exe contents to installer directory
console.log('📦 Preparing installer files...');
const sourceDir = join(installerDir, 'app');
cpSync(buildExeDir, sourceDir, { recursive: true });

console.log('✅ Files prepared\n');

// Create NSIS installer script
console.log('📝 Creating installer script...');

const nsisScript = `
; NSIS Installer for Igoodar (Secure Obfuscated Version)
; Single .exe installer with embedded obfuscated executable

!include "WinVer.nsh"

!define APP_NAME "Igoodar"
!define APP_VERSION "1.0.0"
!define APP_PUBLISHER "Your Company"
!define INSTALL_DIR "$LOCALAPPDATA\\Igoodar"

Name "\${APP_NAME}"
OutFile "${join(outputDir, 'igoodar-installer.exe')}"
InstallDir "\${INSTALL_DIR}"
RequestExecutionLevel user

Page directory
Page instfiles

; Check Windows version
Function .onInit
  \${If} \${AtMostWin8.1}
    MessageBox MB_OK|MB_ICONSTOP "Igoodar requires Windows 10 or higher.$\\n$\\nPlease upgrade to continue."
    Abort
  \${EndIf}
FunctionEnd

Section "Install"
  SetOutPath "$INSTDIR"
  
  ; ========================================
  ; PRESERVE DATA FOLDER DURING UPDATE
  ; ========================================
  
  IfFileExists "$INSTDIR\\data\\stocksage.db" 0 fresh_install
    DetailPrint "Existing installation detected - backing up data..."
    CreateDirectory "$INSTDIR\\data_backup"
    CopyFiles /SILENT "$INSTDIR\\data\\*.*" "$INSTDIR\\data_backup"
    DetailPrint "Data backed up!"
  fresh_install:
  
  ; Copy all files from installer
  File /r "${sourceDir}\\*.*"
  
  ; Restore data if update
  IfFileExists "$INSTDIR\\data_backup\\stocksage.db" 0 no_restore
    DetailPrint "Restoring your data..."
    CreateDirectory "$INSTDIR\\data"
    CopyFiles /SILENT "$INSTDIR\\data_backup\\*.*" "$INSTDIR\\data"
    RMDir /r "$INSTDIR\\data_backup"
    DetailPrint "Data restored!"
  no_restore:
  
  ; Create silent startup script
  DetailPrint "Setting up auto-start..."
  FileOpen $0 "$INSTDIR\\start-silent.vbs" w
  FileWrite $0 'Set WshShell = CreateObject("WScript.Shell")$\\r$\\n'
  FileWrite $0 'WshShell.CurrentDirectory = "$INSTDIR"$\\r$\\n'
  FileWrite $0 'WshShell.Run """$INSTDIR\\igoodar-server.exe""", 0, False$\\r$\\n'
  FileClose $0
  
  ; Add to Windows Startup
  WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Run" "Igoodar" '"wscript.exe" "$INSTDIR\\start-silent.vbs"'
  
  ; Create Start Menu shortcuts
  CreateDirectory "$SMPROGRAMS\\Igoodar"
  SetOutPath "$INSTDIR"
  
  ; Desktop shortcut - opens browser
  FileOpen $0 "$DESKTOP\\Igoodar.url" w
  FileWrite $0 "[InternetShortcut]$\\r$\\n"
  FileWrite $0 "URL=http://localhost:5003$\\r$\\n"
  FileWrite $0 "IconIndex=0$\\r$\\n"
  FileWrite $0 "IconFile=$INSTDIR\\igoodar-server.exe$\\r$\\n"
  FileClose $0
  
  ; Start Menu shortcuts
  FileOpen $0 "$SMPROGRAMS\\Igoodar\\Igoodar Dashboard.url" w
  FileWrite $0 "[InternetShortcut]$\\r$\\n"
  FileWrite $0 "URL=http://localhost:5003$\\r$\\n"
  FileClose $0
  
  ; Create stop script
  FileOpen $0 "$INSTDIR\\stop-igoodar.bat" w
  FileWrite $0 '@echo off$\\r$\\n'
  FileWrite $0 'taskkill /F /IM igoodar-server.exe$\\r$\\n'
  FileWrite $0 'echo Igoodar stopped.$\\r$\\n'
  FileWrite $0 'pause$\\r$\\n'
  FileClose $0
  
  CreateShortcut "$SMPROGRAMS\\Igoodar\\Stop Igoodar.lnk" "$INSTDIR\\stop-igoodar.bat"
  CreateShortcut "$SMPROGRAMS\\Igoodar\\Uninstall.lnk" "$INSTDIR\\Uninstall.exe"
  
  ; Create uninstaller
  WriteUninstaller "$INSTDIR\\Uninstall.exe"
  
  ; Start the application
  DetailPrint "Starting Igoodar..."
  Exec '"wscript.exe" "$INSTDIR\\start-silent.vbs"'
  
  ; Wait for server to start
  Sleep 3000
  
  ; Show completion message
  IfFileExists "$INSTDIR\\data_backup\\stocksage.db" 0 show_fresh
    ; Update message
    MessageBox MB_OK|MB_ICONINFORMATION "✅ Igoodar updated successfully!$\\n$\\n✓ Your data has been preserved$\\n✓ Running in background$\\n✓ Auto-starts with Windows$\\n$\\nDouble-click 'Igoodar' on desktop to access.$\\n$\\nDefault credentials:$\\n• Admin PIN: 1234$\\n• Cashier PIN: 5678"
    ExecShell "open" "http://localhost:5003"
    Goto done
  show_fresh:
    ; Fresh install message
    MessageBox MB_OK|MB_ICONINFORMATION "✅ Igoodar installed successfully!$\\n$\\n✓ Running in background$\\n✓ Auto-starts with Windows$\\n✓ Desktop shortcut created$\\n$\\nDefault Login:$\\n• Admin PIN: 1234$\\n• Cashier PIN: 5678$\\n$\\nAccess:$\\n• Desktop: Click 'Igoodar' icon$\\n• Browser: http://localhost:5003$\\n• Mobile: http://[YOUR-PC-IP]:5003$\\n$\\nOpening browser..."
    ExecShell "open" "http://localhost:5003"
  done:
SectionEnd

Section "Uninstall"
  MessageBox MB_YESNO|MB_ICONQUESTION "Uninstall Igoodar?$\\n$\\nWARNING: This will DELETE all data including:$\\n• Products$\\n• Sales$\\n• Customers$\\n$\\nClick NO to cancel and backup your data first." IDYES proceed
    Abort
  proceed:
  
  ; Stop application
  ExecWait 'taskkill /F /IM igoodar-server.exe'
  
  ; Remove from startup
  DeleteRegValue HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Run" "Igoodar"
  
  ; Remove shortcuts
  Delete "$DESKTOP\\Igoodar.url"
  Delete "$SMPROGRAMS\\Igoodar\\*.lnk"
  Delete "$SMPROGRAMS\\Igoodar\\*.url"
  RMDir "$SMPROGRAMS\\Igoodar"
  
  ; Remove files
  RMDir /r "$INSTDIR"
  
  MessageBox MB_OK "Igoodar has been uninstalled."
SectionEnd
`;

const nsisScriptPath = join(installerDir, 'installer.nsi');
writeFileSync(nsisScriptPath, nsisScript);

console.log('✅ Installer script created\n');

console.log('========================================');
console.log('  Installer Ready!');
console.log('========================================\n');

console.log('📋 To build the installer:\n');
console.log('Option 1: Build on Mac (if makensis installed)');
console.log('  brew install makensis');
console.log(`  makensis "${nsisScriptPath}"`);
console.log(`  Output: ${join(outputDir, 'igoodar-installer.exe')}\n`);

console.log('Option 2: Build on Windows');
console.log('  1. Copy installer-secure/ to Windows PC');
console.log('  2. Install NSIS from: https://nsis.sourceforge.io/');
console.log('  3. Right-click installer.nsi → Compile NSIS Script\n');

console.log('========================================\n');

// Try to build with makensis if available
try {
  execSync('which makensis', { stdio: 'ignore' });
  console.log('✅ makensis found! Building installer...\n');
  
  execSync(`makensis "${nsisScriptPath}"`, { stdio: 'inherit' });
  
  console.log('\n✅✅✅ INSTALLER BUILT SUCCESSFULLY! ✅✅✅\n');
  console.log('========================================');
  console.log('  📦 Your Single .exe File:');
  console.log('========================================\n');
  console.log(`  ${join(outputDir, 'igoodar-installer.exe')}\n`);
  console.log('📋 What to give clients:');
  console.log('  ✓ Just this ONE file: igoodar-installer.exe');
  console.log('  ✓ Client runs it → Everything installs automatically');
  console.log('  ✓ Contains your obfuscated igoodar-server.exe');
  console.log('  ✓ Auto-starts on Windows boot');
  console.log('  ✓ Desktop shortcut created\n');
  
  console.log('🔒 Security:');
  console.log('  ✓ Server code is obfuscated');
  console.log('  ✓ Installs to hidden AppData folder');
  console.log('  ✓ Source code NOT visible\n');
  
} catch (error) {
  console.log('ℹ️  makensis not found.');
  console.log('   Install with: brew install makensis');
  console.log('   Or build on Windows PC\n');
}

console.log('✅ Done!\n');
