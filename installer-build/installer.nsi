
; NSIS Installer Script for Igoodar
; This can be compiled on Mac using makensis

!define APP_NAME "Igoodar"
!define APP_VERSION "1.0.0"
!define APP_PUBLISHER "Your Company"
!define INSTALL_DIR "$PROGRAMFILES64\Igoodar"

Name "${APP_NAME}"
OutFile "/Users/abdessamadabba/repos/StockSage/installer-build/output/igoodar-setup-1.0.0.exe"
InstallDir "${INSTALL_DIR}"
RequestExecutionLevel admin

Page directory
Page instfiles

Section "Install"
  SetOutPath "$INSTDIR"
  
  ; Copy all files
  File /r "/Users/abdessamadabba/repos/StockSage/installer-build/stocksage-20251124003532\*.*"
  
  ; Create shortcuts
  CreateDirectory "$SMPROGRAMS\Igoodar"
  
  ; Desktop shortcut - opens browser to app
  CreateShortcut "$DESKTOP\Igoodar.lnk" "http://localhost:5003" "" "$INSTDIR\favicon.ico" 0 SW_SHOWNORMAL "" "Open Igoodar POS"
  
  ; Start Menu shortcuts
  CreateShortcut "$SMPROGRAMS\Igoodar\Igoodar.lnk" "http://localhost:5003" "" "$INSTDIR\favicon.ico" 0 SW_SHOWNORMAL "" "Open Igoodar POS"
  CreateShortcut "$SMPROGRAMS\Igoodar\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
  
  ; Create uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  
  ; Verify node_modules exists (should be pre-included)
  DetailPrint "Verifying dependencies..."
  IfFileExists "$INSTDIR\node_modules\*.*" deps_ok deps_missing
  deps_missing:
    MessageBox MB_OK|MB_ICONEXCLAMATION "Error: node_modules folder is missing!$\nThis package should include all dependencies.$\nPlease contact support."
    Abort "Installation failed: Missing dependencies"
  deps_ok:
  DetailPrint "Dependencies verified (pre-installed)"
  
  ; Initialize database
  DetailPrint "Initializing database..."
  ExecWait '"$INSTDIR\nodejs\node.exe" "$INSTDIR\scripts\init-sqlite.js"' $0
  
  ; Create startup batch file to run app in background
  FileOpen $0 "$INSTDIR\start-service.bat" w
  FileWrite $0 '@echo off$\r$\n'
  FileWrite $0 'cd /d "$INSTDIR"$\r$\n'
  FileWrite $0 'start /B "$INSTDIR\nodejs\node.exe" start.js$\r$\n'
  FileClose $0
  
  ; Add to startup
  CreateShortcut "$SMSTARTUP\Igoodar.lnk" "$INSTDIR\start-service.bat" "" "$INSTDIR\favicon.ico" 0 SW_SHOWMINIMIZED "" "Start Igoodar Service"
  
  ; Start application now
  DetailPrint "Starting Igoodar..."
  Exec '"$INSTDIR\start-service.bat"'
  
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
  Delete "$DESKTOP\Igoodar.lnk"
  RMDir /r "$SMPROGRAMS\Igoodar"
SectionEnd
