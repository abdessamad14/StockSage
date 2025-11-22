@echo off
echo ========================================
echo    Starting Igoodar
echo ========================================
echo.

:: Check for admin rights
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Administrator rights required!
    echo.
    echo Please right-click start.bat and select "Run as Administrator"
    echo.
    pause
    exit /b 1
)

:: Get current directory
set "APP_DIR=%~dp0"

:: Check for embedded Node.js portable (offline mode)
set "PORTABLE_NODE=%APP_DIR%nodejs\node.exe"
set "PORTABLE_NPM=%APP_DIR%nodejs\npm.cmd"

echo Checking for Node.js...
echo Looking in: %APP_DIR%nodejs\

if exist "%PORTABLE_NODE%" (
    echo ✓ Found embedded Node.js portable
    set "PATH=%APP_DIR%nodejs;%PATH%"
    goto setup
)

echo ✗ Node.js portable not found at: %PORTABLE_NODE%
echo.
echo Checking current directory contents:
dir "%APP_DIR%" | findstr /i "nodejs"
echo.

:: Check if Node.js is installed on system
where node >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Using system Node.js
    goto setup
)

:: Node.js not found - show error
echo.
echo ========================================
echo    Node.js Not Found!
echo ========================================
echo.
echo This package requires Node.js portable.
echo.
echo TROUBLESHOOTING:
echo   1. Make sure you extracted the COMPLETE ZIP file
echo   2. Check if 'nodejs' folder exists in the same folder as start.bat
echo   3. Try extracting with 7-Zip or WinRAR instead of Windows extractor
echo   4. Make sure the path doesn't have special characters
echo.
echo Or install Node.js manually from: https://nodejs.org/
echo   Then run start.bat again
echo.
echo ========================================
echo.
pause
exit /b 1

:setup
:: Node.js is available, continue with setup

:: Check if node_modules exists
if not exist "node_modules\" (
    echo Running initial setup...
    call npm run setup
    if %errorlevel% neq 0 goto error
)

:: Setup auto-start
echo Setting up auto-start...

:: Get startup folder path
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"

:: Get current directory
set "APP_DIR=%~dp0"

:: Create shortcut to start-background.vbs in Startup folder
echo Set oWS = WScript.CreateObject("WScript.Shell") > CreateShortcut.vbs
echo sLinkFile = "%STARTUP_FOLDER%\Igoodar.lnk" >> CreateShortcut.vbs
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> CreateShortcut.vbs
echo oLink.TargetPath = "%APP_DIR%start-background.vbs" >> CreateShortcut.vbs
echo oLink.WorkingDirectory = "%APP_DIR%" >> CreateShortcut.vbs
echo oLink.Description = "Igoodar POS & Inventory" >> CreateShortcut.vbs
echo oLink.Save >> CreateShortcut.vbs

cscript //nologo CreateShortcut.vbs
del CreateShortcut.vbs

echo ✓ Auto-start configured

:: Start the app now using the VBS script (runs hidden)
echo.
echo Starting Igoodar in background...
wscript //nologo "%APP_DIR%start-background.vbs"

:: Wait a moment for server to start
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo    Igoodar Started Successfully!
echo ========================================
echo.
echo ✓ Igoodar is now running in background
echo ✓ Will auto-start when you log in to Windows
echo ✓ Access at: http://localhost:5003
echo.
echo IMPORTANT: You can now close this window!
echo           The app will keep running in the background.
echo.
echo To stop: Open Task Manager and end "node.exe" process
echo To uninstall auto-start: Delete shortcut from Startup folder
echo   Location: %STARTUP_FOLDER%\Igoodar.lnk
echo.
echo Press any key to close this window...
pause >nul
exit /b 0

:error
echo.
echo [ERROR] Setup failed!
pause
exit /b 1
