# 🔧 Solution: Node Module Version Mismatch

## 🎯 Current Problem

**Error:**
```
NODE_MODULE_VERSION 115 vs NODE_MODULE_VERSION 93
The module was compiled against a different Node.js version
```

**What this means:**
- The installer includes **Node.js v16.20.2** (MODULE_VERSION 93)
- The `better-sqlite3.node` binary is for **Node.js v20** (MODULE_VERSION 93)
- They're incompatible!

---

## 📊 Node.js Module Version Matrix

| Node Version | MODULE_VERSION | Windows 7 | Status |
|--------------|----------------|-----------|--------|
| v13.14.0 | 79 | ✅ | Missing `??` and `?.` |
| v14.x | 83 | ✅ | Has `??` and `?.` but old |
| **v16.20.2** | **93** | **✅** | **Best for Windows 7** |
| v18.x | 108 | ❌ | Dropped Windows 7 support |
| v20.x | 115 | ❌ | Requires Windows 8.1+ |

**Node.js v16 is the last version supporting Windows 7 with modern JS features.**

---

## 🔄 Why the Problem Occurred

### **Build Process:**
1. ✅ Package includes Node.js v16.20.2 portable
2. ❌ `npm rebuild` on Mac downloaded **latest** better-sqlite3 prebuild
3. ❌ Latest prebuild is for Node v20+ (MODULE_VERSION 115)
4. ❌ Node v16 can't load MODULE_VERSION 115 binaries

### **Root Cause:**
- `better-sqlite3` may not publish prebuilt binaries for Node v16 anymore
- The package maintainers focus on current Node versions (v18, v20, v22)
- Node v16 reached End-of-Life in September 2023

---

## ✅ Solution Options

### **Option 1: Use Node.js v18 (Recommended if Windows 10/11 only)**

**Pros:**
- ✅ Current LTS version
- ✅ Has prebuilt binaries for better-sqlite3
- ✅ Modern features
- ✅ Long support until April 2025

**Cons:**
- ❌ **Doesn't support Windows 7**
- ❌ Requires Windows 8.1 or later

**Implementation:**
```bash
# Download Node.js v18
NODE_VERSION="18.20.5"
./scripts/download-nodejs-portable.sh

# Rebuild package and installer
npm run build:package
npm run build:installer
```

---

### **Option 2: Build better-sqlite3 on Windows (Current Approach)**

**Pros:**
- ✅ Keeps Windows 7 support
- ✅ Guaranteed compatibility with Node v16
- ✅ Most flexible

**Cons:**
- ❌ Requires Windows machine for building
- ❌ Needs Visual Studio Build Tools

**Implementation:**

#### **On Windows PC:**

1. **Install prerequisites:**
   ```cmd
   # Install Visual Studio Build Tools
   # Download from: https://visualstudio.microsoft.com/downloads/
   # Select "Desktop development with C++"
   ```

2. **Clone and build:**
   ```cmd
   git clone https://github.com/YOUR_REPO/StockSage
   cd StockSage
   npm install
   npm run build:package
   ```

3. **Copy package to Mac:**
   ```cmd
   # Copy: packages/stocksage-*.zip
   # To: Mac for installer build
   ```

#### **On Mac:**

4. **Build installer from Windows package:**
   ```bash
   # Extract Windows-built package
   unzip packages/stocksage-*.zip -d packages/stocksage-windows

   # Build installer
   npm run build:installer
   ```

---

### **Option 3: Use Older better-sqlite3 Version**

**Pros:**
- ✅ Keeps Windows 7 support
- ✅ May have Node v16 prebuilt binaries
- ✅ Can build on Mac

**Cons:**
- ❌ Older version may have bugs
- ❌ Missing newer features
- ❌ Security concerns

**Implementation:**

1. **Check which better-sqlite3 versions have Node v16 prebuilds:**
   ```bash
   # Visit: https://github.com/WiseLibs/better-sqlite3/releases
   # Look for versions from 2022-2023 (when Node v16 was current)
   ```

