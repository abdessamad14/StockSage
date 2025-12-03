@echo off
echo ========================================
echo    Starting Igoodar
echo ========================================
echo.

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

:: Change to application directory (important for shortcuts!)
cd /d "%APP_DIR%"

:: Check if node_modules exists (should be included in package)
if not exist "%APP_DIR%node_modules\" (
    echo [ERROR] node_modules folder missing!
    echo This package should include node_modules for offline installation.
    echo.
    echo If you extracted from ZIP, make sure you extracted the COMPLETE file.
    echo.
    echo Current directory: %CD%
    echo App directory: %APP_DIR%
    echo.
    pause
    goto error
)

echo ✓ Dependencies found

:: Start the app in background
echo.
echo Starting Igoodar...
start /B "" "%APP_DIR%nodejs\node.exe" start.js

:: Wait for server to start
timeout /t 5 /nobreak >nul

:: Open browser
echo Opening browser...
start http://localhost:5003

echo.
echo ========================================
echo    Igoodar Started Successfully!
echo ========================================
echo.
echo ✓ Igoodar is now running
echo ✓ Browser opened to: http://localhost:5003
echo.
echo To access Igoodar: Use the desktop shortcut or go to http://localhost:5003
echo.
echo You can close this window now!
echo.
pause
exit /b 0

:error
echo.
echo [ERROR] Setup failed!
pause
exit /b 1
