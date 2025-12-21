@echo off
REM Create Kiosk Mode Shortcut for Silent Printing
REM This script creates a desktop shortcut that launches iGoodar in kiosk mode

echo.
echo ========================================
echo   Creating Kiosk Mode Shortcut
echo ========================================
echo.

REM Find Chrome installation
set "CHROME_PATH="

REM Try common Chrome locations
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
)
if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)
if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
)

if "%CHROME_PATH%"=="" (
    echo ❌ Chrome not found!
    echo Please install Google Chrome first.
    pause
    exit /b 1
)

echo ✓ Chrome found at: %CHROME_PATH%
echo.

REM Create VBS script for silent printing shortcut
set "SHORTCUT_PATH=%DESKTOP%\Igoodar (Silent Print).lnk"
set "VBS_PATH=%TEMP%\create_kiosk_shortcut.vbs"

echo Creating shortcut with silent printing enabled...

(
echo Set oWS = WScript.CreateObject^("WScript.Shell"^)
echo sLinkFile = "%SHORTCUT_PATH%"
echo Set oLink = oWS.CreateShortcut^(sLinkFile^)
echo oLink.TargetPath = "%CHROME_PATH%"
echo oLink.Arguments = "--app=http://localhost:5003/pos --kiosk-printing --silent-launch --disable-popup-blocking --disable-infobars"
echo oLink.WorkingDirectory = "%USERPROFILE%"
echo oLink.Description = "iGoodar POS - Silent Printing Mode"
echo oLink.Save
) > "%VBS_PATH%"

cscript //nologo "%VBS_PATH%"
del "%VBS_PATH%"

echo.
echo ========================================
echo   ✅ Shortcut Created!
echo ========================================
echo.
echo Location: %DESKTOP%\Igoodar (Silent Print).lnk
echo.
echo 📋 Instructions:
echo 1. Use this shortcut to launch iGoodar
echo 2. Printing will be SILENT (no dialog)
echo 3. Prints to Windows default printer
echo.
echo ⚙️  To set default printer:
echo 1. Settings → Devices → Printers
echo 2. Right-click your thermal printer
echo 3. Set as default
echo.
pause

