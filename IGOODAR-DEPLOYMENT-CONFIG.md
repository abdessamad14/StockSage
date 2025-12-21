# 🚀 iGoodar Deployment Configuration

## ✅ **Your Current Setup**

**Domain:** igoodar.com  
**Server:** Hostinger FTP  
**Update Directory:** `/updates`

---

## 📋 **Current URLs**

- **Installer:** https://igoodar.com/updates/igoodar-installer.exe
- **Version File:** https://igoodar.com/updates/version.json
- **App URL:** https://igoodar.com

---

## 🔧 **FTP Configuration (.env)**

Your `.env` file should have:

```env
# FTP Deployment Configuration
FTP_HOST=ftp.igoodar.com
FTP_USER=your-ftp-username
FTP_PASSWORD=Q2?2hnzc
FTP_PORT=21
FTP_SECURE=false
FTP_REMOTE_PATH=/public_html
FTP_INSTALLER_PATH=/public_html/updates
```

---

## 🚀 **Releasing Updates - Your Workflow**

### Step 1: Update Version

```bash
npm run version:update 1.1.0 https://igoodar.com/updates/igoodar-installer.exe "New feature" "Bug fix"
```

### Step 2: Build Installer

```bash
npm run build:installer
```

This creates: `installer-simple/output/igoodar-setup.exe`

### Step 3: Deploy to Hostinger

```bash
npm run deploy:installer
```

This uploads to: `https://igoodar.com/updates/`

---

## ✅ **What Users See**

When a new version is available, users in the app will see:

```
┌───────────────────────────────────────┐
│ 🔄 Nouvelle Version Disponible !     │
│    Version 1.1.0 est maintenant      │
│    disponible                        │
├───────────────────────────────────────┤
│                                       │
│  Version actuelle    →   Nouvelle    │
│       1.0.0              1.1.0       │
│                                       │
│  Nouveautés :                        │
│  ✓ Your new features here            │
│                                       │
│  [ Plus tard ]  [ Télécharger ]     │
└───────────────────────────────────────┘
```

Click "Télécharger" → Downloads from `igoodar.com/updates/`

---

## 📁 **Server File Structure**

```
igoodar.com/
├── index.html (web app)
├── assets/
│   ├── index-xxx.css
│   └── index-xxx.js
└── updates/
    ├── igoodar-installer.exe (58.43 MB)
    └── version.json (248 B)
```

---

## 🔄 **Update Process**

```
1. You: npm run version:update 1.1.0
2. You: npm run build:installer
3. You: npm run deploy:installer
   ↓
4. Hostinger: Files uploaded to /updates
   ↓
5. User's app: Checks https://igoodar.com/updates/version.json
   ↓
6. User's app: Sees notification
   ↓
7. User: Clicks download
   ↓
8. Browser: Downloads from https://igoodar.com/updates/igoodar-installer.exe
   ↓
9. User: Installs update
   ↓
10. ✅ Updated!
```

---

## 🧪 **Testing**

### Test Update Notification

1. **Increase version in version.json:**
   ```bash
   npm run version:update 99.0.0 https://igoodar.com/updates/igoodar-installer.exe "Test update"
   ```

2. **Deploy test version:**
   ```bash
   npm run deploy:installer
   ```

3. **Open app and wait 10 seconds**
4. **Update notification should appear!**

5. **Reset version when done:**
   ```bash
   npm run version:update 1.0.0 https://igoodar.com/updates/igoodar-installer.exe
   ```

---

## 📊 **Current Status**

✅ Domain configured: **igoodar.com**  
✅ FTP deployment working  
✅ Installer uploaded: **igoodar-installer.exe**  
✅ Version file uploaded: **version.json**  
✅ Auto-update system: **ACTIVE**  

---

## 🎯 **Quick Commands**

```bash
# Test FTP connection
npm run test:ftp

# Update version (example for 1.1.0)
npm run version:update 1.1.0 https://igoodar.com/updates/igoodar-installer.exe "New printing features" "Performance improvements"

# Mark as critical (cannot dismiss)
npm run version:update 1.1.0 https://igoodar.com/updates/igoodar-installer.exe "Security fixes" --critical

# Build installer
npm run build:installer

# Deploy to igoodar.com
npm run deploy:installer

# Deploy web app
npm run build
npm run deploy
```

---

## ✅ **Checklist: Release New Version**

- [ ] Update version.json with new version number
- [ ] Add changelog items describing changes
- [ ] Build installer: `npm run build:installer`
- [ ] Test installer locally on Windows
- [ ] Deploy: `npm run deploy:installer`
- [ ] Verify files at https://igoodar.com/updates/
- [ ] Test app checks for update (wait 30 min or restart)
- [ ] Confirm notification appears
- [ ] Verify download works

---

## 🎉 **You're All Set!**

Your iGoodar app now has:
- ✅ Automatic update notifications
- ✅ One-click downloads from igoodar.com
- ✅ Data preservation during updates
- ✅ Professional update management

**Users will stay up-to-date automatically!** 🚀

