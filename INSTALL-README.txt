========================================
   IGOODAR - Installation Instructions
========================================

QUICK INSTALL:
1. Right-click "start.bat"
2. Select "Run as Administrator"
3. Wait 2-5 minutes for installation
4. App will start automatically

ACCESS:
Open browser: http://localhost:5003

DEFAULT LOGIN:
• Admin: admin / admin123 (PIN: 1234)
• Cashier: cashier / cashier123 (PIN: 5678)

⚠️ IMPORTANT: Change passwords after first login!

========================================
   AUTO-START ON BOOT (Optional)
========================================

To make the app start automatically when PC boots:

1. Right-click "start.bat"
2. Select "Run as Administrator"
3. Run this command:
   start.bat --install-service

The app will now start automatically every time you turn on your PC!

UNINSTALL AUTO-START:
Open Command Prompt as Administrator and run:
   sc delete Igoodar

========================================
   TROUBLESHOOTING
========================================

App not starting?
• Make sure Node.js is installed
• Check if port 5003 is available
• Run start.bat as Administrator

Service not working?
• Check status: sc query Igoodar
• Restart: sc stop Igoodar && sc start Igoodar

========================================
   SUPPORT
========================================

For help, contact your system administrator.

The app works completely offline - no internet needed!
