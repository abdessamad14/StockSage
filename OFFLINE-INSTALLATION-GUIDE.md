# 📦 Igoodar Offline Installation Guide

## ✅ Complete Offline Installation - Works on Windows 7, 10, 11

This package is designed for **100% offline installation** with **NO internet required**.

---

## 🎯 What's Included

Your package contains **EVERYTHING needed**:

- ✅ **Node.js v13 Portable** (~52 MB) - No installation required
- ✅ **All Dependencies Pre-installed** (node_modules) - No npm install needed
- ✅ **Application Files** - Ready to run
- ✅ **Database** - SQLite (created automatically)
- ✅ **No Python Required** - All native modules pre-compiled

**Total Package Size:** ~200-300 MB  
**Internet Required:** ❌ NO

---

## 🚀 Installation Methods

### **Method 1: EXE Installer (Recommended)**

```
1. Copy igoodar-setup-1.0.0.exe to customer PC (via USB/network)
2. Double-click the .exe file
3. Click "Next" → "Next" → "Install"
4. Wait 2-3 minutes
5. Done! App starts automatically
```

**What it does:**
- ✅ Installs to `C:\Program Files\Igoodar`
- ✅ Creates desktop shortcut (opens browser)
- ✅ Sets up auto-start on Windows boot
- ✅ Initializes database
- ✅ Opens browser automatically
- ✅ Creates uninstaller

---

### **Method 2: ZIP Package**

```
1. Copy stocksage-YYYYMMDDHHMMSS.zip to customer PC
2. Extract with 7-Zip (recommended) or Windows extractor
3. Right-click start.bat → Run as Administrator
4. Wait 2-3 minutes
5. Done! Browser opens automatically
```

**Important for Windows 7:**
- Use **7-Zip** to extract (Windows 7 built-in extractor may fail with large files)
- Download 7-Zip: https://www.7-zip.org/

---

## 📋 What Happens During Installation

### **Automatic Steps:**

1. ✅ **Checks for Node.js** - Uses included portable version
2. ✅ **Verifies Dependencies** - All pre-installed, no download
3. ✅ **Creates Database** - SQLite with default users
4. ✅ **Sets Up Auto-Start** - Runs on Windows boot
5. ✅ **Creates Desktop Shortcut** - Opens browser to app
6. ✅ **Starts Application** - Runs in background
7. ✅ **Opens Browser** - http://localhost:5003

**Time:** 2-3 minutes  
**User Interaction:** Minimal (just click Next/OK)

---

## 🔧 Technical Details

### **System Requirements:**

| Requirement | Details |
|------------|---------|
| **OS** | Windows 7, 8.1, 10, 11 (32-bit or 64-bit) |
| **RAM** | 2 GB minimum, 4 GB recommended |
| **Disk Space** | 500 MB free space |
| **Internet** | ❌ NOT required |
| **Admin Rights** | ✅ Required for installation |

### **What's Pre-Installed:**

```
📦 Package Contents:
├── nodejs/              (Node.js v13 portable - 52 MB)
├── node_modules/        (All dependencies pre-installed - 150 MB)
├── dist/                (Built application)
├── server/              (Backend code)
├── scripts/             (Setup scripts)
├── start.bat            (Installation script)
├── start.js             (Application starter)
└── package.json         (Configuration)
```

### **No Internet = No Problem:**

- ❌ No npm install (dependencies included)
- ❌ No package downloads
- ❌ No Python required (native modules pre-compiled)
- ❌ No build process (app pre-built)
- ✅ Everything works offline!

---

## 🎯 Default Users

After installation, log in with:

| User | PIN | Role |
|------|-----|------|
| **Admin** | 1234 | Administrator |
| **Cashier** | 5678 | Cashier |

---

## 🗑️ Uninstallation

### **If Installed via EXE:**
```
Control Panel → Programs → Uninstall Igoodar
```

### **If Installed via ZIP:**
```
1. Run uninstall.bat as Administrator
2. Or manually:
   - Stop app: taskkill /IM node.exe /F
   - Delete folder
   - Remove shortcuts
```

---

## 🐛 Troubleshooting

### **Problem: "Node.js Not Found"**

**Cause:** Incomplete ZIP extraction (Windows 7 issue)

