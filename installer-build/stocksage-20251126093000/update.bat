@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo    Igoodar Update Installer
echo ========================================
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

echo WARNING: This will update Igoodar to the latest version.
echo Your data will be preserved (database, license, settings).
echo.
pause

:: Stop the service if running
echo.
echo Stopping Igoodar service...
sc query "Igoodar" >nul 2>&1
if %errorlevel% equ 0 (
    sc stop "Igoodar" >nul 2>&1
    timeout /t 3 /nobreak >nul
    echo ✓ Service stopped
) else (
    echo ℹ Service not running
)

:: Backup data folder (just in case)
echo.
echo Creating backup of data folder...
set "BACKUP_DIR=%~dp0data_backup_%date:~-4%%date:~-7,2%%date:~-10,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "BACKUP_DIR=%BACKUP_DIR: =0%"

if exist "%~dp0data" (
    xcopy "%~dp0data" "%BACKUP_DIR%" /E /I /Q >nul
    echo ✓ Backup created: %BACKUP_DIR%
) else (
    echo ℹ No data folder found (first install?)
)

:: Clean old files (but keep data folder!)
echo.
echo Removing old application files...
if exist "%~dp0dist" rd /s /q "%~dp0dist" 2>nul
if exist "%~dp0server" rd /s /q "%~dp0server" 2>nul
if exist "%~dp0node_modules" rd /s /q "%~dp0node_modules" 2>nul
if exist "%~dp0client" rd /s /q "%~dp0client" 2>nul
echo ✓ Old files removed

echo.
echo ========================================
echo    IMPORTANT
echo ========================================
echo.
echo Now extract the new version ZIP to this folder.
echo.
echo Steps:
echo 1. Extract new igoodar ZIP
echo 2. When asked "Replace files?" → Click YES
echo 3. Make sure to KEEP the data folder!
echo 4. After extraction, run start.bat as Administrator
echo.
echo Your data is safe in: %~dp0data
echo Backup is at: %BACKUP_DIR%
echo.
pause

echo.
echo Update preparation complete!
echo.
echo Next steps:
echo 1. Extract new version ZIP to this folder
echo 2. Run start.bat as Administrator
echo.
pause
