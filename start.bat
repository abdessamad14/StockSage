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

:: Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [INFO] Node.js not found. Installing Node.js...
    echo.
    
    :: Download Node.js installer (LTS version)
    echo Downloading Node.js installer...
    powershell -Command "& {[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi' -OutFile '%TEMP%\nodejs-installer.msi'}"
    
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to download Node.js installer
        echo.
        echo Please install Node.js manually from: https://nodejs.org/
        echo Then run start.bat again.
        pause
        exit /b 1
    )
    
    :: Install Node.js silently
    echo Installing Node.js (this may take a few minutes)...
    msiexec /i "%TEMP%\nodejs-installer.msi" /qn /norestart
    
    :: Clean up installer
    del "%TEMP%\nodejs-installer.msi" >nul 2>&1
    
    :: Refresh PATH environment variable
    call refreshenv >nul 2>&1
    
    :: Check if installation succeeded
    where node >nul 2>&1
    if %errorlevel% neq 0 (
        echo.
        echo [WARNING] Node.js installed but not found in PATH
        echo Please restart your computer and run start.bat again.
        pause
        exit /b 1
    )
    
    echo ✓ Node.js installed successfully
    echo.
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
