@echo off
echo ========================================
echo Igoodar Installation Diagnostic Tool
echo ========================================
echo.

REM Check if running as Administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: Not running as Administrator
    echo Some checks may fail
    echo.
    echo Right-click this file and select "Run as Administrator"
    echo.
    pause
)

echo [1/10] Checking installation directory...
cd "C:\Program Files\Igoodar" 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Installation directory not found!
    echo Expected: C:\Program Files\Igoodar
    echo.
    echo Searching for Igoodar installation...
    for /f "delims=" %%i in ('dir C:\ /s /b /ad ^| findstr /i "Igoodar" 2^>nul') do (
        echo Found: %%i
    )
    echo.
    pause
    exit /b 1
)
echo OK: %CD%
echo.

echo [2/10] Listing installation contents...
dir /b
echo.

echo [3/10] Checking Node.js portable...
if not exist "nodejs\node.exe" (
    echo ERROR: nodejs\node.exe not found!
    echo The nodejs folder is missing or incomplete
    goto error
)
echo OK: nodejs\node.exe exists
nodejs\node.exe --version
echo.

echo [4/10] Checking npm...
if not exist "nodejs\npm.cmd" (
    echo WARNING: npm.cmd not found
) else (
    echo OK: npm.cmd exists
)
echo.

echo [5/10] Checking node_modules folder...
if not exist "node_modules\" (
    echo ERROR: node_modules folder is MISSING!
    echo This is the main problem - dependencies not included
    echo.
    echo The installer was built without node_modules
    echo You need to rebuild the installer with:
    echo   1. npm run build:package
    echo   2. npm run build:installer
    echo.
    goto error
)
echo OK: node_modules folder exists
echo.
echo Checking node_modules size...
for /f "tokens=3" %%a in ('dir "node_modules" ^| find "File(s)"') do set filecount=%%a
for /f "tokens=3" %%a in ('dir "node_modules" ^| find "Dir(s)"') do set dircount=%%a
echo Files: %filecount%
echo Directories: %dircount%
echo.

echo [6/10] Checking critical dependencies...
set missing=0

if not exist "node_modules\express\" (
    echo ERROR: express missing
    set missing=1
)

if not exist "node_modules\better-sqlite3\" (
    echo ERROR: better-sqlite3 missing
    set missing=1
)

if not exist "node_modules\react\" (
    echo ERROR: react missing
    set missing=1
)

if %missing%==1 (
    echo.
    echo ERROR: Critical dependencies are missing!
    goto error
)
echo OK: express, better-sqlite3, react found
echo.

echo [7/10] Checking better-sqlite3 native module...
if not exist "node_modules\better-sqlite3\build\Release\better_sqlite3.node" (
    echo ERROR: better_sqlite3.node not found!
    echo Native module not pre-compiled
    echo.
    echo Path checked: node_modules\better-sqlite3\build\Release\better_sqlite3.node
    goto error
)
echo OK: better_sqlite3.node exists
dir "node_modules\better-sqlite3\build\Release\better_sqlite3.node"
echo.

echo [8/10] Checking application files...
if not exist "dist\public\index.html" (
    echo ERROR: Built frontend missing
    goto error
)
if not exist "server\index.ts" (
    echo ERROR: Server files missing
    goto error
)
if not exist "scripts\init-sqlite.js" (
    echo ERROR: Database init script missing
    goto error
)
echo OK: Application files present
echo.

echo [9/10] Testing database initialization...
set PATH=%CD%\nodejs;%PATH%
echo Running: node scripts\init-sqlite.js
echo.
node scripts\init-sqlite.js
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Database initialization failed!
    echo Exit code: %errorlevel%
    echo.
    echo Check the error messages above
    goto error
)
echo.
echo OK: Database initialized successfully
echo.

echo [10/10] Testing application startup...
echo.
echo Starting server on http://localhost:5003
echo Press Ctrl+C to stop the server
echo.
echo If browser doesn't open automatically, open:
echo   http://localhost:5003
echo.
echo Login with:
echo   Admin PIN: 1234
echo   Cashier PIN: 5678
echo.
timeout /t 3
start http://localhost:5003
node start.js
goto end

:error
echo.
echo ========================================
echo DIAGNOSTIC FAILED
echo ========================================
echo.
echo Common solutions:
echo 1. Rebuild installer with node_modules:
echo      npm run build:package
echo      npm run build:installer
echo.
echo 2. Run installer as Administrator
echo.
echo 3. Check antivirus isn't blocking files
echo.
echo 4. Install to a different location:
echo      C:\Igoodar instead of C:\Program Files\Igoodar
echo.
pause
exit /b 1

:end
echo.
echo ========================================
echo DIAGNOSTIC COMPLETE
echo ========================================
pause
