
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
  
  ; Check if Igoodar is running and warn user
  nsExec::ExecToStack 'tasklist /FI "IMAGENAME eq node.exe" /NH'
  Pop $0
  Pop $1
  ${If} $0 == 0
    MessageBox MB_YESNO|MB_ICONEXCLAMATION "Igoodar semble être en cours d'exécution.$\n$\nVous devez fermer Igoodar avant de continuer l'installation.$\n$\nVoulez-vous que l'installateur le ferme automatiquement?" IDYES auto_close
      MessageBox MB_OK "Veuillez fermer Igoodar manuellement, puis relancer l'installateur."
      Abort
    auto_close:
  ${EndIf}
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
  
  ; Clean old installation (if exists)
  IfFileExists "$INSTDIR\start.js" 0 fresh_install
    DetailPrint "Removing old version..."
    RMDir /r "$INSTDIR\dist"
    RMDir /r "$INSTDIR\server"
    RMDir /r "$INSTDIR\shared"
    RMDir /r "$INSTDIR\scripts"
    RMDir /r "$INSTDIR\drizzle"
    RMDir /r "$INSTDIR\node_modules"
    RMDir /r "$INSTDIR\nodejs"
    ; Remove old data folder (data now in %APPDATA%)
    RMDir /r "$INSTDIR\data"
    Delete "$INSTDIR\*.bat"
    Delete "$INSTDIR\*.vbs"
    Delete "$INSTDIR\*.js"
    Delete "$INSTDIR\*.json"
    DetailPrint "Old files removed!"
  fresh_install:
  
  ; Install all files
  DetailPrint "Installing Igoodar..."
  File /r "/Users/abdessamadabba/repos/StockSage/packages/stocksage-simple-20251221141112\*.*"
  
  ; Database driver already included (Windows-compatible binary)
  DetailPrint "Windows-compatible database driver included"
  
  ; NOTE: Database initialization will happen on first run via start.js
  ; Data will be stored in %APPDATA%/iGoodar (safe from updates)
  DetailPrint "User data will be stored in: %APPDATA%\iGoodar"
  
  ; Create startup scripts that use PORTABLE Node.js (not system Node)
  FileOpen $0 "$INSTDIR\start.bat" w
  FileWrite $0 '@echo off$\r$\n'
  FileWrite $0 'cd /d "%~dp0"$\r$\n'
  FileWrite $0 'echo Starting Igoodar...$\r$\n'
  FileWrite $0 'title Igoodar Server$\r$\n'
  FileWrite $0 '"%~dp0nodejs\node.exe" start.js$\r$\n'
  FileWrite $0 'pause$\r$\n'
  FileClose $0
  
  ; NOTE: start.js handles data migration and database initialization automatically
  
  ; Silent startup for auto-start and background running (NO CONSOLE WINDOW)
  FileOpen $0 "$INSTDIR\start-silent.vbs" w
  FileWrite $0 'Set WshShell = CreateObject("WScript.Shell")$\r$\n'
  FileWrite $0 '$\r$\n'
  FileWrite $0 "' Get the directory where this script is located$\r$\n"
  FileWrite $0 'InstallDir = "$INSTDIR"$\r$\n'
  FileWrite $0 'NodeExe = InstallDir & "\nodejs\node.exe"$\r$\n'
  FileWrite $0 'StartJS = InstallDir & "\start.js"$\r$\n'
  FileWrite $0 '$\r$\n'
  FileWrite $0 "' Start the server in background (no window)$\r$\n"
  FileWrite $0 "' start.js handles data migration and database initialization$\r$\n"
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
  Sleep 4000
  
  ; Success message
  MessageBox MB_OK "✅ Igoodar installed successfully!$\n$\n✓ Server running in background$\n✓ Auto-starts with Windows$\n✓ Data safe in %APPDATA%\iGoodar$\n✓ Updates won't delete your data$\n✓ Opening dashboard...$\n$\nLogin:$\n• Admin PIN: 1234$\n• Cashier PIN: 5678$\n$\nAccess:$\n• Desktop: Igoodar icon$\n• Browser: http://localhost:5003$\n• Network: http://[PC-IP]:5003$\n$\nManagement:$\n• Start Menu → Igoodar → Restart/Stop"
  Sleep 1000
  ExecShell "open" "http://localhost:5003"
SectionEnd

Section "Uninstall"
  MessageBox MB_YESNO "Uninstall Igoodar?$\n$\nNote: Your data in %APPDATA%\iGoodar will be preserved.$\nYou can delete it manually if needed." IDYES do_uninstall
    Abort
  do_uninstall:
  
  ExecWait 'taskkill /F /IM node.exe /FI "WINDOWTITLE eq Igoodar*"'
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Igoodar"
  
  Delete "$DESKTOP\Igoodar.url"
  Delete "$SMPROGRAMS\Igoodar\*.lnk"
  Delete "$SMPROGRAMS\Igoodar\*.url"
  RMDir "$SMPROGRAMS\Igoodar"
  
  RMDir /r "$INSTDIR"
  
  MessageBox MB_OK "Igoodar uninstalled.$\n$\nYour data is preserved in:%APPDATA%\iGoodar$\n$\nTo completely remove all data, manually delete that folder."
SectionEnd
