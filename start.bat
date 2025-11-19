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

:: Start the app now
echo.
echo Starting Igoodar...
start /B "" node start.js

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
echo To stop: Open Task Manager and end "node.exe" process
echo To uninstall auto-start: Delete shortcut from Startup folder
echo   Location: %STARTUP_FOLDER%\Igoodar.lnk
echo.
pause
exit /b 0

:error
echo.
echo [ERROR] Setup failed!
pause
exit /b 1
