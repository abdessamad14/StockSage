
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
  File /r "/Users/abdessamadabba/repos/StockSage/installer-build/stocksage-20251124125631\*.*"
  
  ; Create shortcuts
  CreateDirectory "$SMPROGRAMS\Igoodar"
  
  ; Desktop shortcut - runs start.bat to launch the app
  CreateShortcut "$DESKTOP\Igoodar.lnk" "$INSTDIR\start.bat" "" "$INSTDIR\nodejs\node.exe" 0 SW_SHOWMINIMIZED "" "Start Igoodar POS"
  
  ; Start Menu shortcuts
  CreateShortcut "$SMPROGRAMS\Igoodar\Igoodar.lnk" "$INSTDIR\start.bat" "" "$INSTDIR\nodejs\node.exe" 0 SW_SHOWMINIMIZED "" "Start Igoodar POS"
  CreateShortcut "$SMPROGRAMS\Igoodar\Debug Install.lnk" "$INSTDIR\debug-install.bat" "" "$INSTDIR\nodejs\node.exe" 0 SW_SHOWNORMAL "" "Debug Igoodar Installation"
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
  
  ; Installation complete message
  DetailPrint "Installation completed successfully!"
  
  ; Show completion message
  MessageBox MB_OK|MB_ICONINFORMATION "Igoodar has been installed successfully!$\n$\nTo start the application:$\n1. Double-click the 'Igoodar' icon on your desktop$\n2. Wait for browser to open automatically$\n3. Login with PIN: 1234 (Admin) or 5678 (Cashier)$\n$\nThe application will be available at:$\nhttp://localhost:5003"
SectionEnd

Section "Uninstall"
  ; Stop application if running
  ExecWait 'taskkill /IM node.exe /F /FI "WINDOWTITLE eq Igoodar*"'
  
  ; Remove shortcuts
  Delete "$DESKTOP\Igoodar.lnk"
  Delete "$SMPROGRAMS\Igoodar\Igoodar.lnk"
  Delete "$SMPROGRAMS\Igoodar\Debug Install.lnk"
  Delete "$SMPROGRAMS\Igoodar\Uninstall.lnk"
  RMDir "$SMPROGRAMS\Igoodar"
  
  ; Remove files
  RMDir /r "$INSTDIR"
SectionEnd
