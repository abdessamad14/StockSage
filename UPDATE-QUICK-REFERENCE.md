# 🔄 Update Quick Reference

## 📦 For You (Developer)

### **Build New Version:**
```bash
# 1. Update version in package.json
# 2. Build package
npm run build:package

# Output: packages/stocksage-v1.1.0-YYYYMMDD.zip
```

### **Send to Customer:**
- ZIP file
- CHANGELOG.txt (what's new)
- UPDATE-GUIDE.md (instructions)

---

## 👥 For Customer

### **Quick Update (3 Steps):**

```cmd
1. Run update.bat as Administrator
   (Stops service, backs up data, cleans old files)

2. Extract new ZIP to C:\Igoodar\
   (Click "Yes" to replace files)

3. Run start.bat as Administrator
   (Reinstalls service with new version)
```

**Done! Data preserved, new features available!**

---

## ✅ What's Preserved

- ✅ Database (all products, sales, customers)
- ✅ License key
- ✅ User accounts
- ✅ Settings
- ✅ All customer data

---

## 🗂️ What's Updated

- ✅ App code (new features, bug fixes)
- ✅ Dependencies
- ✅ UI improvements

---

## 🆘 If Something Goes Wrong

### **Restore from backup:**
```cmd
1. Stop service: sc stop Igoodar
2. Copy backup: xcopy C:\Igoodar_Backup\data C:\Igoodar\data /E /I
3. Start service: sc start Igoodar
```

---

## 💡 Key Points

1. **Data folder is sacred** - Never delete it
2. **Always backup** - update.bat does this automatically
3. **Service must be stopped** - Before updating
4. **Admin rights needed** - For service reinstall
5. **License persists** - No re-activation needed

---

**See UPDATE-GUIDE.md for detailed instructions**