2. **Downgrade better-sqlite3:**
   ```bash
   npm install better-sqlite3@8.7.0  # Example version
   npm run build:package
   npm run build:installer
   ```

---

### **Option 4: Bundle Pre-Built Binary Manually (Quick Fix)**

**Pros:**
- ✅ Quick solution
- ✅ Can be done on Mac
- ✅ Keeps Windows 7 support

**Cons:**
- ❌ Manual process
- ❌ Need to find/download correct binary
- ❌ Harder to maintain

**Implementation:**

1. **Download Node v16 Windows binary:**
   ```bash
   # Visit: https://github.com/WiseLibs/better-sqlite3/releases
   # Find release with node-v93-win32-x64 prebuild
   # Download: better_sqlite3.node
   ```

2. **Replace in package:**
   ```bash
   # After running build:package
   cp better_sqlite3.node packages/stocksage-*/node_modules/better-sqlite3/build/Release/

   # Then build installer
   npm run build:installer
   ```

---

## 🎯 Recommended Solution

### **For Windows 7 Support: Build on Windows**

This is the most reliable approach:

**Step-by-step:**

1. **Set up Windows build environment:**
   ```cmd
   # Install Node.js v16.20.2
   # Install Git
   # Install Visual Studio Build Tools with C++
   ```

2. **Build on Windows:**
   ```cmd
   git clone YOUR_REPO
   cd StockSage
   npm install
   npm run build:package
   ```

3. **Transfer to Mac for installer creation:**
   ```bash
   # Copy packages/stocksage-*.zip to Mac
   # Run: npm run build:installer
   ```

### **For Windows 10/11 Only: Use Node.js v18**

If you don't need Windows 7 support:

```bash
# Update Node version
echo 'NODE_VERSION="18.20.5"' > scripts/download-nodejs-portable.sh

# Download Node v18
./scripts/download-nodejs-portable.sh

# Build with v18 prebuilds (will work automatically)
npm run build:package
npm run build:installer
```

---

## 🔍 Verification

After building, verify the binary compatibility:

### **Check Node version in package:**
```bash
./installer-build/stocksage-*/nodejs/node.exe --version
# Should match your target (v16.20.2 or v18.20.5)
```

### **Check binary exists:**
```bash
ls -lh installer-build/stocksage-*/node_modules/better-sqlite3/build/Release/
# Should show: better_sqlite3.node
```

### **Test on Windows:**
```cmd
cd "C:\Program Files\Igoodar"
nodejs\node.exe --version
# Should match installer Node version

debug-install.bat
# Test [9/10] should pass
```

---

## 📋 Module Version Reference

| MODULE_VERSION | Node Version | Release Date | Windows 7 |
|----------------|--------------|--------------|-----------|
| 79 | 13.x | 2019-2020 | ✅ |
| 83 | 14.x | 2020-2023 | ✅ |
| **93** | **16.x** | **2021-2023** | **✅** |
| 108 | 18.x | 2022-2025 | ❌ |
| 115 | 20.x | 2023-2026 | ❌ |
| 120 | 21.x | 2023-2024 | ❌ |
| 127 | 22.x | 2024-2027 | ❌ |

---

## 🚀 Next Steps

### **Immediate (Windows 10/11 only):**
```bash
# Switch to Node.js v18
# Update download script
# Rebuild package
# Test
```

### **For Windows 7 support:**
```bash
# Set up Windows build environment
# Build on Windows
# Transfer package to Mac
# Build installer on Mac
# Test on Windows 7, 10, and 11
```

---

## 📝 Summary

**Problem:** better-sqlite3 binary compiled for wrong Node version  
**Cause:** Prebuilt binaries for Node v16 may not be available  
**Solution 1:** Build on Windows (best for Windows 7 support)  
**Solution 2:** Use Node v18 (best for Windows 10/11 only)  
**Solution 3:** Manually bundle compatible binary  
**Status:** Awaiting decision on Windows 7 support requirement

---

## ⚠️ Decision Needed

**Question: Do you need Windows 7 support?**

- **YES** → Build on Windows machine
- **NO** → Switch to Node.js v18 (simpler, better supported)

Please let me know your requirement!
