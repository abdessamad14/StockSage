@echo off
setlocal enabledelayedexpansion

echo Starting StockSage Inventory System...
echo.

:: Check if --install-service flag is passed
if "%1"=="--install-service" goto install_service

if not exist node_modules goto setup
if not exist dist\public goto setup
goto launch

:setup
echo Running initial setup (this may take a moment)...
call npm run setup || goto error

:launch
echo Launching application...
call npm start || goto error
goto end

:install_service
echo.
echo ========================================
echo    Installing Auto-Start Service
echo ========================================
echo.

:: Check for admin rights
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Administrator rights required!
    echo Please right-click this file and select "Run as Administrator"
    echo.
    pause
    exit /b 1
)

:: Get full path to this script and Node.js
set "SCRIPT_PATH=%~f0"
set "APP_DIR=%~dp0"
set "NODE_PATH=%APP_DIR%node.exe"

:: Use system Node.js if local doesn't exist
if not exist "%NODE_PATH%" (
    set "NODE_PATH=node"
)

echo Creating Windows Service...
sc create "Igoodar" binPath= "\"%NODE_PATH%\" \"%APP_DIR%start.js\"" start= auto DisplayName= "Igoodar POS & Inventory"
sc description "Igoodar" "Igoodar POS and Inventory Management System - Auto-starts on boot"
sc start "Igoodar"

echo.
echo ========================================
echo    Service Installed Successfully!
echo ========================================
echo.
echo ✓ Igoodar will now start automatically when PC boots
echo ✓ Access at: http://localhost:5003
echo.
echo Service Management:
echo   • Check status: sc query Igoodar
echo   • Stop: sc stop Igoodar
echo   • Start: sc start Igoodar
echo   • Uninstall: sc delete Igoodar
echo.
pause
exit /b 0

:error
echo.
echo An error occurred while starting StockSage.
pause
exit /b 1

:end
echo.
echo StockSage exited.
pause
