@echo off
echo ========================================
echo    Uninstalling Igoodar
echo ========================================
echo.

:: Check for admin rights
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Administrator rights required!
    echo.
    echo Please right-click uninstall.bat and select "Run as Administrator"
    echo.
    pause
    exit /b 1
)

:: Stop running app
echo Stopping Igoodar...
taskkill /IM node.exe /F >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Stopped running processes
) else (
    echo ℹ No running processes found
)

:: Remove auto-start shortcut
echo Removing auto-start...
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
if exist "%STARTUP_FOLDER%\Igoodar.lnk" (
    del "%STARTUP_FOLDER%\Igoodar.lnk"
    echo ✓ Removed auto-start shortcut
) else (
    echo ℹ No auto-start shortcut found
)

:: Get current directory
set "APP_DIR=%~dp0"

echo.
echo ========================================
echo    Uninstall Complete!
echo ========================================
echo.
echo The following items have been removed:
echo   ✓ Running processes stopped
echo   ✓ Auto-start disabled
echo.
echo To completely remove Igoodar:
echo   Delete this folder: %APP_DIR%
echo.
echo Note: Your license data is in the 'data' folder.
echo       Keep it if you want to reinstall later.
echo.
pause
