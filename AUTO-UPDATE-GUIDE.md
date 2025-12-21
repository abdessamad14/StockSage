# 🔄 Auto-Update System Guide

Complete guide for the automatic update notification system in iGoodar.

---

## 🎯 **Overview**

The auto-update system automatically notifies users when a new version is available, allowing them to download and install updates without leaving the app.

---

## ✨ **Features**

- ✅ **Automatic checking** - Checks for updates every 30 minutes
- ✅ **Prominent notification** - Beautiful dialog with changelog
- ✅ **One-click download** - Direct download link to latest installer
- ✅ **Dismissible** - Users can dismiss for 24 hours (unless critical)
- ✅ **Critical updates** - Cannot be dismissed for security fixes
- ✅ **Version comparison** - Smart version detection (1.0.0 vs 1.1.0)
- ✅ **Changelog display** - Shows what's new in the update
- ✅ **No interruption** - Checks in background, doesn't block usage

---

## 📋 **How It Works**

### 1. Version File

The system uses a `version.json` file hosted on your server:

```json
{
  "version": "1.1.0",
  "releaseDate": "2024-12-21",
  "downloadUrl": "https://yourdomain.com/downloads/igoodar-setup.exe",
  "changelog": [
    "Safe Update Architecture - Data protection during updates",
    "System Default printing mode",
    "Background service mode"
  ],
  "minVersion": "1.0.0",
  "critical": false
}
```

### 2. Update Checking

- App checks `/version.json` on server every 30 minutes
- Compares server version with current app version
- Shows notification if newer version available

### 3. User Notification

