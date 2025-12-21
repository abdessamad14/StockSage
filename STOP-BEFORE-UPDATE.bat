@echo off
REM Stop Igoodar Before Update
REM Run this script before installing a new version

echo.
echo ========================================
echo   Arret d'Igoodar
echo ========================================
echo.
echo Fermeture de tous les processus Igoodar...
echo.

REM Kill all node.exe processes
taskkill /F /IM node.exe >nul 2>&1

REM Wait a bit
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   Igoodar arrete avec succes!
echo ========================================
echo.
echo Vous pouvez maintenant installer la nouvelle version.
echo.
pause

