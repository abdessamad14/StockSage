
; NSIS Installer for Igoodar (Simple Secure Version)
; No PKG - Just obfuscated JavaScript + Node.js

!include "WinVer.nsh"

!define APP_NAME "Igoodar"
!define APP_VERSION "1.0.0"
!define APP_PUBLISHER "Your Company"
!define INSTALL_DIR "$LOCALAPPDATA\Igoodar"

Name "${APP_NAME}"
OutFile "/Users/abdessamadabba/repos/StockSage/installer-simple/output/igoodar-setup.exe"
InstallDir "${INSTALL_DIR}"
RequestExecutionLevel user
SetCompressor /SOLID lzma
SetCompressorDictSize 64

Page directory
Page instfiles

Function .onInit
  ${If} ${AtMostWin8.1}
    MessageBox MB_OK|MB_ICONSTOP "Igoodar requires Windows 10 or higher."
    Abort
  ${EndIf}
FunctionEnd

Section "Install"
  SetOutPath "$INSTDIR"
  
  ; Stop any running instance
  DetailPrint "Stopping any running Igoodar..."
  nsExec::ExecToLog 'taskkill /F /IM node.exe /FI "WINDOWTITLE eq Igoodar*"'
  Sleep 2000
  
  ; Backup existing data
  IfFileExists "$INSTDIR\data\stocksage.db" 0 fresh_install
    DetailPrint "Backing up existing data..."
    CreateDirectory "$INSTDIR\data_backup"
    CopyFiles /SILENT "$INSTDIR\data\*.*" "$INSTDIR\data_backup"
    DetailPrint "Data backed up!"
    
    ; Clean old files (keep data_backup)
    DetailPrint "Removing old version..."
    RMDir /r "$INSTDIR\dist"
    RMDir /r "$INSTDIR\server"
    RMDir /r "$INSTDIR\shared"
    RMDir /r "$INSTDIR\scripts"
    RMDir /r "$INSTDIR\node_modules"
    RMDir /r "$INSTDIR\nodejs"
    Delete "$INSTDIR\*.bat"
    Delete "$INSTDIR\*.js"
    Delete "$INSTDIR\*.json"
    DetailPrint "Old files removed!"
  fresh_install:
  
  ; Install all files
  DetailPrint "Installing Igoodar..."
  File /r "/Users/abdessamadabba/repos/StockSage/packages/stocksage-simple-20251221121145\*.*"
  
  ; Restore data
  IfFileExists "$INSTDIR\data_backup\stocksage.db" 0 no_restore
    DetailPrint "Restoring your data..."
    CopyFiles /SILENT "$INSTDIR\data_backup\*.*" "$INSTDIR\data"
    RMDir /r "$INSTDIR\data_backup"
  no_restore:
  
  ; Database driver already included (Windows-compatible binary)
  DetailPrint "Windows-compatible database driver included"
  
  ; Initialize database if needed
  IfFileExists "$INSTDIR\data\stocksage.db" db_exists
    DetailPrint "Initializing database..."
    SetOutPath "$INSTDIR"
    ExecWait '"$INSTDIR\nodejs\node.exe" scripts/init-sqlite.js' $0
    DetailPrint "Database initialized"
  db_exists:
  
  ; Create startup scripts that use PORTABLE Node.js (not system Node)
  FileOpen $0 "$INSTDIR\start.bat" w
  FileWrite $0 '@echo off$\r$\n'
  FileWrite $0 'cd /d "%~dp0"$\r$\n'
  FileWrite $0 'echo Starting Igoodar...$\r$\n'
  FileWrite $0 'if not exist data\stocksage.db ($\r$\n'
  FileWrite $0 '  echo Initializing database...$\r$\n'
  FileWrite $0 '  "%~dp0nodejs\node.exe" scripts\init-sqlite.js$\r$\n'
  FileWrite $0 ')$\r$\n'
  FileWrite $0 'title Igoodar Server$\r$\n'
  FileWrite $0 '"%~dp0nodejs\node.exe" start.js$\r$\n'
  FileWrite $0 'pause$\r$\n'
  FileClose $0
  
  ; Silent startup for auto-start and background running (NO CONSOLE WINDOW)
  FileOpen $0 "$INSTDIR\start-silent.vbs" w
  FileWrite $0 'Set WshShell = CreateObject("WScript.Shell")$\r$\n'
  FileWrite $0 'Set FSO = CreateObject("Scripting.FileSystemObject")$\r$\n'
  FileWrite $0 '$\r$\n'
  FileWrite $0 "' Get the directory where this script is located$\r$\n"
  FileWrite $0 'InstallDir = "$INSTDIR"$\r$\n'
  FileWrite $0 'NodeExe = InstallDir & "\nodejs\node.exe"$\r$\n'
  FileWrite $0 'StartJS = InstallDir & "\start.js"$\r$\n'
  FileWrite $0 'DataDir = InstallDir & "\data"$\r$\n'
  FileWrite $0 'DbFile = DataDir & "\stocksage.db"$\r$\n'
  FileWrite $0 '$\r$\n'
  FileWrite $0 "' Initialize database if it does not exist$\r$\n"
  FileWrite $0 'If Not FSO.FileExists(DbFile) Then$\r$\n'
  FileWrite $0 '  WshShell.CurrentDirectory = InstallDir$\r$\n'
  FileWrite $0 '  WshShell.Run """" & NodeExe & """ scripts\init-sqlite.js", 0, True$\r$\n'
  FileWrite $0 'End If$\r$\n'
  FileWrite $0 '$\r$\n'
  FileWrite $0 "' Start the server in background (no window)$\r$\n"
  FileWrite $0 'WshShell.CurrentDirectory = InstallDir$\r$\n'
  FileWrite $0 'WshShell.Run """" & NodeExe & """ """ & StartJS & """", 0, False$\r$\n'
  FileClose $0
  
  ; Stop script
  FileOpen $0 "$INSTDIR\stop.bat" w
  FileWrite $0 '@echo off$\r$\n'
  FileWrite $0 'echo Stopping Igoodar...$\r$\n'
  FileWrite $0 'taskkill /F /IM node.exe /FI "WINDOWTITLE eq Igoodar*"$\r$\n'
  FileWrite $0 'timeout /t 1 >nul$\r$\n'
  FileWrite $0 'echo Igoodar stopped.$\r$\n'
  FileWrite $0 'pause$\r$\n'
  FileClose $0
  
  ; Restart script (stops then starts silently)
  FileOpen $0 "$INSTDIR\restart.bat" w
  FileWrite $0 '@echo off$\r$\n'
  FileWrite $0 'echo Restarting Igoodar...$\r$\n'
  FileWrite $0 'taskkill /F /IM node.exe /FI "WINDOWTITLE eq Igoodar*" >nul 2>&1$\r$\n'
  FileWrite $0 'timeout /t 2 >nul$\r$\n'
  FileWrite $0 'wscript.exe "%~dp0start-silent.vbs"$\r$\n'
  FileWrite $0 'echo Igoodar restarted in background.$\r$\n'
  FileWrite $0 'timeout /t 2 >nul$\r$\n'
  FileClose $0
  
  ; Add to Windows startup
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Igoodar" '"wscript.exe" "$INSTDIR\start-silent.vbs"'
  
  ; Create shortcuts
  CreateDirectory "$SMPROGRAMS\Igoodar"
  SetOutPath "$INSTDIR"
  
  ; Desktop shortcut (opens browser)
  FileOpen $0 "$DESKTOP\Igoodar.url" w
  FileWrite $0 "[InternetShortcut]$\r$\n"
  FileWrite $0 "URL=http://localhost:5003$\r$\n"
  FileClose $0
  
  ; Start Menu shortcuts
  FileOpen $0 "$SMPROGRAMS\Igoodar\Igoodar Dashboard.url" w
  FileWrite $0 "[InternetShortcut]$\r$\n"
  FileWrite $0 "URL=http://localhost:5003$\r$\n"
  FileClose $0
  
  CreateShortcut "$SMPROGRAMS\Igoodar\Restart Igoodar.lnk" "$INSTDIR\restart.bat" "" "$INSTDIR\nodejs\node.exe" 0
  CreateShortcut "$SMPROGRAMS\Igoodar\Stop Igoodar.lnk" "$INSTDIR\stop.bat"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  CreateShortcut "$SMPROGRAMS\Igoodar\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
  
  ; Start the application (silently in background - no console window)
  DetailPrint "Starting Igoodar in background..."
  Exec 'wscript.exe "$INSTDIR\start-silent.vbs"'
  Sleep 3000
  
  ; Success message
  IfFileExists "$INSTDIR\data_backup\stocksage.db" 0 fresh_msg
    MessageBox MB_OK "✅ Igoodar updated successfully!$\n$\n✓ Data preserved$\n✓ Server running in background$\n✓ No console window$\n✓ Opening dashboard...$\n$\nAccess: Double-click Igoodar on desktop"
    Sleep 1000
    ExecShell "open" "http://localhost:5003"
    Goto done
  fresh_msg:
    MessageBox MB_OK "✅ Igoodar installed!$\n$\n✓ Server running in background$\n✓ Auto-starts with Windows$\n✓ No console window to close$\n✓ Opening dashboard...$\n$\nLogin:$\n• Admin PIN: 1234$\n• Cashier PIN: 5678$\n$\nAccess:$\n• Desktop: Igoodar icon$\n• Browser: http://localhost:5003$\n• Network: http://[PC-IP]:5003$\n$\nManagement:$\n• Start Menu → Igoodar → Restart/Stop"
    Sleep 1000
    ExecShell "open" "http://localhost:5003"
  done:
SectionEnd

Section "Uninstall"
  MessageBox MB_YESNO "Uninstall Igoodar?$\n$\nThis will DELETE all data." IDYES do_uninstall
    Abort
  do_uninstall:
  
  ExecWait 'taskkill /F /IM node.exe /FI "WINDOWTITLE eq Igoodar*"'
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Igoodar"
  
  Delete "$DESKTOP\Igoodar.url"
  Delete "$SMPROGRAMS\Igoodar\*.lnk"
  Delete "$SMPROGRAMS\Igoodar\*.url"
  RMDir "$SMPROGRAMS\Igoodar"
  
  RMDir /r "$INSTDIR"
  MessageBox MB_OK "Igoodar uninstalled."
SectionEnd
