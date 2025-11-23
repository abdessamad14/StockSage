@echo off
echo ========================================
echo   igoodar - Windows Fix Script
echo ========================================
echo.
echo This script will rebuild native modules for Windows
echo.

echo Step 1: Removing old better-sqlite3 build...
if exist "node_modules\better-sqlite3" (
    rmdir /s /q node_modules\better-sqlite3
    echo Done!
) else (
    echo better-sqlite3 not found, skipping...
)
echo.

echo Step 2: Rebuilding better-sqlite3 for Windows...
call npm install better-sqlite3 --build-from-source
if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo   ERROR: Build failed!
    echo ========================================
    echo.
    echo You may need to install build tools:
    echo   npm install --global windows-build-tools
    echo.
    echo Or install Visual Studio Build Tools from:
    echo   https://visualstudio.microsoft.com/downloads/
    echo.
    pause
    exit /b 1
)
echo.

echo ========================================
echo   SUCCESS! Native modules rebuilt
echo ========================================
echo.
echo You can now run: npm start
echo.
pause
