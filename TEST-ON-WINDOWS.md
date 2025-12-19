# 🧪 Test Instructions for Windows

## What Was Fixed
The installer now includes the **correct Node v20 Windows binary** that matches the portable Node.js v20, solving the `MODULE_VERSION 108 vs 115 mismatch` error.

## Quick Test

### 1. Transfer Installer
```bash
# Location on Mac
/Users/abdessamadabba/repos/StockSage/installer-simple/output/igoodar-setup.exe

# Copy to Windows PC:
- USB drive
- Network share
- Or email/cloud
```

### 2. Install on Windows (Offline Test)
```
1. Disconnect Windows from internet (optional - proves offline capability)
2. Double-click igoodar-setup.exe
3. Wait for installation (2-3 minutes)
4. Browser should auto-open to: http://localhost:5003
```

### 3. Expected Success Output ✅
```
Microsoft Windows [version 10.0.19045.6456]
C:\Users\Nutzer>cd C:\Users\Nutzer\AppData\Local\Igoodar

C:\Users\Nutzer\AppData\Local\Igoodar>start.bat

Checking for Node.js...
✓ Found embedded Node.js portable

✓ Dependencies found

Initializing database...
Database initialized successfully!

Starting Igoodar...
Opening browser...

========================================
   Igoodar Started Successfully!
========================================

✓ Igoodar is now running
✓ Browser opened to: http://localhost:5003

Access: http://localhost:5003
```

### 4. What You Should See
- ✅ **No errors** about `MODULE_VERSION`
- ✅ **No errors** about `spawn node ENOENT`
- ✅ **No errors** about `not a valid Win32 application`
- ✅ **Database initializes** successfully
- ✅ **Server starts** on port 5003
- ✅ **Browser opens** automatically
- ✅ **Login screen** appears

### 5. Login
```
Admin PIN: 1234
Cashier PIN: 5678
```

## If It Fails

### Check Node Version
```powershell
# In Igoodar installation folder
C:\Users\[Username]\AppData\Local\Igoodar

# Check portable Node.js version
nodejs\node.exe --version
# Should show: v20.x.x

# Check if binary exists
dir node_modules\better-sqlite3\build\Release\better_sqlite3.node
# Should exist (1.6 MB)
```

### Check Logs
```powershell
# Look for errors
type nul > debug.log
start.bat > debug.log 2>&1
notepad debug.log
```

### Report Issues
If it still fails, send:
1. Full error message from console
2. Output of: `nodejs\node.exe --version`
3. Output of: `dir node_modules\better-sqlite3\build\Release\`

## Troubleshooting

### Error: "spawn node ENOENT"
**Cause**: System Node.js is being used instead of portable Node.js
**Fix**: The NSIS installer now explicitly uses portable Node.js. Reinstall.

### Error: "not a valid Win32 application"
**Cause**: Mac binary was included instead of Windows binary
**Fix**: Rebuild installer with `npm run build:installer`. The v20 binary should auto-download.

### Error: "MODULE_VERSION 108 vs 115"
**Cause**: Node v18 binary with Node v20 runtime
**Fix**: This is FIXED in the current installer. Download the latest `igoodar-setup.exe`.

## Success Checklist
- [ ] Installer runs without internet
- [ ] No MODULE_VERSION errors
- [ ] Database initializes
- [ ] Server starts on port 5003
- [ ] Browser opens automatically
- [ ] Login screen appears
- [ ] Can log in with PIN 1234
- [ ] Dashboard loads properly

## Next Steps After Success
1. Test creating products
2. Test making a sale
3. Test offline mode (disconnect internet, restart app)
4. Test auto-start on boot (restart Windows)
5. Verify code is obfuscated (check `server/` folder - should be .js files that are hard to read)

---

**Current Build**: December 19, 2024
**Installer Size**: 84.6 MB
**Node Version**: v20.18.1 (portable + binary matched)
**Status**: Ready for production testing ✅

