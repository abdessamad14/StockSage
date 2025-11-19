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
echo.
echo ========================================
echo    Installing as Windows Service
echo ========================================
echo.

:: Check for admin rights
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Administrator rights required!
    echo.
    echo Please close this window and:
    echo 1. Right-click start.bat
    echo 2. Select "Run as Administrator"
    echo.
    pause
    exit /b 1
)

goto install_service

:install_service
:: Get full path to this script and Node.js
set "SCRIPT_PATH=%~f0"
set "APP_DIR=%~dp0"
set "NODE_PATH=%APP_DIR%node.exe"

:: Use system Node.js if local doesn't exist
if not exist "%NODE_PATH%" (
    set "NODE_PATH=node"
)

:: Check if service already exists
sc query "Igoodar" >nul 2>&1
if %errorlevel% equ 0 (
    echo Service already exists. Stopping and removing old service...
    sc stop "Igoodar" >nul 2>&1
    timeout /t 2 /nobreak >nul
    sc delete "Igoodar" >nul 2>&1
    timeout /t 2 /nobreak >nul
)

echo Creating Windows Service...
sc create "Igoodar" binPath= "\"%NODE_PATH%\" \"%APP_DIR%start.js\"" start= auto DisplayName= "Igoodar POS & Inventory" >nul

if %errorlevel% neq 0 (
    echo [ERROR] Failed to create service!
    echo.
    pause
    exit /b 1
)

sc description "Igoodar" "Igoodar POS and Inventory Management System - Auto-starts on boot" >nul
sc failure "Igoodar" reset= 86400 actions= restart/5000/restart/10000/restart/30000 >nul

echo Starting service...
sc start "Igoodar" >nul

timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo    Service Installed Successfully!
echo ========================================
echo.
echo ✓ Igoodar will now start automatically when PC boots
echo ✓ Service will restart automatically if it crashes
echo ✓ Access at: http://localhost:5003
echo.
echo Service Management Commands:
echo   • Check status:  sc query Igoodar
echo   • Stop service:  sc stop Igoodar
echo   • Start service: sc start Igoodar
echo   • Uninstall:     sc delete Igoodar
echo.
echo You can close this window now.
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
