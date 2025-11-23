# 🔍 How to Debug Windows Installer

## Method 1: Enable NSIS Installer Logging (Recommended)

### **Step 1: Run installer with /D flag for custom install path**
```cmd
igoodar-setup-1.0.0.exe /D=C:\Igoodar-Test
```

### **Step 2: Check Windows Event Viewer**
1. Press `Win + R`
2. Type: `eventvwr.msc`
3. Press Enter
4. Navigate to: **Windows Logs → Application**
5. Look for errors from "MsiInstaller" or around the installation time

---

## Method 2: Run Installer from Command Prompt (Best for Debugging)

### **Step 1: Open Command Prompt as Administrator**
```cmd
Right-click Command Prompt → Run as Administrator
```

### **Step 2: Navigate to installer location**
```cmd
cd C:\path\to\installer
```

### **Step 3: Run installer and capture output**
```cmd
igoodar-setup-1.0.0.exe /S /D=C:\Igoodar-Test > install.log 2>&1
```

**Flags:**
- `/S` = Silent mode (optional, remove to see GUI)
- `/D=path` = Custom install directory
- `> install.log` = Redirect output to file
- `2>&1` = Capture errors too

### **Step 4: Check the log**
```cmd
type install.log
```

---

## Method 3: Manual Extraction and Testing

### **Step 1: Extract installer contents without running**
```cmd
# Use 7-Zip to extract the installer
"C:\Program Files\7-Zip\7z.exe" x igoodar-setup-1.0.0.exe -o"C:\Igoodar-Extracted"
```

### **Step 2: Navigate to extracted folder**
```cmd
cd C:\Igoodar-Extracted
```

### **Step 3: Manually run each step**

#### **A. Check Node.js**
```cmd
nodejs\node.exe --version
```
Expected: `v13.14.0`

#### **B. Check node_modules**
```cmd
dir node_modules
```
Expected: Should see many folders (express, react, better-sqlite3, etc.)

#### **C. Check better-sqlite3**
```cmd
dir node_modules\better-sqlite3\build\Release
```
Expected: Should see `better_sqlite3.node`

#### **D. Initialize database manually**
```cmd
set PATH=%CD%\nodejs;%PATH%
node scripts\init-sqlite.js
```
Expected: Should create `data\stocksage.db`

#### **E. Start application manually**
```cmd
node start.js
```
Expected: Should start server on port 5003

---

## Method 4: Check Installation Directory

### **After installation, check these locations:**

#### **A. Installation folder**
```cmd
cd "C:\Program Files\Igoodar"
dir
```

**Should contain:**
- `nodejs\` folder
- `node_modules\` folder (IMPORTANT!)
- `dist\` folder
- `server\` folder
- `scripts\` folder
- `start.bat`
- `start.js`

#### **B. Check node_modules size**
```cmd
dir "C:\Program Files\Igoodar\node_modules" /s
```

**Expected:** Should show thousands of files

#### **C. Check specific critical modules**
```cmd
dir "C:\Program Files\Igoodar\node_modules\better-sqlite3"
dir "C:\Program Files\Igoodar\node_modules\express"
dir "C:\Program Files\Igoodar\node_modules\react"
```

---

## Method 5: Enable Detailed NSIS Logging

### **Rebuild installer with logging enabled:**

Edit `scripts/build-windows-installer.js` and add this to the NSIS script:

```javascript
// Add after "!include MUI2.nsh"
!define MUI_FINISHPAGE_NOAUTOCLOSE
!define MUI_UNFINISHPAGE_NOAUTOCLOSE

; Enable detailed logging
LogSet on
LogText "Starting Igoodar installation..."
```

Then rebuild:
```bash
npm run build:installer
```

---

## Method 6: Check for Specific Errors

### **A. If you see "node_modules folder is missing"**

**Check:**
```cmd
cd "C:\Program Files\Igoodar"
dir node_modules
```

**If missing:**
- Installer was built from old package
- Rebuild with: `npm run build:package` then `npm run build:installer`

### **B. If you see "Node.js not found"**

**Check:**
```cmd
cd "C:\Program Files\Igoodar"
dir nodejs
nodejs\node.exe --version
```

**If missing:**
- Download Node.js portable: `./scripts/download-nodejs-portable.sh`
- Rebuild package and installer

### **C. If you see "Database initialization failed"**

**Check:**
```cmd
cd "C:\Program Files\Igoodar"
set PATH=%CD%\nodejs;%PATH%
node scripts\init-sqlite.js
```

**Look for errors like:**
- `SyntaxError: Unexpected token` → Node.js v13 compatibility issue
- `Cannot find module` → Missing dependencies
- `EACCES` → Permission issue

### **D. If you see "better-sqlite3" errors**

**Check:**
```cmd
cd "C:\Program Files\Igoodar"
dir node_modules\better-sqlite3\build\Release\better_sqlite3.node
```

**If missing:**
- Native module not pre-compiled
- Rebuild package on Windows or use pre-built binaries

---

## Method 7: Test Each Component Separately

### **Create a test script: `test-install.bat`**

```batch
@echo off
echo ========================================
echo Igoodar Installation Debug Test
echo ========================================
echo.