When update is available, users see a dialog with:
- Current version vs new version
- Release date
- Changelog (what's new)
- Download button
- Dismiss button (if not critical)

---

## 🚀 **Releasing a New Version**

### Step 1: Update Version Information

Use the version update script:

```bash
# Basic update
npm run version:update 1.1.0

# With download URL
npm run version:update 1.1.0 https://yourdomain.com/downloads/igoodar-setup.exe

# With changelog
npm run version:update 1.1.0 https://yourdomain.com/downloads/igoodar-setup.exe "Bug fixes" "Performance improvements" "New print modes"

# Critical update (cannot be dismissed)
npm run version:update 2.0.0 https://yourdomain.com/downloads/igoodar-setup.exe "Security fixes" --critical
```

**Manual editing:**
Edit `version.json` directly:
```json
{
  "version": "1.1.0",
  "releaseDate": "2024-12-21",
  "downloadUrl": "https://yourdomain.com/downloads/igoodar-setup.exe",
  "changelog": [
    "Your new feature",
    "Bug fix",
    "Another improvement"
  ],
  "minVersion": "1.0.0",
  "critical": false
}
```

### Step 2: Build New Installer

```bash
npm run build:installer
```

This creates: `installer-simple/output/igoodar-setup.exe`

### Step 3: Deploy to Server

```bash
npm run deploy:installer
```

This uploads:
- `igoodar-setup.exe` → `/public_html/downloads/`
- `version.json` → `/public_html/downloads/`

### Step 4: Verify Deployment

Visit:
- Installer: `https://yourdomain.com/downloads/igoodar-setup.exe`
- Version file: `https://yourdomain.com/downloads/version.json`

---

## 📊 **Update Flow**

```
1. Developer releases new version
   ↓
2. Updates version.json with new version number
   ↓
3. Builds new installer
   ↓
4. Deploys installer + version.json to server
   ↓
5. User's app checks version.json (every 30 min)
   ↓
6. App detects newer version
   ↓
7. Shows update notification dialog
   ↓
8. User clicks "Download Update"
   ↓
9. Browser downloads new installer
   ↓
10. User closes app and runs installer
   ↓
11. Installer updates app (data preserved!)
   ↓
12. User launches updated app
   ↓
13. ✅ Update complete!
```

---

## 🎨 **Update Notification UI**

### Normal Update

```
┌─────────────────────────────────────┐
│ 🔄 Nouvelle Version Disponible !   │
│    Version 1.1.0 est maintenant     │
│    disponible                       │
├─────────────────────────────────────┤
│                                     │
│  Version actuelle    →   Nouvelle  │
│       1.0.0              version    │
│                           1.1.0    │
│                                     │
│  Nouveautés :                       │
│  ✓ Safe Update Architecture         │
│  ✓ System printing mode             │
│  ✓ Background service               │
│                                     │
│  Date: 21 décembre 2024             │
│                                     │
│  [ Plus tard ]  [ Télécharger ]    │
│                                     │
│  Instructions: Après téléchargement,│
│  fermez l'application et lancez     │
│  l'installateur. Données préservées.│
└─────────────────────────────────────┘
```

### Critical Update

```
┌─────────────────────────────────────┐
│ 🔄 Nouvelle Version Disponible !   │
│    Version 2.0.0 est maintenant     │
│    disponible                       │
├─────────────────────────────────────┤
│                                     │
│ ⚠️ MISE À JOUR CRITIQUE             │
│    Il est fortement recommandé      │
│    d'installer cette version        │
│                                     │
│  Version actuelle    →   Nouvelle  │
│       1.9.0              version    │
│                           2.0.0    │
│                                     │
│  Nouveautés :                       │
│  ✓ Security fixes                   │
│  ✓ Critical bug fixes               │
│                                     │
│  [ Télécharger la mise à jour ]    │
│                  (no dismiss button)│
└─────────────────────────────────────┘
```

---

## ⚙️ **Configuration**

### In `version.json`

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | Semantic version (e.g., "1.1.0") |
| `releaseDate` | string | ISO date (e.g., "2024-12-21") |
| `downloadUrl` | string | Direct link to installer |
| `changelog` | string[] | Array of changes/features |
| `minVersion` | string | Minimum compatible version |
| `critical` | boolean | Cannot be dismissed if true |

### In Hook (`use-app-update.ts`)

```typescript
const CURRENT_VERSION = '1.0.0';  // Your app's current version
const VERSION_CHECK_URL = '/version.json';  // Where to check
const CHECK_INTERVAL = 1000 * 60 * 30;  // 30 minutes
```

**Important:** Update `CURRENT_VERSION` in the hook when you bump versions!

---

## 🔧 **Testing**

### Test Update Notification Locally

1. **Serve version.json locally:**
   ```bash
   # Put version.json in public folder
   cp version.json dist/public/
   
   # Or serve via dev server
   npm run dev
   ```

2. **Change version in version.json to higher version:**
   ```json
   {
     "version": "99.0.0",
     ...
   }
   ```

3. **Wait 10 seconds or refresh app**
4. **Update dialog should appear**

### Test Dismissal

1. Click "Plus tard" (Later)
2. Dialog dismisses
3. Won't show again for 24 hours (unless critical)

### Test Critical Update

1. Set `"critical": true` in version.json
2. Update dialog has NO dismiss button
3. User must acknowledge update

---

## 🚨 **Critical vs Normal Updates**

### Normal Update
- ✅ User can dismiss
- ✅ Won't show again for 24 hours after dismissal
- ✅ "Plus tard" button available
- Use for: Features, improvements, minor fixes

### Critical Update
- ❌ Cannot dismiss
- ⚠️ Red warning banner
- ❌ No "Plus tard" button
- ✅ Dialog persists until action taken
- Use for: Security fixes, breaking changes, critical bugs

---

## 📝 **Version Numbering**

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR.MINOR.PATCH** (e.g., 2.1.3)
  - **MAJOR**: Breaking changes (2.0.0)
  - **MINOR**: New features (1.1.0)
  - **PATCH**: Bug fixes (1.0.1)

Examples:
- `1.0.0` → `1.0.1` (bug fix)
- `1.0.1` → `1.1.0` (new feature)
- `1.9.0` → `2.0.0` (breaking change)

---

## 🎯 **Best Practices**

### 1. Always Test Before Deploying

```bash
# Test locally first
npm run build
npm run deploy -- --dry-run

# Then deploy
npm run deploy:installer
```

### 2. Write Clear Changelogs

**Bad:**
```json
"changelog": ["Updates", "Fixes"]
```

**Good:**
```json
"changelog": [
  "Safe Update Architecture - Data protected during updates",
  "Fixed printing issue with 80mm receipts",
  "Improved startup performance by 50%"
]
```

### 3. Use Critical Sparingly

Only mark as critical for:
- Security vulnerabilities
- Data loss bugs
- App-breaking issues

### 4. Update Download URL

Make sure `downloadUrl` points to the NEW installer!

---

## 🐛 **Troubleshooting**

### Issue 1: Update Not Showing

**Causes:**
- Version in `version.json` same or lower than current
- User dismissed within last 24 hours
- Development mode (updates disabled in dev)
- Network error fetching version.json

**Solutions:**
1. Check version.json is deployed
2. Clear localStorage: `localStorage.removeItem('igoodar_update_dismissed')`
3. Check browser console for errors
4. Verify version.json is accessible

### Issue 2: Wrong Download URL

**Fix:**
Update `downloadUrl` in version.json:
```json
{
  "downloadUrl": "https://yourdomain.com/downloads/igoodar-setup.exe"
}
```

### Issue 3: Version Not Updating

**Cause:** Cached version.json

**Fix:** Add cache-busting:
```typescript
const response = await fetch(VERSION_CHECK_URL + '?t=' + Date.now());
```

---

## 📊 **Files Modified**

| File | Purpose |
|------|---------|
| `version.json` | Version info and changelog |
| `client/src/hooks/use-app-update.ts` | Update checking logic |
| `client/src/components/UpdateNotification.tsx` | Update UI dialog |
| `client/src/OfflineApp.tsx` | Integrated notification |
| `scripts/update-version.js` | Version update script |
| `scripts/deploy.js` | Deploys version.json |

---

## ✅ **Checklist: Releasing an Update**

- [ ] Update version in `version.json`
- [ ] Add changelog items
- [ ] Update download URL
- [ ] Mark as critical if needed
- [ ] Build new installer: `npm run build:installer`
- [ ] Test installer locally
- [ ] Deploy: `npm run deploy:installer`
- [ ] Verify deployment (check URLs)
- [ ] Wait 30 minutes or test immediately
- [ ] Confirm users see notification
- [ ] Monitor for issues

---

## 🎉 **Summary**

The auto-update system:
- ✅ **Automatically checks** for updates every 30 minutes
- ✅ **Shows beautiful notification** with changelog
- ✅ **One-click download** for easy updates
- ✅ **Data preserved** during updates (Safe Update Architecture)
- ✅ **Non-intrusive** - users can continue working
- ✅ **Critical update support** for security fixes

**Users stay up-to-date effortlessly!** 🚀

---

**Built with:** React, TypeScript, Wouter  
**Compatible with:** Windows 10+  
**Date:** December 21, 2024

