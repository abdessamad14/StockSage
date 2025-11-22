# 🎁 Windows Installer (.exe) for Igoodar

Create a professional Windows installer that customers can use with **Next, Next, Finish**.

---

## 🎯 What the Installer Does:

### **Customer Experience:**
```
1. Double-click igoodar-setup-1.0.0.exe
2. Click "Next" → "Next" → "Install"
3. Wait 2-3 minutes
4. Click "Finish"
5. Done! App starts automatically
```

### **What Happens Automatically:**
- ✅ Installs to `C:\Program Files\Igoodar`
- ✅ Installs Node.js portable (no system installation)
- ✅ Installs all dependencies
- ✅ Creates database
- ✅ Creates desktop shortcut
- ✅ Adds to Start Menu
- ✅ Sets up auto-start on Windows boot
- ✅ Starts the app immediately
- ✅ Creates uninstaller

---

## 🛠️ How to Build the Installer:

### **Requirements:**
- Windows PC (7, 8.1, 10, or 11)
- [Inno Setup](https://jrsoftware.org/isdl.php) (free)

### **Steps:**

#### **1. Prepare Package (on Mac/Linux):**
```bash
# Download Node.js portable
./scripts/download-nodejs-portable.sh

# Build package
npm run build:package
```

#### **2. Transfer to Windows PC:**
Copy the entire project folder to Windows

#### **3. Install Inno Setup:**
Download from: https://jrsoftware.org/isdl.php

#### **4. Build Installer:**
```
Option A: GUI
1. Right-click installer.iss
2. Select "Compile"
3. Wait 2-3 minutes
4. Find: packages\igoodar-setup-1.0.0.exe

Option B: Command Line
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" installer.iss
```

---

## 📦 Installer Features:

### **Installation Wizard:**
- ✅ Welcome screen
- ✅ License agreement (optional)
- ✅ Choose installation folder
- ✅ Select components
- ✅ Create shortcuts (desktop, start menu)
- ✅ Auto-start option
- ✅ Progress bar
- ✅ Finish screen

### **Post-Installation:**
- ✅ App starts automatically
- ✅ Browser opens to http://localhost:5003
- ✅ Desktop shortcut created
- ✅ Start Menu entry created
- ✅ Auto-start configured

### **Uninstallation:**
- ✅ Standard Windows uninstaller
- ✅ Removes all files
- ✅ Removes shortcuts
- ✅ Removes auto-start
- ✅ Stops running processes

---

## 🎨 Customization:

Edit `installer.iss` to customize:

```ini
; Company information
#define MyAppPublisher "Your Company Name"
#define MyAppURL "https://www.yourcompany.com"

; Version
#define MyAppVersion "1.0.0"

; Icon
SetupIconFile=your-icon.ico

; License file (optional)
LicenseFile=LICENSE.txt
```

---

## 📊 Installer Size:

```
Total: ~75 MB
├── Node.js portable: ~52 MB
├── Application: ~20 MB
├── Installer overhead: ~3 MB
```

---

## 🌍 Multi-Language Support:

The installer supports multiple languages:
- ✅ English
- ✅ French
- ✅ German (add to installer.iss)
- ✅ Spanish (add to installer.iss)

---

## 🔧 Troubleshooting:

### **"Inno Setup not found"**
Download from: https://jrsoftware.org/isdl.php

### **"Source files not found"**
Make sure you ran `npm run build:package` first

### **"Compilation failed"**
Check that `packages/stocksage-*/` folder exists

---

## ✅ Benefits:

### **For Customers:**
- ✅ **Simple**: Just double-click and install
- ✅ **Professional**: Standard Windows installer
- ✅ **Fast**: 2-3 minutes total
- ✅ **Familiar**: Next, Next, Finish workflow
- ✅ **Clean**: Proper uninstaller included

### **For You:**
- ✅ **Professional**: Looks like commercial software
- ✅ **Reliable**: Industry-standard tool (Inno Setup)
- ✅ **Flexible**: Easy to customize
- ✅ **Free**: No licensing costs

---

## 📋 Comparison:

| Method | Customer Steps | Time | Professional |
|--------|---------------|------|--------------|
| **ZIP File** | Extract, Run start.bat, Wait | 5-10 min | ❌ No |
| **EXE Installer** | Double-click, Next, Next | 2-3 min | ✅ Yes |

---

## 🚀 Next Steps:

1. Build the package on Mac/Linux
2. Transfer to Windows PC
3. Install Inno Setup
4. Compile installer.iss
5. Distribute `igoodar-setup-1.0.0.exe` to customers

**That's it!** Your customers get a professional installation experience! 🎉
