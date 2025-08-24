# StockSage Client Deployment Guide

## Simple SQLite Deployment (Recommended)

StockSage now uses SQLite database for the simplest possible client deployment. No Docker, no complex setup - just copy and run!

### System Requirements
- **Node.js 18+** (download from [nodejs.org](https://nodejs.org))
- **Any Operating System**: Windows, Linux, or macOS
- **5MB disk space** for the application
- **No internet required** for operation (offline-first)

### One-Command Installation

1. **Download/Clone** the StockSage folder to client's computer
2. **Open terminal/command prompt** in the StockSage folder
3. **Run ONE command**:
   ```bash
   npm install && npm start
   ```

That's it! The app will:
- ✅ Install dependencies automatically
- ✅ Create SQLite database (`data/stocksage.db`)
- ✅ Run database migrations
- ✅ Start the web server
- ✅ Open at `http://localhost:3000`

### What Happens Behind the Scenes

1. **SQLite Database**: Creates a single file database in `data/stocksage.db`
2. **No Server Setup**: Everything runs locally on the client's machine
3. **Automatic Initialization**: Database tables created automatically
4. **Sample Data**: App starts with demo data for immediate use
5. **Offline Operation**: Works completely without internet

### Client Deployment Package

For easiest client deployment, provide them with:

```
StockSage/
├── package.json          # Dependencies
├── start.js             # Simple startup script
├── scripts/
│   └── init-sqlite.js   # Database initialization
├── server/              # Backend code
├── client/              # Frontend code
├── shared/              # Database schema
└── DEPLOYMENT.md        # This guide
```

### Alternative: Portable Executable (Future)

For non-technical clients, we can create:
- **Windows**: `StockSage.exe` (single executable)
- **macOS**: `StockSage.app` (application bundle)
- **Linux**: `stocksage` (AppImage or binary)

### Backup & Data

- **Database Location**: `data/stocksage.db`
- **Backup**: Simply copy the `data/` folder
- **Migration**: Copy `data/` folder to new installation
- **No Cloud Dependency**: All data stays on local machine

### Troubleshooting

**Problem**: "Node.js not found"
**Solution**: Install Node.js from nodejs.org

**Problem**: "Permission denied"
**Solution**: Run terminal as administrator (Windows) or use `sudo` (Linux/Mac)

**Problem**: "Port 3000 in use"
**Solution**: Close other applications using port 3000, or modify port in `package.json`

### Client Instructions (Simple Version)

1. Install Node.js from nodejs.org
2. Extract StockSage folder to Desktop
3. Double-click `start.bat` (Windows) or `start.sh` (Mac/Linux)
4. Open browser to `http://localhost:3000`
5. Start using your inventory system!

---

**StockSage** - The simplest inventory management system for small businesses.