echo [1/6] Checking installation directory...
cd "C:\Program Files\Igoodar" 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Installation directory not found!
    pause
    exit /b 1
)
echo OK: Installation directory exists

echo.
echo [2/6] Checking Node.js...
if not exist "nodejs\node.exe" (
    echo ERROR: Node.js not found!
    pause
    exit /b 1
)
nodejs\node.exe --version
echo OK: Node.js found

echo.
echo [3/6] Checking node_modules...
if not exist "node_modules\" (
    echo ERROR: node_modules folder missing!
    pause
    exit /b 1
)
echo OK: node_modules exists

echo.
echo [4/6] Checking better-sqlite3...
if not exist "node_modules\better-sqlite3\build\Release\better_sqlite3.node" (
    echo ERROR: better-sqlite3 native module missing!
    pause
    exit /b 1
)
echo OK: better-sqlite3 found

echo.
echo [5/6] Testing database initialization...
set PATH=%CD%\nodejs;%PATH%
nodejs\node.exe scripts\init-sqlite.js
if %errorlevel% neq 0 (
    echo ERROR: Database initialization failed!
    pause
    exit /b 1
)
echo OK: Database initialized

echo.
echo [6/6] Testing application startup...
echo Starting server (press Ctrl+C to stop)...
nodejs\node.exe start.js
if %errorlevel% neq 0 (
    echo ERROR: Application failed to start!
    pause
    exit /b 1
)

echo.
echo ========================================
echo All tests passed!
echo ========================================
pause
```

**Save this as `test-install.bat` and run it after installation.**

---

## Method 8: Check Windows Logs

### **A. Application Event Log**
```cmd
eventvwr.msc
→ Windows Logs
→ Application
→ Filter by "Error" and "Warning"
→ Look around installation time
```

### **B. System Event Log**
```cmd
eventvwr.msc
→ Windows Logs
→ System
→ Filter by "Error"
→ Look for disk/permission issues
```

---

## Method 9: Run with Verbose Output

### **Create verbose installer script:**

Edit the NSIS script to show more details:

```nsis
; Add detailed output
DetailPrint "Extracting files to $INSTDIR..."
DetailPrint "Checking for nodejs folder..."
DetailPrint "Checking for node_modules folder..."
DetailPrint "Running database initialization..."
DetailPrint "Creating shortcuts..."
```

---

## Method 10: Common Error Messages and Solutions

### **Error: "node_modules folder is missing!"**
```
Cause: Package built without node_modules
Solution: 
  1. npm run build:package
  2. npm run build:installer
  3. Verify installer is 139 MB (not 47 MB)
```

### **Error: "SyntaxError: Unexpected token '.'"**
```
Cause: Optional chaining (?.) in code, Node v13 doesn't support it
Solution: 
  1. Check scripts/init-sqlite.js
  2. Replace result?.count with result && result.count
  3. Rebuild package and installer
```

### **Error: "Cannot find module 'better-sqlite3'"**
```
Cause: node_modules missing or incomplete
Solution:
  1. Verify node_modules folder exists
  2. Check node_modules\better-sqlite3 exists
  3. Rebuild package with: npm run build:package
```

### **Error: "The specified module could not be found"**
```
Cause: better-sqlite3.node not compatible with Windows version
Solution:
  1. Rebuild better-sqlite3 on target Windows version
  2. Or use pre-built binaries for Windows 7/10/11
```

### **Error: "EACCES: permission denied"**
```
Cause: Insufficient permissions
Solution:
  1. Run installer as Administrator
  2. Install to user folder instead of Program Files
  3. Check antivirus isn't blocking
