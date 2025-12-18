#!/usr/bin/env node

/**
 * Build COMPLETE standalone Windows installer
 * Includes obfuscated executable + all node_modules + portable Node.js
 * Creates a large but fully self-contained installer
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, rmSync, cpSync } from 'fs';
import { join } from 'path';

const projectRoot = process.cwd();

console.log('🎁 Building COMPLETE Standalone Windows Installer...\n');

// Check if build-exe exists
const buildExeDir = join(projectRoot, 'build-exe');
if (!existsSync(buildExeDir)) {
  console.error('❌ build-exe/ not found. Run: npm run build:exe first');
  process.exit(1);
}

// Create installer directory
const installerDir = join(projectRoot, 'installer-complete');
const appDir = join(installerDir, 'app');
const outputDir = join(installerDir, 'output');

if (existsSync(installerDir)) {
  console.log('🧹 Cleaning old installer...');
  rmSync(installerDir, { recursive: true, force: true });
}

mkdirSync(installerDir, { recursive: true });
mkdirSync(appDir, { recursive: true });
mkdirSync(outputDir, { recursive: true });

console.log('📦 Step 1/3: Copying ONLY obfuscated files (no source code)...');

// ONLY copy these specific files/folders - NO server/ folder!
const filesToCopy = [
  { src: 'igoodar-server.exe', desc: 'igoodar-server.exe (obfuscated)', file: true },
  { src: 'dist', desc: 'dist/ (frontend)', file: false },
  { src: 'scripts', desc: 'scripts/ (DB init)', file: false },
  { src: 'shared', desc: 'shared/ (schema)', file: false }
];

for (const item of filesToCopy) {
  const srcPath = join(buildExeDir, item.src);
  const destPath = join(appDir, item.src);
  
  if (existsSync(srcPath)) {
    if (item.file) {
      cpSync(srcPath, destPath);
    } else {
      cpSync(srcPath, destPath, { recursive: true });
    }
    console.log(`  ✓ ${item.desc}`);
  } else {
    console.error(`  ❌ Missing: ${item.src}`);
  }
}

// Verify no source code leaked
const serverDir = join(appDir, 'server');
if (existsSync(serverDir)) {
  console.error('  ⚠️  WARNING: server/ folder detected - removing...');
  rmSync(serverDir, { recursive: true, force: true });
  console.log('  ✓ Source code removed');
}

// Create empty data folder
mkdirSync(join(appDir, 'data'), { recursive: true });
console.log('  ✓ data/');

console.log('\n📦 Step 2/3: Including node_modules (excluding native binaries)...');

// Copy node_modules but exclude .node files (already in pkg executable)
const nodeModulesSrc = join(projectRoot, 'node_modules');
const nodeModulesDest = join(appDir, 'node_modules');

console.log('  Copying node_modules/ (excluding .node binaries - already in .exe)');
cpSync(nodeModulesSrc, nodeModulesDest, { 
  recursive: true,
  filter: (src) => {
    // Exclude native .node binaries (already bundled in igoodar-server.exe)
    if (src.endsWith('.node')) {
      return false;
    }
    // Exclude build artifacts
    if (src.includes('node_modules/better-sqlite3/build')) {
      return false;
    }
    return true;
  }
});
console.log('  ✓ Dependencies included (native binaries excluded)');

// Create package.json for node_modules
const minimalPackageJson = {
  "name": "igoodar",
  "version": "1.0.0",
  "type": "module"
};
writeFileSync(join(appDir, 'package.json'), JSON.stringify(minimalPackageJson, null, 2));

console.log('\n📦 Step 3/3: Creating NSIS installer...');

const nsisScript = `
; NSIS Installer for Igoodar - Complete Standalone Version
; Includes obfuscated executable + all dependencies

!include "WinVer.nsh"

!define APP_NAME "Igoodar"
!define APP_VERSION "1.0.0"
!define APP_PUBLISHER "Your Company"
!define INSTALL_DIR "$LOCALAPPDATA\\Igoodar"

Name "\${APP_NAME}"
OutFile "${join(outputDir, 'igoodar-installer.exe')}"
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
  
  ; ========================================
  ; STOP OLD VERSION IF RUNNING
  ; ========================================
  
  DetailPrint "Checking for running Igoodar processes..."
  
  ; Stop old non-obfuscated version (node.exe)
  nsExec::ExecToLog 'taskkill /F /FI "WINDOWTITLE eq Igoodar*" /IM node.exe'
  
  ; Stop new obfuscated version (igoodar-server.exe)
  nsExec::ExecToLog 'taskkill /F /IM igoodar-server.exe'
  
  ; Wait for processes to fully stop
  Sleep 2000
  
  ; ========================================
  ; BACKUP EXISTING DATA
  ; ========================================
  
  IfFileExists "$INSTDIR\\data\\stocksage.db" 0 fresh_install
    DetailPrint "Update detected - backing up data..."
    CreateDirectory "$INSTDIR\\data_backup"
    CopyFiles /SILENT "$INSTDIR\\data\\*.*" "$INSTDIR\\data_backup"
    DetailPrint "Data backed up!"
    
    ; ========================================
    ; CLEAN OLD INSTALLATION FILES
    ; ========================================
    
    DetailPrint "Removing old version files..."
    
    ; Remove old source code folders
    RMDir /r "$INSTDIR\\server"
    RMDir /r "$INSTDIR\\client"
    RMDir /r "$INSTDIR\\nodejs"
    
    ; Remove old executables and scripts
    Delete "$INSTDIR\\*.exe"
    Delete "$INSTDIR\\*.bat"
    Delete "$INSTDIR\\*.vbs"
    Delete "$INSTDIR\\*.js"
    Delete "$INSTDIR\\*.sh"
    Delete "$INSTDIR\\*.txt"
    Delete "$INSTDIR\\*.md"
    Delete "$INSTDIR\\*.json"
    
    ; Remove old folders (keep data_backup)
    RMDir /r "$INSTDIR\\dist"
    RMDir /r "$INSTDIR\\node_modules"
    RMDir /r "$INSTDIR\\scripts"
    RMDir /r "$INSTDIR\\shared"
    RMDir /r "$INSTDIR\\drizzle"
    
    DetailPrint "Old files cleaned!"
  fresh_install:
  
  ; Install all files
  DetailPrint "Installing Igoodar..."
  File /r "${appDir}\\*.*"
  
  ; Restore data
  IfFileExists "$INSTDIR\\data_backup\\stocksage.db" 0 no_restore
    DetailPrint "Restoring your data..."
    CopyFiles /SILENT "$INSTDIR\\data_backup\\*.*" "$INSTDIR\\data"
    RMDir /r "$INSTDIR\\data_backup"
  no_restore:
  
  ; Create startup script
  FileOpen $0 "$INSTDIR\\start-silent.vbs" w
  FileWrite $0 'Set WshShell = CreateObject("WScript.Shell")$\\r$\\n'
  FileWrite $0 'WshShell.CurrentDirectory = "$INSTDIR"$\\r$\\n'
  FileWrite $0 'WshShell.Run """$INSTDIR\\igoodar-server.exe""", 0, False$\\r$\\n'
  FileClose $0
  
  ; Add to Windows Startup
  WriteRegStr HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Run" "Igoodar" '"wscript.exe" "$INSTDIR\\start-silent.vbs"'
  
  ; Create shortcuts
  CreateDirectory "$SMPROGRAMS\\Igoodar"
  SetOutPath "$INSTDIR"
  
  FileOpen $0 "$DESKTOP\\Igoodar.url" w
  FileWrite $0 "[InternetShortcut]$\\r$\\n"
  FileWrite $0 "URL=http://localhost:5003$\\r$\\n"
  FileClose $0
  
  FileOpen $0 "$SMPROGRAMS\\Igoodar\\Igoodar Dashboard.url" w
  FileWrite $0 "[InternetShortcut]$\\r$\\n"
  FileWrite $0 "URL=http://localhost:5003$\\r$\\n"
  FileClose $0
  
  ; Stop script
  FileOpen $0 "$INSTDIR\\stop.bat" w
  FileWrite $0 '@echo off$\\r$\\n'
  FileWrite $0 'taskkill /F /IM igoodar-server.exe$\\r$\\n'
  FileWrite $0 'pause$\\r$\\n'
  FileClose $0
  
  CreateShortcut "$SMPROGRAMS\\Igoodar\\Stop Igoodar.lnk" "$INSTDIR\\stop.bat"
  WriteUninstaller "$INSTDIR\\Uninstall.exe"
  CreateShortcut "$SMPROGRAMS\\Igoodar\\Uninstall.lnk" "$INSTDIR\\Uninstall.exe"
  
  ; Start app
  DetailPrint "Starting Igoodar..."
  Exec '"wscript.exe" "$INSTDIR\\start-silent.vbs"'
  Sleep 3000
  
  ; Completion message
  IfFileExists "$INSTDIR\\data_backup\\stocksage.db" 0 fresh_msg
    MessageBox MB_OK "✅ Igoodar updated!$\\n$\\n✓ Data preserved$\\n✓ Running in background$\\n$\\nAccess: Double-click Igoodar on desktop"
    ExecShell "open" "http://localhost:5003"
    Goto done
  fresh_msg:
    MessageBox MB_OK "✅ Igoodar installed!$\\n$\\n✓ Auto-starts with Windows$\\n✓ Desktop shortcut created$\\n$\\nLogin:$\\n• Admin PIN: 1234$\\n• Cashier PIN: 5678$\\n$\\nAccess:$\\n• Desktop: Igoodar icon$\\n• Browser: http://localhost:5003$\\n• Mobile: http://[PC-IP]:5003"
    ExecShell "open" "http://localhost:5003"
  done:
SectionEnd

Section "Uninstall"
  MessageBox MB_YESNO "Uninstall Igoodar?$\\n$\\nThis will DELETE all data.$\\n$\\nClick NO to backup first." IDYES do_uninstall
    Abort
  do_uninstall:
  
  ExecWait 'taskkill /F /IM igoodar-server.exe'
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

console.log('✅ Installer script created\n');

// Build with makensis
try {
  execSync('which makensis', { stdio: 'ignore' });
  console.log('🔨 Building installer with NSIS...\n');
  
  execSync(`makensis "${join(installerDir, 'installer.nsi')}"`, { stdio: 'inherit' });
  
  const installerPath = join(outputDir, 'igoodar-installer.exe');
  const stats = execSync(`ls -lh "${installerPath}"`, { encoding: 'utf-8' });
  
  console.log('\n========================================');
  console.log('  ✅✅✅ COMPLETE INSTALLER BUILT! ✅✅✅');
  console.log('========================================\n');
  console.log(`📦 Location: ${installerPath}\n`);
  console.log(stats);
  console.log('📋 What to give clients:');
  console.log('  ✓ ONE file: igoodar-installer.exe');
  console.log('  ✓ Fully standalone (no dependencies needed)');
  console.log('  ✓ Contains obfuscated code');
  console.log('  ✓ Includes all node_modules');
  console.log('  ✓ Auto-starts on boot\n');
  
} catch (error) {
  console.log('❌ makensis not found');
  console.log('Install: brew install makensis\n');
}

console.log('✅ Done!\n');
