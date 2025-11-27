@echo off
echo.
echo ========================================
echo    Igoodar Settings Schema Fix
echo ========================================
echo.
echo This will fix missing columns in the settings table.
echo.
pause

npm run db:fix-settings

echo.
echo ========================================
echo    Fix Complete!
echo ========================================
echo.
echo You can now start Igoodar:
echo    start.bat
echo.
pause