**Solution:**
1. Use 7-Zip instead of Windows extractor
2. Extract to simple path (e.g., `C:\Igoodar`)
3. Verify `nodejs` folder exists with `node.exe` inside

---

### **Problem: "node_modules folder missing"**

**Cause:** Incomplete package or extraction

**Solution:**
1. Re-extract the complete ZIP file
2. Verify `node_modules` folder exists (should be ~150 MB)
3. Use 7-Zip for extraction

---

### **Problem: Browser shows "Page Not Found"**

**Cause:** Server didn't start properly

**Solution:**
```cmd
1. Open Command Prompt as Administrator
2. cd C:\path\to\igoodar
3. set PATH=%CD%\nodejs;%PATH%
4. node start.js
```

Look for errors in output.

---

### **Problem: "better-sqlite3" or Python errors**

**Cause:** This should NOT happen (native modules pre-compiled)

**Solution:**
- Package was built incorrectly
- Rebuild package on development machine:
  ```bash
  npm install
  npm run build:package
  ```

---

## 📊 Comparison: Online vs Offline

| Feature | Online Install | Offline Install |
|---------|---------------|-----------------|
| **Internet Required** | ✅ Yes | ❌ No |
| **Installation Time** | 10-15 min | 2-3 min |
| **Package Size** | 5 MB | 250 MB |
| **Dependencies** | Downloaded | Pre-included |
| **Reliability** | Network dependent | Always works |
| **Windows 7** | May fail | ✅ Works |

---

## 🎁 Building the Package

### **For Developers:**

```bash
# 1. Download Node.js portable
./scripts/download-nodejs-portable.sh

# 2. Install dependencies
npm install

# 3. Build application
npm run build

# 4. Create package (includes node_modules)
npm run build:package

# 5. Create EXE installer (optional)
npm run build:installer
```

**Output:**
- `packages/stocksage-YYYYMMDDHHMMSS.zip` (~250 MB)
- `installer-build/output/igoodar-setup-1.0.0.exe` (~45 MB compressed)

---

## ✅ Verification Checklist

Before distributing to customers, verify:

- [ ] Package includes `nodejs` folder with `node.exe`
- [ ] Package includes `node_modules` folder (~150 MB)
- [ ] Package includes `dist` folder with built app
- [ ] ZIP file is complete (not corrupted)
- [ ] Tested on clean Windows machine (no Node.js installed)
- [ ] Tested offline (disconnect internet during install)
- [ ] Desktop shortcut created and works
- [ ] Auto-start configured
- [ ] Browser opens to http://localhost:5003
- [ ] Can log in with default users (Admin: 1234, Cashier: 5678)

---

## 🎯 Customer Instructions (Simple)

### **For Non-Technical Users:**

```
1. Copy the file to your computer (from USB or network)

2. If it's a .exe file:
   - Double-click it
   - Click "Next" a few times
   - Wait 2-3 minutes
   - Done!

3. If it's a .zip file:
   - Right-click → Extract All
   - Open the extracted folder
   - Right-click start.bat → Run as Administrator
   - Wait 2-3 minutes
   - Done!

4. Use the desktop shortcut to open Igoodar
   - Default PIN: 1234 (Admin) or 5678 (Cashier)
```

---

## 📞 Support

### **Common Questions:**

**Q: Do I need internet?**  
A: No! Everything is included.

**Q: Do I need to install Node.js?**  
A: No! It's included in the package.

**Q: Will it work on Windows 7?**  
A: Yes! Tested on Windows 7, 10, and 11.

**Q: How much space does it need?**  
A: About 500 MB free space.

**Q: Can I install on multiple PCs?**  
A: Yes! Copy the package to each PC.

**Q: Does it auto-start when Windows starts?**  
A: Yes! Configured automatically during installation.

---

## 🎉 Success!

Your Igoodar installation is complete and ready to use!

- 🖥️ **Access:** http://localhost:5003
- 👤 **Login:** Admin (PIN: 1234) or Cashier (PIN: 5678)
- 📱 **Desktop Shortcut:** Double-click to open
- 🔄 **Auto-Start:** Runs automatically on Windows boot
- 🗑️ **Uninstall:** Control Panel → Programs → Uninstall

**No internet, no problems!** 🎯
