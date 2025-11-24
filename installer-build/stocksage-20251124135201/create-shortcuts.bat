@echo off
echo ========================================
echo Igoodar - Create Desktop Shortcuts
echo ========================================
echo.

:: Get the current directory (installation directory)
set "INSTALL_DIR=%~dp0"
set "INSTALL_DIR=%INSTALL_DIR:~0,-1%"

echo Installation directory: %INSTALL_DIR%
echo.

:: Create desktop shortcut using PowerShell
echo Creating desktop shortcut...

powershell -Command ^
    "$WshShell = New-Object -ComObject WScript.Shell; ^
    $Shortcut = $WshShell.CreateShortcut('%USERPROFILE%\Desktop\Igoodar.lnk'); ^
    $Shortcut.TargetPath = '%INSTALL_DIR%\start.bat'; ^
    $Shortcut.WorkingDirectory = '%INSTALL_DIR%'; ^
    $Shortcut.IconLocation = '%INSTALL_DIR%\nodejs\node.exe,0'; ^
    $Shortcut.Description = 'Start Igoodar POS System'; ^
    $Shortcut.WindowStyle = 7; ^
    $Shortcut.Save()"

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo SUCCESS!
    echo ========================================
    echo.
    echo Desktop shortcut created successfully!
    echo.
    echo You can now:
    echo   1. Double-click "Igoodar" icon on your desktop
    echo   2. Or run start.bat directly from this folder
    echo.
    echo The application will open at: http://localhost:5003
    echo.
) else (
    echo.
    echo ========================================
    echo ERROR!
    echo ========================================
    echo.
    echo Failed to create desktop shortcut.
    echo.
    echo Please run this script as Administrator.
    echo.
)

echo Press any key to exit...
pause >nul
