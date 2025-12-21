# 📦 FTP Deployment Guide - Hostinger

Complete guide for automating deployments to your Hostinger FTP server.

---

## ✅ **Quick Start**

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure FTP Credentials

Add these to your `.env` file:

```env
# FTP Configuration for Hostinger
FTP_HOST=ftp.yourdomain.com
FTP_USER=your-ftp-username
FTP_PASSWORD=your-ftp-password
FTP_PORT=21
FTP_SECURE=false
FTP_REMOTE_PATH=/public_html
FTP_INSTALLER_PATH=/public_html/downloads
```

### 3. Test FTP Connection
```bash
npm run test:ftp
```

### 4. Deploy!
```bash
# Deploy web application
npm run deploy

# Deploy Windows installer
npm run deploy:installer
```

---

## 📋 **Configuration Details**

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `FTP_HOST` | Hostinger FTP hostname | `ftp.yourdomain.com` |
| `FTP_USER` | FTP username | `username@yourdomain.com` |
| `FTP_PASSWORD` | FTP password | `yourpassword` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FTP_PORT` | FTP port | `21` |
| `FTP_SECURE` | Use FTPS (secure FTP) | `false` |
| `FTP_REMOTE_PATH` | Remote directory for web app | `/public_html` |
| `FTP_INSTALLER_PATH` | Remote directory for installer | `/public_html/downloads` |

---

## 🚀 **Deployment Commands**

### Deploy Web Application

```bash
# Build and deploy web app
npm run build
npm run deploy
```

**What it does:**
1. Validates FTP configuration
2. Scans `dist/public` directory
3. Connects to Hostinger FTP
4. Uploads all files to remote path
5. Shows deployment summary

### Deploy Windows Installer

```bash
# Build and deploy installer
npm run build:installer
npm run deploy:installer
```

**What it does:**
1. Validates FTP configuration
2. Finds `installer-simple/output/igoodar-setup.exe`
3. Connects to Hostinger FTP
4. Uploads installer to downloads path
5. Provides download URL

### Test FTP Connection

```bash
npm run test:ftp
```

**What it tests:**
- ✅ Connection to FTP server
- ✅ Authentication (username/password)
- ✅ Directory access
- ✅ Write permissions
- ✅ Lists directory contents

---

## 🎯 **Deployment Scenarios**

### Scenario 1: Deploy New Version (Web App)

```bash
# Build the app
npm run build

# Deploy to Hostinger
npm run deploy
```

**Output:**
```
========================================
  📦 StockSage FTP Deployment
========================================

📋 Deployment Summary:
   Target: Web Application
   Server: ftp.yourdomain.com:21
   Remote: /public_html
   Files: 45
   Size: 2.34 MB
   Mode: LIVE DEPLOYMENT

🔌 Connecting to FTP server...
✅ Connected!

📂 Preparing remote directory: /public_html
✅ Remote directory ready

📤 Uploading files...

   Uploading index.html (1.38 KB)... ✅
   Uploading assets/index-DUpsDAFt.css (109.71 KB)... ✅
   Uploading assets/index-DRU7XaD4.js (914.28 KB)... ✅
   ... (42 more files)

========================================
  📊 Deployment Summary
========================================

   ✅ Uploaded: 45 files
   📦 Total: 2.34 MB

========================================

🎉 Deployment completed successfully!

🌐 Website URL: https://yourdomain.com
```

### Scenario 2: Deploy Windows Installer

```bash
# Build the installer
npm run build:installer

# Deploy to Hostinger
npm run deploy:installer
```

**Output:**
```
========================================
  📦 StockSage FTP Deployment
========================================

📋 Deployment Summary:
   Target: Windows Installer
   Server: ftp.yourdomain.com:21
   Remote: /public_html/downloads
   Files: 1
   Size: 85.00 MB
   Mode: LIVE DEPLOYMENT

🔌 Connecting to FTP server...
✅ Connected!

📂 Preparing remote directory: /public_html/downloads
✅ Remote directory ready

📤 Uploading files...

   Uploading igoodar-setup.exe (85.00 MB)... ✅

========================================
  📊 Deployment Summary
========================================

   ✅ Uploaded: 1 file
   📦 Total: 85.00 MB

========================================

🎉 Deployment completed successfully!

📥 Installer URL: https://yourdomain.com/downloads/igoodar-setup.exe
```

### Scenario 3: Dry Run (Test Without Uploading)

```bash
npm run deploy -- --dry-run
```

**What it does:**
- Shows what WOULD be deployed
- Lists all files and sizes
- NO actual upload
- Perfect for testing

---

## 🛠️ **Advanced Options**

### Command Line Flags

```bash
# Show help
node scripts/deploy.js --help

