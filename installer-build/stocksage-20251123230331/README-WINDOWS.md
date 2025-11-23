# Windows Installation Guide for igoodar

## 🚀 One-Command Installation

Extract the ZIP file and run:

```bash
npm start
```

That's it! The first time you run `npm start`, it will:
1. ✅ Automatically install all dependencies (built for Windows)
2. ✅ Initialize the database
3. ✅ Start the application

**No manual setup required!**

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
