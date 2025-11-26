
; NSIS Installer Script for Igoodar
; This can be compiled on Mac using makensis
; Requires Windows 10 or higher

!include "WinVer.nsh"

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

; Check Windows version on init
Function .onInit
  ; Check if running on Windows 10 or higher
  ; Windows 10 = 10.0 (NT 6.2 kernel version changed to 10.0)
  ${If} ${AtMostWin8.1}
    MessageBox MB_OK|MB_ICONSTOP "Igoodar requires Windows 10 or higher.$\n$\nYour Windows version is not supported.$\n$\nPlease upgrade to Windows 10, Windows 11, or Windows Server 2016+ to install this application."
    Abort
  ${EndIf}
FunctionEnd

Section "Install"
  SetOutPath "$INSTDIR"
  
  ; ========================================
  ; PRESERVE DATA FOLDER DURING UPDATE
  ; ========================================
  
  ; Check if this is an update (data folder exists)
  IfFileExists "$INSTDIR\data\stocksage.db" 0 fresh_install
    ; This is an UPDATE - backup data first
    DetailPrint "Existing installation detected - backing up data..."
    CreateDirectory "$INSTDIR\data_backup"
    CopyFiles /SILENT "$INSTDIR\data\*.*" "$INSTDIR\data_backup"
    DetailPrint "Data backed up to data_backup folder"
  fresh_install:
  
  ; Copy all files (this overwrites everything except what we backed up)
  File /r "/Users/abdessamadabba/repos/StockSage/installer-build/stocksage-20251126093914\*.*"
  
  ; Restore data if this was an update
  IfFileExists "$INSTDIR\data_backup\stocksage.db" 0 no_restore
    DetailPrint "Restoring your data..."
    CreateDirectory "$INSTDIR\data"
    CopyFiles /SILENT "$INSTDIR\data_backup\*.*" "$INSTDIR\data"
    DetailPrint "Data restored successfully!"
  no_restore:
  
  ; Create shortcuts
  CreateDirectory "$SMPROGRAMS\Igoodar"
  
  ; Desktop shortcut - runs start.bat to launch the app
  CreateShortcut "$DESKTOP\Igoodar.lnk" "$INSTDIR\start.bat" "" "$INSTDIR\nodejs\node.exe" 0 SW_SHOWMINIMIZED "" "Start Igoodar POS"
  
  ; Start Menu shortcuts
  CreateShortcut "$SMPROGRAMS\Igoodar\Igoodar.lnk" "$INSTDIR\start.bat" "" "$INSTDIR\nodejs\node.exe" 0 SW_SHOWMINIMIZED "" "Start Igoodar POS"
  CreateShortcut "$SMPROGRAMS\Igoodar\Debug Install.lnk" "$INSTDIR\debug-install.bat" "" "$INSTDIR\nodejs\node.exe" 0 SW_SHOWNORMAL "" "Debug Igoodar Installation"
  CreateShortcut "$SMPROGRAMS\Igoodar\Create Shortcuts.lnk" "$INSTDIR\create-shortcuts.vbs" "" "$INSTDIR\nodejs\node.exe" 0 SW_SHOWNORMAL "" "Create Desktop and Start Menu Shortcuts"
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
  
  ; Show different message for update vs fresh install
  IfFileExists "$INSTDIR\data_backup\stocksage.db" 0 show_fresh_message
    ; UPDATE message
    MessageBox MB_OK|MB_ICONINFORMATION "Igoodar has been UPDATED successfully!$\n$\nYour data has been preserved:$\n- All products$\n- All sales history$\n- All customers$\n- All settings$\n$\nTo start the application:$\n1. Double-click the 'Igoodar' icon on your desktop$\n2. Login with your existing PIN$\n$\nThe application will be available at:$\nhttp://localhost:5003"
    Goto done_message
  show_fresh_message:
    ; FRESH INSTALL message
    MessageBox MB_OK|MB_ICONINFORMATION "Igoodar has been installed successfully!$\n$\nSystem Requirements: Windows 10 or higher$\nNode.js: v20.18.1 LTS (included)$\n$\nTo start the application:$\n1. Double-click the 'Igoodar' icon on your desktop$\n2. Wait for browser to open automatically$\n3. Login with PIN: 1234 (Admin) or 5678 (Cashier)$\n$\nThe application will be available at:$\nhttp://localhost:5003"
  done_message:
SectionEnd

Section "Uninstall"
  ; Warn user about data deletion
  MessageBox MB_YESNO|MB_ICONQUESTION "Are you sure you want to uninstall Igoodar?$\n$\nWARNING: This will DELETE all your data including:$\n- Products$\n- Sales history$\n- Customers$\n- Settings$\n$\nTo keep your data, click NO and backup the 'data' folder first." IDYES proceed_uninstall
    Abort "Uninstall cancelled"
  proceed_uninstall:
  
  ; Stop application if running
  ExecWait 'taskkill /IM node.exe /F /FI "WINDOWTITLE eq Igoodar*"'
  
  ; Remove shortcuts
  Delete "$DESKTOP\Igoodar.lnk"
  Delete "$SMPROGRAMS\Igoodar\Igoodar.lnk"
  Delete "$SMPROGRAMS\Igoodar\Debug Install.lnk"
  Delete "$SMPROGRAMS\Igoodar\Create Shortcuts.lnk"
  Delete "$SMPROGRAMS\Igoodar\Uninstall.lnk"
  RMDir "$SMPROGRAMS\Igoodar"
  
  ; Remove files
  RMDir /r "$INSTDIR"
  
  MessageBox MB_OK|MB_ICONINFORMATION "Igoodar has been uninstalled."
SectionEnd
