
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
  File /r "/Users/abdessamadabba/repos/StockSage/installer-build/stocksage-20251122145141\*.*"
  
  ; Create shortcuts
  CreateDirectory "$SMPROGRAMS\Igoodar"
  CreateShortcut "$SMPROGRAMS\Igoodar\Igoodar.lnk" "$INSTDIR\start-background.vbs"
  CreateShortcut "$DESKTOP\Igoodar.lnk" "$INSTDIR\start-background.vbs"
  
  ; Create uninstaller
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  CreateShortcut "$SMPROGRAMS\Igoodar\Uninstall.lnk" "$INSTDIR\Uninstall.exe"
  
  ; Install dependencies
  ExecWait '"$INSTDIR\nodejs\npm.cmd" install --production' $0
  
  ; Initialize database
  ExecWait '"$INSTDIR\nodejs\node.exe" "$INSTDIR\scripts\init-sqlite.js"' $0
  
  ; Start application
  Exec 'wscript.exe "$INSTDIR\start-background.vbs"'
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
