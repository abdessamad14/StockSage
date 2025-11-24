# Igoodar - Desktop Shortcuts Guide

## Automatic Installation (Recommended)

When you install Igoodar using the installer (`igoodar-setup-1.0.0.exe`), all shortcuts are **created automatically**:

- ✅ Desktop shortcut: "Igoodar"
- ✅ Start Menu folder: Programs\Igoodar
  - Igoodar (Start application)
  - Debug Install (Diagnostics)
  - Create Shortcuts (Re-create shortcuts if needed)
  - Uninstall

## Manual Shortcut Creation

If you copied Igoodar files manually or need to recreate shortcuts:

### Method 1: VBScript (Recommended)
```cmd
Double-click: create-shortcuts.vbs
```
- ✅ Works on all Windows versions
- ✅ No administrator rights needed
- ✅ Creates both Desktop and Start Menu shortcuts

### Method 2: Batch Script
```cmd
Right-click: create-shortcuts.bat → Run as Administrator
```
- ✅ Creates desktop shortcut using PowerShell
- ⚠️ Requires Administrator rights
- ⚠️ May require PowerShell execution policy changes

### Method 3: Start Menu
```
Start → Programs → Igoodar → Create Shortcuts
```
- ✅ Available after installation
- ✅ Re-creates shortcuts if accidentally deleted

## What Shortcuts Do

### Desktop Shortcut: "Igoodar"
- **Target:** `start.bat`
- **Action:** Starts Igoodar server in background
- **Result:** Browser opens to http://localhost:5003
- **Icon:** Node.js icon

### Start Menu Shortcuts

#### 1. Igoodar
- Starts the application (same as desktop)

#### 2. Debug Install
- Runs installation diagnostics
- Shows detailed system information
- Tests database and dependencies

#### 3. Create Shortcuts
- Re-creates all shortcuts
- Useful if shortcuts are deleted

## Shortcut Locations

After creation, you'll find:

```
Desktop:
  └─ Igoodar.lnk

Start Menu (Programs):
  └─ Igoodar/
      ├─ Igoodar.lnk
      ├─ Debug Install.lnk
      ├─ Create Shortcuts.lnk
      └─ Uninstall.lnk
```

## Manual Shortcut Creation (Advanced)

If you prefer to create shortcuts manually:

1. **Right-click on Desktop** → New → Shortcut
2. **Location:** 
   ```
   C:\Program Files\Igoodar\start.bat
   ```
3. **Name:** `Igoodar`
4. **Change Icon:**
   - Right-click shortcut → Properties
   - Click "Change Icon"
   - Browse to: `C:\Program Files\Igoodar\nodejs\node.exe`
   - Select icon → OK

## Troubleshooting

### Shortcut doesn't work
- Verify installation directory is correct
- Run `debug-install.bat` to check installation
- Re-run `create-shortcuts.vbs` to recreate

### Shortcut icon missing
- Icon should be Node.js logo
- If missing, right-click shortcut → Properties → Change Icon
- Browse to: `nodejs\node.exe`

### Can't create shortcuts
- Run `create-shortcuts.bat` as Administrator
- Or use `create-shortcuts.vbs` (doesn't need admin)

## Starting Igoodar

After shortcuts are created, you can start Igoodar in 3 ways:

1. **Desktop Icon** (easiest)
   - Double-click "Igoodar" icon
   
2. **Start Menu**
   - Start → Programs → Igoodar → Igoodar

3. **Manual Start**
   ```cmd
   cd C:\Program Files\Igoodar
   start.bat
   ```

All methods:
- ✅ Start server in background
- ✅ Open browser automatically
- ✅ Connect to http://localhost:5003

## Login Credentials

After starting Igoodar:

- **Admin:** PIN 1234
- **Cashier:** PIN 5678

## Need Help?

Run the diagnostic tool:
```
Start → Programs → Igoodar → Debug Install
```

This will check:
- Installation directory
- Node.js version
- Dependencies
- Database
- Application startup