```

---

## Method 11: Create Debug Version of Installer

### **Add pause commands to see each step:**

Edit `scripts/build-windows-installer.js`:

```javascript
const nsisScript = `
...
Section "Install"
  DetailPrint "Starting installation..."
  
  ; Extract files
  DetailPrint "Extracting files..."
  SetOutPath "$INSTDIR"
  File /r "\${extractedDir}\\*.*"
  DetailPrint "Files extracted"
  
  ; Verify node_modules
  DetailPrint "Verifying node_modules..."
  IfFileExists "$INSTDIR\\node_modules\\*.*" deps_ok deps_missing
  deps_missing:
    MessageBox MB_OK|MB_ICONEXCLAMATION "DEBUG: node_modules not found at: $INSTDIR\\node_modules"
    Abort
  deps_ok:
    MessageBox MB_OK "DEBUG: node_modules found!"
  
  ; Initialize database
  DetailPrint "Initializing database..."
  ExecWait '"$INSTDIR\\nodejs\\node.exe" "$INSTDIR\\scripts\\init-sqlite.js"' $0
  DetailPrint "Database init exit code: $0"
  IntCmp $0 0 db_ok db_error db_error
  db_error:
    MessageBox MB_OK|MB_ICONEXCLAMATION "DEBUG: Database init failed with code: $0"
    Abort
  db_ok:
    MessageBox MB_OK "DEBUG: Database initialized!"
  
  ; Continue with rest...
SectionEnd
`;
```

---

## Quick Debug Checklist

After installation fails, check:

- [ ] **Installation directory exists:** `C:\Program Files\Igoodar`
- [ ] **nodejs folder exists:** `C:\Program Files\Igoodar\nodejs`
- [ ] **node.exe works:** `C:\Program Files\Igoodar\nodejs\node.exe --version`
- [ ] **node_modules exists:** `C:\Program Files\Igoodar\node_modules`
- [ ] **node_modules has files:** Should have 1000+ folders
- [ ] **better-sqlite3 exists:** `node_modules\better-sqlite3\build\Release\better_sqlite3.node`
- [ ] **Database script works:** `node scripts\init-sqlite.js`
- [ ] **App starts:** `node start.js`
- [ ] **Browser opens:** `http://localhost:5003`

---

## Get Detailed Error Information

### **Run this in Command Prompt (as Administrator):**

```cmd
@echo off
echo Igoodar Installation Diagnostic
echo ================================
echo.

echo Checking installation...
cd "C:\Program Files\Igoodar" 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Not installed in C:\Program Files\Igoodar
    echo.
    echo Checking alternative locations...
    dir C:\ /s /b | findstr /i "igoodar"
    pause
    exit /b 1
)

echo Installation found at: %CD%
echo.

echo Listing contents...
dir /b
echo.

echo Checking Node.js...
if exist "nodejs\node.exe" (
    nodejs\node.exe --version
) else (
    echo ERROR: nodejs\node.exe not found!
)
echo.

echo Checking node_modules...
if exist "node_modules\" (
    echo node_modules folder exists
    dir node_modules | find "Dir(s)"
) else (
    echo ERROR: node_modules folder missing!
)
echo.

echo Checking better-sqlite3...
if exist "node_modules\better-sqlite3\" (
    echo better-sqlite3 found
    dir "node_modules\better-sqlite3\build\Release" 2>nul
) else (
    echo ERROR: better-sqlite3 missing!
)
echo.

echo Testing database initialization...
set PATH=%CD%\nodejs;%PATH%
echo Running: node scripts\init-sqlite.js
node scripts\init-sqlite.js
echo Exit code: %errorlevel%
echo.

echo Testing application startup...
echo Running: node start.js
echo (Press Ctrl+C to stop)
node start.js

pause
```

**Save as `debug-install.bat` and run after installation to see detailed diagnostics.**

---

## Summary

**Best methods for debugging:**

1. ✅ **Method 3** - Manual extraction and testing (most detailed)
2. ✅ **Method 7** - Test script (automated checks)
3. ✅ **Method 4** - Check installation directory (quick verification)
4. ✅ **Method 2** - Command prompt with logging (capture errors)

**Most common issues:**
- ❌ node_modules missing → Rebuild package with `npm run build:package`
- ❌ Node.js not found → Download portable Node.js
- ❌ Syntax errors → Check for Node v13 compatibility
- ❌ Permission errors → Run as Administrator

**Quick test:**
```cmd
cd "C:\Program Files\Igoodar"
dir node_modules
```

If `node_modules` is missing, the installer was built from the old package!
