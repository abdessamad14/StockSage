# 🔄 Igoodar Update Guide

## 🎯 How Updates Work

Updates preserve all customer data:
- ✅ Database (all products, sales, customers)
- ✅ License key
- ✅ User accounts
- ✅ Settings

Only app code is updated (new features, bug fixes).

---

## 📋 Update Process Overview

```
1. You: Build new version
2. Customer: Stop service
3. Customer: Run update.bat
4. Customer: Extract new ZIP
5. Customer: Run start.bat
6. ✅ Updated! Data preserved
```

---

## 🛠️ Detailed Steps

### **For You (Developer):**

#### **1. Prepare New Version**

```bash
cd /Users/abdessamadabba/repos/StockSage

# Update version in package.json
# Example: "version": "1.1.0"

# Build new package
npm run build:package
```

**Output:** `packages/stocksage-v1.1.0-YYYYMMDD.zip`

#### **2. Create Release Notes**

Create a file: `CHANGELOG.txt`

```
Igoodar v1.1.0 - November 19, 2025

New Features:
✓ Added inventory alerts
✓ Improved reporting
✓ New dashboard widgets

Bug Fixes:
✓ Fixed barcode scanner issue
✓ Improved performance

Update Instructions:
See UPDATE-GUIDE.md
```

#### **3. Send to Customer**

```
Email/USB/Cloud:
- stocksage-v1.1.0-YYYYMMDD.zip
- CHANGELOG.txt
- UPDATE-GUIDE.md (this file)
```

---

### **For Customer:**

#### **Method 1: Automatic Update (Recommended)**

**Step 1: Prepare**
```cmd
1. Right-click update.bat
2. Select "Run as Administrator"
3. Follow prompts
```

**What it does:**
- Stops Igoodar service
- Creates backup of data folder
- Removes old app files
- Keeps data folder safe

**Step 2: Install New Version**
```cmd
1. Extract new ZIP to C:\Igoodar\
2. When asked "Replace files?" → Click YES
3. Data folder is automatically preserved
```

**Step 3: Restart**
```cmd
1. Right-click start.bat
2. Select "Run as Administrator"
3. Wait for service to start
4. ✅ Done!
```

---

#### **Method 2: Manual Update**

**Step 1: Stop Service**
```cmd
sc stop Igoodar
```

**Step 2: Backup Data (Optional)**
```cmd
xcopy C:\Igoodar\data C:\Igoodar_Backup\data /E /I
```

**Step 3: Remove Old Files**
```cmd
cd C:\Igoodar
rd /s /q dist
rd /s /q server
rd /s /q node_modules
```

**DO NOT DELETE:**
- ❌ data folder
- ❌ license.key

**Step 4: Extract New Version**
```cmd
1. Extract new ZIP to C:\Igoodar\
2. Replace all files except data folder
```

**Step 5: Reinstall Service**
```cmd
1. Right-click start.bat
2. Select "Run as Administrator"
3. Service reinstalls automatically
```

**Step 6: Verify**
```cmd
1. Open browser: http://localhost:5003
2. Login with PIN
3. Check that all data is still there
4. ✅ Update complete!
```

---

## 🗂️ What Gets Updated vs Preserved

### **Updated (Replaced):**
- ✅ `dist/` - Frontend code
- ✅ `server/` - Backend code
- ✅ `client/` - Source files
- ✅ `node_modules/` - Dependencies
- ✅ `start.bat` - Installer
- ✅ `package.json` - Configuration

### **Preserved (Never Touched):**
- ✅ `data/stocksage.db` - Database
- ✅ `data/license.key` - License
- ✅ All customer data
- ✅ All settings

---

## 🔍 Verification Checklist

After update, verify:

- [ ] Service is running: `sc query Igoodar`
- [ ] App accessible: http://localhost:5003
- [ ] Can login with PIN
- [ ] All products visible
- [ ] All customers visible
- [ ] Sales history intact
- [ ] License still active
- [ ] New features working

---

## 🆘 Troubleshooting

### **Problem: "Data is missing after update"**

**Cause:** Data folder was deleted

**Solution:**
1. Restore from backup: `C:\Igoodar_Backup\data`
2. Copy to: `C:\Igoodar\data`
3. Restart service: `sc start Igoodar`

---

### **Problem: "Service won't start"**

**Solution:**
```cmd
1. Uninstall old service:
   sc delete Igoodar

2. Reinstall:
   Right-click start.bat → Run as Administrator
```

---

### **Problem: "License not found"**

**Cause:** License file was deleted

**Solution:**
1. Check if `data/license.key` exists
2. If not, restore from backup
3. Or re-activate with original license key

---

## 📊 Database Migrations

### **If Database Schema Changes:**

Your app uses SQLite with automatic migrations.

**What happens:**
1. New version detects old database
2. Runs migrations automatically
3. Preserves all data
4. Updates schema

**Example migration:**
```javascript
// server/db.ts handles this automatically
// No customer action needed
```

**Customer sees:**
- No interruption
- All data preserved
- New features available

---

## 🔄 Rollback (If Needed)

### **If update fails:**

**Step 1: Stop Service**
```cmd
sc stop Igoodar
sc delete Igoodar
```

**Step 2: Restore Backup**
```cmd
1. Delete C:\Igoodar folder
2. Extract old version ZIP
3. Copy backup data:
   xcopy C:\Igoodar_Backup\data C:\Igoodar\data /E /I
```

**Step 3: Reinstall**
```cmd
Right-click start.bat → Run as Administrator
```

---

## 💡 Best Practices

### **For You (Developer):**

1. **Version numbering:**
   - Major.Minor.Patch (e.g., 1.2.3)
   - Update in `package.json`

2. **Test updates:**
   - Test on clean Windows VM
   - Test on existing installation
   - Verify data preservation

3. **Communicate:**
   - Send changelog
   - Explain new features
   - Provide support

### **For Customer:**

1. **Before updating:**
   - Backup data folder
   - Note current version
   - Read changelog

2. **During update:**
   - Follow instructions exactly
   - Don't skip steps
   - Keep data folder

3. **After update:**
   - Verify data intact
   - Test new features
   - Report issues

---

## 📝 Update Frequency

**Recommended:**
- **Bug fixes:** As needed
- **Minor features:** Monthly
- **Major features:** Quarterly

**Notify customers:**
- Email with changelog
- Include update package
- Provide support

---

## ✅ Summary

**Update process:**
1. Stop service
2. Backup data (optional)
3. Remove old files (NOT data)
4. Extract new version
5. Run start.bat
6. ✅ Done!

**Data is always safe:**
- Stored in `data/` folder
- Never deleted during updates
- Automatically backed up by update.bat
- Can be manually backed up anytime

**Your customers can update confidently!** 🎉
