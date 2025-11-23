# 🔍 Quick Debug Guide for Installer Issues

## ⚡ Fastest Way to Debug

### **Option 1: Use the Debug Script (Recommended)**

After installation fails:

1. **Navigate to installation folder:**
   ```cmd
   cd "C:\Program Files\Igoodar"
   ```

2. **Run debug script:**
   ```cmd
   debug-install.bat
   ```

3. **Read the output** - it will tell you exactly what's wrong!

---

### **Option 2: Quick Manual Check**

```cmd
cd "C:\Program Files\Igoodar"
dir node_modules
```

**If you see:**
- ✅ **Lots of folders** → Good! Dependencies are there
- ❌ **"File Not Found"** → Problem! node_modules missing

---

## 🎯 Most Common Issues

### **Issue 1: "node_modules folder is missing!"**

**What it means:**
The installer was built from an old package without dependencies.

**How to fix:**
```bash
# On your Mac:
npm run build:package    # Rebuild package WITH node_modules
npm run build:installer  # Rebuild installer from new package

# Verify:
ls -lh installer-build/output/igoodar-setup-1.0.0.exe
# Should be ~139 MB (not 47 MB)
```

**How to verify on Windows:**
```cmd
cd "C:\Program Files\Igoodar"
dir node_modules
# Should show many folders
```

---

### **Issue 2: "SyntaxError: Unexpected token"**

**What it means:**
Code uses features not supported by Node.js v13.

**How to fix:**
Check for optional chaining (`?.`) in code:
```javascript
// BAD (Node v13 doesn't support this):
if (result?.count > 0) {

// GOOD (Node v13 compatible):
if (result && result.count > 0) {
```

**Files to check:**
- `scripts/init-sqlite.js`
- `server/*.js`
- `start.js`

---

### **Issue 3: "Cannot find module 'better-sqlite3'"**

**What it means:**
Native module missing or not pre-compiled.

**How to check:**
```cmd
cd "C:\Program Files\Igoodar"
dir node_modules\better-sqlite3\build\Release\better_sqlite3.node
```

**How to fix:**
Rebuild package on Windows or ensure pre-built binaries are included.

---

## 📋 Debug Checklist

Run through this checklist:

```cmd
cd "C:\Program Files\Igoodar"

REM 1. Check installation exists
dir
# Should see: nodejs, node_modules, dist, server, scripts

REM 2. Check Node.js
nodejs\node.exe --version
# Should show: v13.14.0

REM 3. Check node_modules
dir node_modules
# Should show: MANY folders (express, react, better-sqlite3, etc.)

REM 4. Check better-sqlite3
dir node_modules\better-sqlite3\build\Release
# Should see: better_sqlite3.node

REM 5. Test database init
set PATH=%CD%\nodejs;%PATH%
node scripts\init-sqlite.js
# Should create: data\stocksage.db

REM 6. Test app start
node start.js
# Should start server on port 5003
```

---

## 🚀 Quick Fixes

### **Fix 1: Rebuild Installer (Most Common)**

```bash
# On Mac:
npm run build:package
npm run build:installer

# Check size:
ls -lh installer-build/output/igoodar-setup-1.0.0.exe
# Should be ~139 MB
```

### **Fix 2: Manual Installation**

If installer keeps failing:

1. **Extract package manually:**
   ```cmd
   # Use 7-Zip
   "C:\Program Files\7-Zip\7z.exe" x igoodar-setup-1.0.0.exe -o"C:\Igoodar"
   ```

2. **Run setup manually:**
   ```cmd
   cd C:\Igoodar
   set PATH=%CD%\nodejs;%PATH%
   node scripts\init-sqlite.js
   node start.js
   ```

### **Fix 3: Install to Different Location**

Sometimes `C:\Program Files` has permission issues:

```cmd
# Install to user folder instead:
igoodar-setup-1.0.0.exe /D=C:\Users\YourName\Igoodar
```

---

## 📊 Installer Size Reference

| Size | Contains | Works Offline |
|------|----------|---------------|
| 47 MB | ❌ No node_modules | ❌ No |
| 139 MB | ✅ With node_modules | ✅ Yes |

**If your installer is 47 MB, rebuild it!**

---

## 🔧 Advanced Debugging

### **See detailed errors:**

```cmd
# Run installer from command prompt:
igoodar-setup-1.0.0.exe /D=C:\Igoodar-Test > install.log 2>&1

# Check log:
type install.log
```

### **Check Windows Event Viewer:**

```cmd
eventvwr.msc
→ Windows Logs
→ Application
→ Look for errors around installation time
```

### **Manual extraction:**

```cmd
# Extract without installing:
7z x igoodar-setup-1.0.0.exe -o"C:\Igoodar-Extracted"

# Check contents:
cd C:\Igoodar-Extracted
dir
```

---

## 📞 Support Information

**If debug-install.bat shows errors:**

1. **Copy the error message**
2. **Check which test failed** (1/10 through 10/10)
3. **Follow the suggested fix**

**Common error patterns:**

| Error | Test Failed | Fix |
|-------|-------------|-----|
| "node_modules folder is missing" | Test 5/10 | Rebuild installer |
| "nodejs\node.exe not found" | Test 3/10 | Download Node.js portable |
| "better_sqlite3.node not found" | Test 7/10 | Rebuild with pre-compiled binaries |
| "Database initialization failed" | Test 9/10 | Check for syntax errors |

---

## ✅ Verification

**After fixing, verify:**

```cmd
cd "C:\Program Files\Igoodar"
debug-install.bat
```

**Should see:**
```
[1/10] Checking installation directory... OK
[2/10] Listing installation contents... OK
[3/10] Checking Node.js portable... OK
[4/10] Checking npm... OK
[5/10] Checking node_modules folder... OK
[6/10] Checking critical dependencies... OK
[7/10] Checking better-sqlite3 native module... OK
[8/10] Checking application files... OK
[9/10] Testing database initialization... OK
[10/10] Testing application startup... OK
```

---

## 🎯 Summary

**Quick debug:**
1. Run `debug-install.bat`
2. Read which test failed
3. Follow the fix

**Most common fix:**
```bash
npm run build:package
npm run build:installer
```

**Verify installer size:**
- ❌ 47 MB = Missing node_modules
- ✅ 139 MB = Complete package

**Need more help?**
See `DEBUG-INSTALLER.md` for detailed debugging methods.
