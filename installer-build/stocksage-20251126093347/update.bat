@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo    Igoodar Update Tool
echo ========================================
echo.
echo This tool will safely update Igoodar while
echo preserving your data (database, settings).
echo.

:: Check for admin rights
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Administrator rights required!
    echo.
    echo Please right-click this file and select "Run as Administrator"
    echo.
    pause
    exit /b 1
)

echo Current installation: %~dp0
echo.
echo Press any key to start the update process...
pause >nul

:: Stop any running Node.js processes for Igoodar
echo.
echo [1/5] Stopping Igoodar if running...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq *Igoodar*" >nul 2>&1
taskkill /F /FI "IMAGENAME eq node.exe" /FI "MEMUSAGE gt 50000" >nul 2>&1
echo      Done

:: Backup data folder
echo.
echo [2/5] Backing up your data...
set "BACKUP_DIR=%~dp0data_backup"

if exist "%~dp0data" (
    if exist "%BACKUP_DIR%" rd /s /q "%BACKUP_DIR%" 2>nul
    xcopy "%~dp0data" "%BACKUP_DIR%\" /E /I /Q >nul
    echo      Database backed up to: data_backup\
) else (
    echo      No existing data found (fresh install)
)

:: Check if new version files exist (user should have copied them)
echo.
echo [3/5] Checking for new version files...

if not exist "%~dp0server\index.ts" (
    echo.
    echo ========================================
    echo    NEW VERSION FILES NOT FOUND
    echo ========================================
    echo.
    echo Please copy the new Igoodar files to:
    echo %~dp0
    echo.
    echo Steps:
    echo 1. Download the new igoodar-setup-x.x.x.exe or ZIP
    echo 2. Extract/copy all files to this folder
    echo 3. When asked "Replace files?" click YES
    echo 4. Keep the data and data_backup folders!
    echo 5. Run this update.bat again
    echo.
    echo Your data is safe in: %~dp0data
    echo Backup is at: %BACKUP_DIR%
    echo.
    pause
    exit /b 0
)

echo      New version files found!

:: Restore data folder if it was overwritten
echo.
echo [4/5] Restoring your data...
if exist "%BACKUP_DIR%\stocksage.db" (
    if not exist "%~dp0data" mkdir "%~dp0data"
    xcopy "%BACKUP_DIR%\*" "%~dp0data\" /E /Y /Q >nul
    echo      Data restored successfully!
) else (
    echo      No backup to restore (fresh install)
)

:: Run database migrations
echo.
echo [5/5] Updating database schema...
if exist "%~dp0nodejs\node.exe" (
    "%~dp0nodejs\node.exe" "%~dp0scripts\init-sqlite.js"
    echo      Database updated!
) else (
    echo      [WARNING] Node.js not found, skipping migrations
)

echo.
echo ========================================
echo    UPDATE COMPLETE!
echo ========================================
echo.
echo Your data has been preserved.
echo.
echo To start Igoodar:
echo   Double-click the desktop shortcut "Igoodar"
echo   Or run start.bat
echo.
echo Login: PIN 1234 (Admin) or 5678 (Cashier)
echo.
pause
