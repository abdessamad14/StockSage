# 📦 Igoodar Windows Installation Guide

## ✅ Quick Installation

### Requirements
- **Windows 10 or later**
- **NO internet required** (✅ 100% offline installation)
- **200 MB free disk space**

### Installation Steps

1. **Run the installer**
   ```
   Double-click: igoodar-setup.exe
   ```

2. **Follow the wizard**
   - Click: Next → Next → Install
   - Wait 2-3 minutes

3. **Done!**
   - Browser opens automatically to http://localhost:5003
   - Double-click "Igoodar" icon on desktop to open anytime

### Default Login
```
Admin:
  PIN: 1234

Cashier:
  PIN: 5678
```

---

## 🔧 What Happens During Installation

The installer will:

1. ✅ Extract files to `C:\Users\[YourName]\AppData\Local\Igoodar`
2. ✅ Initialize database
3. ✅ Create desktop shortcut
4. ✅ Set up auto-start on Windows boot
5. ✅ Start the application

**Time:** 2-3 minutes  
**Internet:** NOT required (✅ 100% offline)

---

## ⚠️ Important Notes

### No Internet Required!
The installation is **100% offline** - no internet connection needed at any time. All dependencies including the Windows-compatible SQLite database driver are included in the installer.

### Installation Location
```
C:\Users\[YourName]\AppData\Local\Igoodar\
```

Your data is stored in:
```
C:\Users\[YourName]\AppData\Local\Igoodar\data\stocksage.db
```

### Firewall
Windows Firewall may ask for permission. Click "Allow" to enable:
- Access from your mobile device on the same WiFi
- Network printing features

---

## 🚀 After Installation

### Starting Igoodar
- **Desktop shortcut**: Double-click "Igoodar" icon
- **Or visit**: http://localhost:5003 in any browser

### Auto-Start
Igoodar starts automatically when Windows boots. You can always access it at http://localhost:5003

### Mobile Access
From your phone on the same WiFi:
1. Find your PC's IP address (run `ipconfig` in Command Prompt)
2. Open browser on phone
3. Visit: `http://[YOUR-PC-IP]:5003`

Example: `http://192.168.1.100:5003`

---

## 🔄 Updating

### How to Update
1. Download new installer
2. Run new `igoodar-setup.exe`
3. Installer automatically:
   - Backs up your data
   - Removes old version
   - Installs new version
   - Restores your data

**Your data is NEVER lost during updates!**

---

## 🐛 Troubleshooting

### Installer Shows "Database driver installation failed"

**Cause:** No internet connection or firewall blocking

**Solution:**
1. Check internet connection
2. Disable antivirus temporarily
3. Run installer as Administrator (right-click → Run as administrator)
4. Try again

### Application Won't Start

**Check if it's already running:**
```
1. Press Ctrl+Shift+Esc (Task Manager)
2. Look for "node.exe" process
3. If found, end it and try again
```

**Or restart the service:**
1. Navigate to: `C:\Users\[YourName]\AppData\Local\Igoodar`
2. Double-click `stop.bat`
3. Double-click `start.bat`

### Can't Access from Mobile

**Check Windows Firewall:**
1. Open Windows Defender Firewall
2. Click "Allow an app through firewall"
3. Make sure Node.js is allowed on Private networks

**Check your PC's IP:**
```
1. Open Command Prompt
2. Type: ipconfig
3. Look for "IPv4 Address" under your WiFi adapter
4. Use this IP on your phone
```

### Port 5003 Already in Use

**Another application is using port 5003**

**Solution:**
1. Close other applications
2. Or change the port in settings
3. Restart Igoodar

---

## 🗑️ Uninstalling

### To Remove Igoodar

**Method 1: Start Menu**
1. Open Start Menu
2. Search for "Igoodar"
3. Click "Uninstall"

**Method 2: Uninstall Script**
1. Navigate to: `C:\Users\[YourName]\AppData\Local\Igoodar`
2. Double-click `Uninstall.exe`

**⚠️ Warning:** Uninstalling will DELETE all your data!

### Backup Before Uninstalling
Copy this folder to a safe location:
```
C:\Users\[YourName]\AppData\Local\Igoodar\data\
```

---

## 📊 System Requirements

### Minimum
- **OS:** Windows 10 (64-bit)
- **RAM:** 2 GB
- **Disk:** 200 MB free space
- **Internet:** Required for installation

### Recommended
- **OS:** Windows 10/11 (64-bit)
- **RAM:** 4 GB
- **Disk:** 500 MB free space
- **Network:** WiFi for mobile access

---

## 🔒 Security & Privacy

### Your Data is Safe
- ✅ All data stored locally on your PC
- ✅ No data sent to internet
- ✅ No tracking or analytics
- ✅ Full control over your data

### Code Protection
- Server code is obfuscated (protected)
- Source code not included
- Business logic encrypted

---

## 📞 Support

### Common Issues

**"Node.js not found"**
- The portable Node.js should be included
- Check: `C:\Users\[YourName]\AppData\Local\Igoodar\nodejs\node.exe`

**"Database error"**
- Run: `C:\Users\[YourName]\AppData\Local\Igoodar\scripts\init-sqlite.js`
- This will reinitialize the database

**"Permission denied"**
- Run installer as Administrator
- Right-click installer → "Run as administrator"

---

## 💡 Tips

### Best Practices
1. **Backup regularly**: Copy the `data` folder to external drive
2. **Use on local network**: Access from multiple devices
3. **Keep Windows updated**: For best security
4. **Allow through firewall**: For mobile access

### Performance
- Igoodar is lightweight and fast
- Uses minimal system resources
- Can run on older PCs

### Mobile Use
- Works great on phones and tablets
- Same features as desktop
- Responsive design

---

## ✅ Installation Checklist

After installation, verify:

- [ ] Desktop shortcut created
- [ ] Application starts automatically
- [ ] Can access http://localhost:5003
- [ ] Can login with PIN 1234 or 5678
- [ ] POS interface loads
- [ ] Can create products
- [ ] Can process sales
- [ ] Can access from mobile (optional)

---

## 📝 What's Included

```
C:\Users\[YourName]\AppData\Local\Igoodar\
├── nodejs\            # Portable Node.js
├── node_modules\      # Dependencies
├── dist\              # Web interface
├── server\            # Backend (obfuscated)
├── scripts\           # Utilities
├── data\              # Your database
├── start.bat          # Start script
├── stop.bat           # Stop script
└── Uninstall.exe      # Uninstaller
```

---

## 🎉 Enjoy Igoodar!

Your installation is complete. Start managing your inventory and processing sales!

**Quick Start:**
1. Double-click "Igoodar" on desktop
2. Login with PIN 1234
3. Start using the POS system!

---

**Version:** 1.0.0  
**Last Updated:** December 2024

