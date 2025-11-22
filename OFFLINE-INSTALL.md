# 📦 Offline Installation Package

This guide explains how to create and use an **offline installation package** that includes Node.js portable.

---

## 🎯 For Developers: Creating Offline Package

### **Step 1: Download Node.js Portable**
```bash
./scripts/download-nodejs-portable.sh
```

This will:
- Download Node.js v20.11.0 portable (Windows x64)
- Extract to `./nodejs/` folder
- Ready to be included in package

### **Step 2: Build Package**
```bash
npm run build:package
```

The package will automatically include:
- ✅ Node.js portable (if `nodejs/` folder exists)
- ✅ All application files
- ✅ Pre-built frontend
- ✅ Database scripts

### **Output:**
```
packages/stocksage-YYYYMMDDHHMMSS.zip
```

---

## 🚀 For Customers: Installing Offline Package

### **Requirements:**
- ✅ Windows 7, 8.1, 10, or 11
- ✅ Administrator rights
- ✅ **NO internet required** (if package includes Node.js portable)

### **Installation Steps:**

#### **Step 1: Extract Package**
```
1. Extract stocksage-YYYYMMDDHHMMSS.zip to any folder
   Example: C:\igoodar\
```

#### **Step 2: Run Installer**
```
1. Right-click start.bat
2. Select "Run as Administrator"
3. Wait 2-3 minutes for setup
4. See "Igoodar Started Successfully!"
```

#### **Step 3: Access Application**
```
Open browser: http://localhost:5003
```

---

## 🔍 How It Works

### **With Node.js Portable (Offline):**
```
Package includes:
├── nodejs/           ← Node.js portable (no installation needed)
├── start.bat         ← Detects and uses portable Node.js
├── server/
├── dist/
└── ...

Installation:
1. Extract → 2. Run start.bat → 3. Done!
```

### **Without Node.js Portable (Requires System Node.js):**
```
Package includes:
├── start.bat         ← Requires Node.js installed on system
├── server/
├── dist/
└── ...

Installation:
1. Install Node.js from https://nodejs.org/
2. Extract package
3. Run start.bat
```

---

## 📋 Package Sizes

| Package Type | Size | Internet Required |
|-------------|------|-------------------|
| **With Node.js Portable** | ~80 MB | ❌ No |
| **Without Node.js Portable** | ~5 MB | ✅ Yes (or system Node.js) |

---

## 🛠️ Troubleshooting

### **"Node.js Not Found" Error**

**If package includes `nodejs/` folder:**
- Make sure you extracted the complete package
- Check that `nodejs/node.exe` exists

**If package doesn't include `nodejs/` folder:**
- Install Node.js from: https://nodejs.org/
- Restart computer
- Run start.bat again

### **Uninstall**
```
1. Right-click uninstall.bat → Run as Administrator
2. Delete the installation folder
```

---

## ✅ Benefits of Offline Package

✅ **No internet required** - works in air-gapped environments  
✅ **No Node.js installation** - portable version included  
✅ **Simple deployment** - just extract and run  
✅ **Consistent environment** - same Node.js version everywhere  
✅ **Fast installation** - no downloads during setup  

---

## 📞 Support

For issues or questions, contact your vendor.
