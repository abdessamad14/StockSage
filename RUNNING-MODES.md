# 🚀 Igoodar Running Modes

## 📋 Two Ways to Run Igoodar

---

## ✅ Mode 1: Background Process (Default)

### **How to start:**
```
Double-click start.bat
```

### **What happens:**
1. App starts in background
2. Terminal shows success message
3. You can **close the terminal window**
4. App keeps running in background
5. Access at: `http://localhost:5003`

### **Pros:**
- ✅ Simple - just double-click
- ✅ No admin rights needed
- ✅ Terminal can be closed
- ✅ App runs until PC restarts

### **Cons:**
- ⚠️ Stops when PC restarts
- ⚠️ Must manually start after reboot

### **How to stop:**
1. Open Task Manager (`Ctrl + Shift + Esc`)
2. Find "Node.js: Server-side JavaScript" process
3. Right-click → End task

---

## ✅ Mode 2: Windows Service (Auto-Start)

### **How to install:**
```
1. Right-click start.bat
2. Select "Run as Administrator"
3. Run: start.bat --install-service
```

### **What happens:**
1. Installs as Windows Service
2. Starts automatically on PC boot
3. Runs in background (no terminal)
4. Restarts automatically if crashes
5. Survives PC restarts

### **Pros:**
- ✅ Auto-starts on boot
- ✅ Survives PC restarts
- ✅ Auto-recovers from crashes
- ✅ Professional deployment
- ✅ No manual intervention needed

### **Cons:**
- ⚠️ Requires admin rights to install
- ⚠️ Slightly more complex setup

### **Service Management:**

**Check status:**
```cmd
sc query Igoodar
```

**Stop service:**
```cmd
sc stop Igoodar
```

**Start service:**
```cmd
sc start Igoodar
```

**Restart service:**
```cmd
sc stop Igoodar && sc start Igoodar
```

**Uninstall service:**
```cmd
sc delete Igoodar
```

---

## 🎯 Which Mode to Use?

### **Use Background Process if:**
- Testing or development
- Temporary installation
- Don't need auto-start
- Want simple setup

### **Use Windows Service if:**
- Production deployment
- Restaurant/shop POS system
- Need auto-start on boot
- Want professional setup
- Multiple daily reboots

---

## 📊 Comparison Table

| Feature | Background Process | Windows Service |
|---------|-------------------|-----------------|
| **Auto-start on boot** | ❌ No | ✅ Yes |
| **Survives PC restart** | ❌ No | ✅ Yes |
| **Admin rights needed** | ❌ No | ✅ Yes (install only) |
| **Terminal window** | Can close | No terminal |
| **Auto-recovery** | ❌ No | ✅ Yes |
| **Setup complexity** | ⭐ Simple | ⭐⭐ Medium |
| **Best for** | Testing | Production |

---

## 🔄 Typical Customer Workflow

### **Initial Setup:**
1. Extract ZIP
2. Run `start.bat` (background mode)
3. Test the app
4. If satisfied → Install as service

### **Install as Service:**
1. Right-click `start.bat` → Run as Administrator
2. Run: `start.bat --install-service`
3. Done! App auto-starts forever

### **Daily Use:**
- **Background mode:** Start manually after each reboot
- **Service mode:** Nothing to do - always running

---

## 🆘 Troubleshooting

### **Background Process Issues:**

**"App stops when I close terminal"**
- Make sure you see "Running in background" message
- Wait 3 seconds before closing terminal
- Check Task Manager for Node.js process

**"Can't access localhost:5003"**
- Check if Node.js process is running
- Restart: close terminal, run start.bat again

### **Windows Service Issues:**

**"Service won't start"**
- Check if port 5003 is available
- Run as Administrator
- Check Windows Event Viewer for errors

**"Service not auto-starting"**
- Verify service is set to "Automatic"
- Run: `sc config Igoodar start= auto`

---

## 💡 Recommendations

### **For Customers:**
**Always use Windows Service mode!**

Why?
- ✅ Professional
- ✅ Reliable
- ✅ No manual intervention
- ✅ Survives power outages
- ✅ Auto-recovers from crashes

### **For Developers:**
**Use Background Process mode**

Why?
- ✅ Quick testing
- ✅ Easy to restart
- ✅ No admin rights needed
- ✅ Simple debugging

---

## 📝 Summary

**Background Process:**
- Run: `start.bat`
- Stops on PC restart
- Manual start needed
- Good for testing

**Windows Service:**
- Run: `start.bat --install-service`
- Auto-starts on boot
- Survives restarts
- Best for production

**Choose based on your needs!** 🎯
