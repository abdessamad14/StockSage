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

:: Create startup batch file
echo Creating auto-start script...
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "STARTUP_SCRIPT=%APP_DIR%start-service.bat"

:: Create start-service.bat
echo @echo off > "%STARTUP_SCRIPT%"
echo cd /d "%APP_DIR%" >> "%STARTUP_SCRIPT%"
echo start /B "%APP_DIR%nodejs\node.exe" start.js >> "%STARTUP_SCRIPT%"

:: Create shortcut in Startup folder
echo Set oWS = WScript.CreateObject("WScript.Shell") > CreateShortcut.vbs
echo sLinkFile = "%STARTUP_FOLDER%\Igoodar.lnk" >> CreateShortcut.vbs
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> CreateShortcut.vbs
echo oLink.TargetPath = "%STARTUP_SCRIPT%" >> CreateShortcut.vbs
echo oLink.WorkingDirectory = "%APP_DIR%" >> CreateShortcut.vbs
echo oLink.WindowStyle = 7 >> CreateShortcut.vbs
echo oLink.Description = "Igoodar POS & Inventory" >> CreateShortcut.vbs
echo oLink.Save >> CreateShortcut.vbs

cscript //nologo CreateShortcut.vbs
del CreateShortcut.vbs

echo ✓ Auto-start configured

:: Create desktop shortcut (opens browser)
echo Creating desktop shortcut...
set "DESKTOP=%USERPROFILE%\Desktop"
echo Set oWS = WScript.CreateObject("WScript.Shell") > CreateShortcut.vbs
echo sLinkFile = "%DESKTOP%\Igoodar.lnk" >> CreateShortcut.vbs
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> CreateShortcut.vbs
echo oLink.TargetPath = "http://localhost:5003" >> CreateShortcut.vbs
echo oLink.Description = "Open Igoodar POS" >> CreateShortcut.vbs
echo oLink.Save >> CreateShortcut.vbs

cscript //nologo CreateShortcut.vbs
del CreateShortcut.vbs

echo ✓ Desktop shortcut created

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
echo ✓ Will auto-start when you log in to Windows
echo ✓ Desktop shortcut created
echo ✓ Browser opened to: http://localhost:5003
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