# Dry run (no upload)
node scripts/deploy.js --dry-run

# Verbose output
node scripts/deploy.js --verbose

# Deploy installer with verbose output
node scripts/deploy.js --installer --verbose
```

### Custom Deployment Path

**In .env file:**
```env
# Deploy to subdirectory
FTP_REMOTE_PATH=/public_html/app

# Deploy installer to custom location
FTP_INSTALLER_PATH=/public_html/downloads/windows
```

---

## 🔒 **Security Best Practices**

### 1. Protect Your `.env` File

```bash
# .env is already in .gitignore
# NEVER commit .env to git!
```

### 2. Use Strong FTP Password

```env
# ❌ Weak
FTP_PASSWORD=123456

# ✅ Strong
FTP_PASSWORD=X9k#mP2$vL8@nQ5
```

### 3. Enable FTPS (Secure FTP)

```env
# Enable if your host supports it
FTP_SECURE=true
```

### 4. Use FTP Account with Minimal Permissions

- Only grant write access to required directories
- Don't use main account for deployments
- Create a dedicated FTP user for CI/CD

---

## 🐛 **Troubleshooting**

### Issue 1: Connection Refused

**Error:**
```
❌ Connection failed: connect ECONNREFUSED
```

**Solutions:**
1. Check `FTP_HOST` is correct
2. Verify port (usually 21 for FTP, 22 for SFTP)
3. Check firewall settings
4. Try from different network

### Issue 2: Authentication Failed

**Error:**
```
❌ Connection failed: 530 Login incorrect
```

**Solutions:**
1. Verify `FTP_USER` and `FTP_PASSWORD` in .env
2. Check for typos in username
3. Try logging in via FileZilla first
4. Contact Hostinger support

### Issue 3: Permission Denied

**Error:**
```
❌ Directory not accessible: 550 Permission denied
```

**Solutions:**
1. Check `FTP_REMOTE_PATH` exists
2. Verify FTP user has write permissions
3. Try changing path to `/public_html`
4. Contact hosting provider

### Issue 4: File Not Found

**Error:**
```
❌ Build not found. Run: npm run build
```

**Solution:**
```bash
# Build first, then deploy
npm run build
npm run deploy
```

### Issue 5: Upload Timeout

**Error:**
```
❌ Upload timeout
```

**Solutions:**
1. Check internet connection
2. Try uploading smaller files first
3. Increase timeout in deploy script
4. Use `--verbose` flag to see progress

---

## 📊 **Deployment Workflow**

### Complete Deployment Process

```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies (if needed)
npm install

# 3. Run tests
npm run test

# 4. Build frontend
npm run build

# 5. Build installer (optional)
npm run build:installer

# 6. Test FTP connection
npm run test:ftp

# 7. Deploy web app
npm run deploy

# 8. Deploy installer (optional)
npm run deploy:installer

# 9. Verify deployment
# Visit: https://yourdomain.com
```

### Automated Deployment (CI/CD)

**GitHub Actions Example:**
```yaml
name: Deploy to Hostinger

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build
        run: npm run build
      
      - name: Deploy
        env:
          FTP_HOST: ${{ secrets.FTP_HOST }}
          FTP_USER: ${{ secrets.FTP_USER }}
          FTP_PASSWORD: ${{ secrets.FTP_PASSWORD }}
          FTP_REMOTE_PATH: /public_html
        run: npm run deploy
```

---

## 🎉 **Success Checklist**

After deployment, verify:

- [ ] Website loads: `https://yourdomain.com`
- [ ] All assets load (CSS, JS, images)
- [ ] Application functions correctly
- [ ] Installer downloads: `https://yourdomain.com/downloads/igoodar-setup.exe`
- [ ] No console errors in browser
- [ ] API endpoints working (if applicable)

---

## 📞 **Support**

### Hostinger FTP Help

- **Support**: https://www.hostinger.com/tutorials/how-to-use-ftp
- **FTP Settings**: cPanel → Files → FTP Accounts
- **FileZilla Guide**: https://www.hostinger.com/tutorials/how-to-use-ftp-filezilla

### Common Hostinger FTP Settings

```env
# Standard Hostinger FTP
FTP_HOST=ftp.yourdomain.com
FTP_PORT=21
FTP_SECURE=false

# If using subdomain
FTP_HOST=ftp.subdomain.yourdomain.com

# Business hosting
FTP_HOST=yourdomain.com
```

---

## ✅ **Status**

**Implementation:** ✅ COMPLETE  
**Testing:** Ready for use  
**Documentation:** ✅ This guide  

---

**Built with:** Node.js, basic-ftp  
**Compatible with:** Hostinger, cPanel, any FTP server  
**Date:** December 21, 2024

