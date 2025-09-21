@echo off
setlocal enabledelayedexpansion

echo Starting StockSage Inventory System...
echo.

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

:error
echo.
echo An error occurred while starting StockSage.
pause
exit /b 1

:end
echo.
echo StockSage exited.
pause
