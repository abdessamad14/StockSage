# StockSage Packaging Guide

## Building Deployment Packages

### Quick Build
```bash
npm run build:zip
```

This creates a deployment-ready ZIP file in the `/packages` directory.

## Package Details

### What's Included
- ✅ Built frontend (`dist/` folder)
- ✅ Backend server code (`server/`, `shared/`)
- ✅ Database migrations (`drizzle/`)
- ✅ Setup scripts (`scripts/`)
- ✅ Start scripts (Windows & Unix)
- ✅ Configuration files (`package.json`, `package-lock.json`)
- ✅ Documentation (`README.md`, `DEPLOYMENT.md`)

### What's NOT Included
- ❌ `node_modules` - Recipients must run `npm install`
- ❌ `data/` - Database created automatically on first run
- ❌ `.git/` - Version control not needed for deployment

### Why Exclude node_modules?

The `better-sqlite3` package contains **native binaries** compiled for specific platforms:
- macOS binaries won't work on Windows
- Windows binaries won't work on Linux
- Linux binaries won't work on macOS

Recipients must run `npm install` to compile native modules for their platform.

## Deployment Instructions for Recipients

### 1. Extract the ZIP file

### 2. Install Dependencies (REQUIRED)
```bash
npm install
```

This downloads and compiles all dependencies for the recipient's platform.

### 3. Start the Application

**Windows:**
```cmd
start.bat
```

**Linux/macOS:**
```bash
./start.sh
# or
npm start
```

### 4. Access the Application
Open browser to: http://localhost:5000

## Default Credentials

**Admin:**
- Username: `admin`
- Password: `admin123`
- PIN: `1234`

**Cashier:**
- Username: `cashier`
- Password: `cashier123`
- PIN: `5678`

## Package Naming

Packages are automatically timestamped:
```
StockSage-YYYYMMDDHHMMSS.zip
Example: StockSage-20251105214011.zip
```

## Alternative: .tgz Package

For Unix/Linux environments, you can also create a `.tgz` package:
```bash
npm run build:package
```

This creates a tarball with the same contents.

## Troubleshooting

### "better-sqlite3 is not a valid Win32 application"
**Cause:** Recipient didn't run `npm install`  
**Solution:** Run `npm install` in the extracted folder

### Package Too Large
**Current size:** ~30 MB (without node_modules)  
**With node_modules:** ~170 MB (platform-specific, not portable)

The 30 MB size is optimal for cross-platform deployment.

### Database Issues on First Run
If recipients encounter database errors, they can run:
```bash
npm run db:repair
```

## Building for Offline Deployment

If recipients have **no internet access**, you can:

1. Build the package normally
2. On the target machine, manually copy a pre-installed `node_modules` folder
3. Or use `npm pack` to create an offline-installable package

However, this requires the `node_modules` to be from the same platform.

## Best Practice

**Recommended approach:**
1. Build ZIP without node_modules (current setup)
2. Recipients run `npm install` once
3. Application works perfectly on any platform

This ensures maximum compatibility and smallest package size.
