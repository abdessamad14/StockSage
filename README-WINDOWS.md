# Windows Installation Guide for igoodar

## ⚠️ Important: Windows-Specific Setup

If you see this error on Windows:
```
Error: better_sqlite3.node is not a valid Win32 application
```

This happens because the native module was built on macOS/Linux and needs to be rebuilt for Windows.

## 🔧 Quick Fix

### Option 1: Use the Fix Script (Easiest)

```bash
fix-windows.bat
```

This will automatically rebuild the native modules for Windows.

### Option 2: Manual Fix

```bash
# Remove the old build
rmdir /s /q node_modules\better-sqlite3

# Rebuild for Windows
npm install better-sqlite3 --build-from-source

# Start the app
npm start
```

### Option 3: Full Reinstall

```bash
# Remove all node_modules
rmdir /s /q node_modules

# Clean npm cache
npm cache clean --force

# Reinstall everything
npm install

# Start the app
npm start
```

## 📋 Prerequisites

Before running the fix, make sure you have:

1. ✅ **Node.js** (v18 or v20) - [Download](https://nodejs.org/)
2. ✅ **Python** (for node-gyp) - [Download](https://www.python.org/downloads/)
3. ✅ **Visual Studio Build Tools** or **windows-build-tools**

### Installing Build Tools

If you don't have build tools, run this as **Administrator**:

```bash
npm install --global windows-build-tools
```

Or download Visual Studio Build Tools:
https://visualstudio.microsoft.com/downloads/

## 🚀 After Fix

Once the native modules are rebuilt, start the application:

```bash
npm start
```

Or double-click:
```
start.bat
```

The application will be available at:
- **Local**: http://localhost:5003
- **Network**: http://YOUR_IP:5003

## 📝 Default Credentials

- **Admin**: Username: `admin`, Password: `admin123`, PIN: `1234`
- **Cashier**: Username: `cashier`, Password: `cashier123`, PIN: `5678`

## 🆘 Still Having Issues?

If you still get errors after rebuilding:

1. Make sure you have the latest Node.js LTS version
2. Try running Command Prompt as Administrator
3. Check that Python is in your PATH
4. Verify Visual Studio Build Tools are installed

## 📦 Test Data

To populate the database with sample data:

```bash
npm run seed:comprehensive
```

This will add:
- 20 products with images
- 8 categories with images
- 7 customers (some with credit)
- 4 suppliers
- 25 sales transactions

## 🌐 Language Support

The application supports:
- French (Français)
- Arabic (العربية)

Switch languages from the navigation menu.

## 💰 Currency

All prices are displayed in **MAD** (Moroccan Dirham / DH).
