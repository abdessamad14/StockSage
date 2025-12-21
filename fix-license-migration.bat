@echo off
REM Fix License Migration Script
REM This script manually migrates your license and data to the correct location

echo.
echo ========================================
echo   Fix License Migration
echo ========================================
echo.

REM Define paths
set "OLD_DATA=%LOCALAPPDATA%\Igoodar\data"
set "NEW_DATA=%APPDATA%\iGoodar"

echo Checking for old data location...
echo Old: %OLD_DATA%
echo New: %NEW_DATA%
echo.

REM Create new directory if it doesn't exist
if not exist "%NEW_DATA%" (
    echo Creating new data directory...
    mkdir "%NEW_DATA%"
    echo Created: %NEW_DATA%
) else (
    echo New directory already exists.
)
echo.

REM Check if old data exists
if exist "%OLD_DATA%" (
    echo Found old data directory!
    echo.
    
    REM Migrate each critical file
    if exist "%OLD_DATA%\license.key" (
        echo Migrating license.key...
        copy /Y "%OLD_DATA%\license.key" "%NEW_DATA%\license.key"
        if %ERRORLEVEL% EQU 0 (
            echo   ✓ license.key migrated
        ) else (
            echo   ✗ Failed to migrate license.key
        )
    ) else (
        echo   ℹ license.key not found in old location
    )
    
    if exist "%OLD_DATA%\stocksage.db" (
        echo Migrating stocksage.db...
        copy /Y "%OLD_DATA%\stocksage.db" "%NEW_DATA%\stocksage.db"
        if %ERRORLEVEL% EQU 0 (
            echo   ✓ stocksage.db migrated
        ) else (
            echo   ✗ Failed to migrate stocksage.db
        )
    ) else (
        echo   ℹ stocksage.db not found in old location
    )
    
    if exist "%OLD_DATA%\machine.id" (
        echo Migrating machine.id...
        copy /Y "%OLD_DATA%\machine.id" "%NEW_DATA%\machine.id"
        if %ERRORLEVEL% EQU 0 (
            echo   ✓ machine.id migrated
        ) else (
            echo   ✗ Failed to migrate machine.id
        )
    ) else (
        echo   ℹ machine.id not found in old location
    )
    
    if exist "%OLD_DATA%\credit-transactions.json" (
        echo Migrating credit-transactions.json...
        copy /Y "%OLD_DATA%\credit-transactions.json" "%NEW_DATA%\credit-transactions.json"
        if %ERRORLEVEL% EQU 0 (
            echo   ✓ credit-transactions.json migrated
        ) else (
            echo   ✗ Failed to migrate credit-transactions.json
        )
    ) else (
        echo   ℹ credit-transactions.json not found in old location
    )
    
    echo.
    echo ========================================
    echo   Migration Complete!
    echo ========================================
    echo.
    echo Your data is now in: %NEW_DATA%
    echo.
    echo Opening the new data folder...
    explorer "%NEW_DATA%"
    echo.
    
) else (
    echo Old data directory not found.
    echo Looking for data in current directory...
    echo.
    
    REM Try migrating from current directory
    if exist "data\license.key" (
        echo Found license.key in current directory!
        copy /Y "data\license.key" "%NEW_DATA%\license.key"
        echo   ✓ Migrated from current directory
    )
    
    if exist "data\stocksage.db" (
        echo Found stocksage.db in current directory!
        copy /Y "data\stocksage.db" "%NEW_DATA%\stocksage.db"
        echo   ✓ Migrated from current directory
    )
    
    if exist "data\machine.id" (
        echo Found machine.id in current directory!
        copy /Y "data\machine.id" "%NEW_DATA%\machine.id"
        echo   ✓ Migrated from current directory
    )
)

echo.
echo ========================================
echo   Verification
echo ========================================
echo.
echo Checking files in new location:
echo.

if exist "%NEW_DATA%\license.key" (
    echo   ✓ license.key found
) else (
    echo   ✗ license.key NOT found
)

if exist "%NEW_DATA%\stocksage.db" (
    echo   ✓ stocksage.db found
) else (
    echo   ✗ stocksage.db NOT found
)

if exist "%NEW_DATA%\machine.id" (
    echo   ✓ machine.id found
) else (
    echo   ✗ machine.id NOT found
)

echo.
echo ========================================
echo   Next Steps
echo ========================================
echo.
echo 1. Restart Igoodar (Menu Demarrer → Restart Igoodar)
echo 2. Your license should now be recognized
echo 3. Your data is safe in: %NEW_DATA%
echo.
pause

