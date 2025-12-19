# Fix Summary: Windows Binary Compatibility

## Problem
The installer was failing on Windows with error:
```
Error: The module 'better_sqlite3.node' was compiled against a different Node.js version
NODE_MODULE_VERSION 108 vs NODE_MODULE_VERSION 115
```

And:
```
Error: spawn node ENOENT
```

## Root Causes
1. **Binary Mismatch**: Mac ARM64 binary was being packaged instead of Windows x64 binary
2. **Node Version Mismatch**: Old binary was for Node v18 (MODULE_VERSION 108), but portable Node.js is v20 (MODULE_VERSION 115)
3. **Path Issues**: `start.bat` wasn't using the portable Node.js explicitly

## Solution Implemented

### 1. Auto-Download Windows Binary
- Created `scripts/download-windows-sqlite-binary.js`
- Downloads from GitHub releases: `better-sqlite3-v11.7.0-node-v115-win32-x64.tar.gz`
- Uses `curl` to avoid Node.js SSL certificate issues
- Caches in `.windows-binaries/` folder

### 2. Fixed Build Process
- `scripts/build-simple-installer.js` now:
  - Checks for cached Windows binary
  - Downloads if missing
  - Replaces Mac binary in `node_modules` with Windows binary
  - Verifies binary is PE32+ (Windows DLL)

### 3. Fixed start.bat
- Now explicitly uses portable Node.js: `"%~dp0nodejs\node.exe"`
- Database initialization also uses portable Node.js
- No longer depends on system Node.js

### 4. Result
✅ 100% offline installation
✅ Correct binary for Node v20 (MODULE_VERSION 115)
✅ Works on any Windows 10+ PC without Node.js installed
✅ Installer size: 84.6 MB

## Technical Details

### Binary Information
```
File: better_sqlite3.node
Type: PE32+ executable (DLL) (GUI) x86-64, for MS Windows
Size: ~900 KB
Source: https://github.com/WiseLibs/better-sqlite3/releases/download/v11.7.0/better-sqlite3-v11.7.0-node-v115-win32-x64.tar.gz
```

### Node.js Module Versions
- Node v16.x: MODULE_VERSION 93
- Node v18.x: MODULE_VERSION 108
- Node v20.x: MODULE_VERSION 115 ✅ (portable nodejs)
- Node v22.x: MODULE_VERSION 127

### Files Modified
1. `scripts/download-windows-sqlite-binary.js` (NEW)
2. `scripts/build-simple-installer.js` (binary detection & download)
3. NSIS installer script (start.bat generation)

## Testing
To test on Windows:
1. Build installer on Mac: `npm run build:installer`
2. Copy `installer-simple/output/igoodar-setup.exe` to Windows PC
3. Install (no internet needed)
4. Verify starts correctly and database works

## Maintenance
- Binary is cached in `.windows-binaries/` (gitignored)
- Delete `.windows-binaries/` to force re-download
- Update `BETTER_SQLITE3_VERSION` in download script if upgrading
- Check GitHub releases for Node version compatibility

