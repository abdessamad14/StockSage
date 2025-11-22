========================================
   IGOODAR - Installation Instructions
========================================

⚠️  IMPORTANT: This is proprietary software
    Read LICENSE.txt before installing
    Unauthorized distribution is prohibited

Copyright (c) 2025 Igoodar. All rights reserved.

========================================

QUICK INSTALL:
1. Right-click "start.bat"
2. Select "Run as Administrator"
3. Wait 2-5 minutes for installation
4. Service installs automatically
5. Done! App runs forever

ACCESS:
Open browser: http://localhost:5003

IMPORTANT:
✓ App installs as Windows Service
✓ Auto-starts when PC boots
✓ Survives PC restarts
✓ Runs forever in background

DEFAULT LOGIN:
• Admin: admin / admin123 (PIN: 1234)
• Cashier: cashier / cashier123 (PIN: 5678)

⚠️ IMPORTANT: Change passwords after first login!

========================================
   SERVICE MANAGEMENT
========================================

The app is installed as a Windows Service.

CHECK STATUS:
   sc query Igoodar

STOP SERVICE:
   sc stop Igoodar

START SERVICE:
   sc start Igoodar

RESTART SERVICE:
   sc stop Igoodar && sc start Igoodar

UNINSTALL SERVICE:
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
