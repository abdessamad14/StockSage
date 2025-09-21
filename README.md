# StockSage

A comprehensive offline-first inventory and point-of-sale (POS) system designed for small businesses, featuring complete stock management with detailed transaction history and multi-warehouse support.

## Features

- **Offline-first architecture**: Fully functional without internet connection using local SQLite database
- **Complete inventory management**: Multi-warehouse stock tracking with detailed transaction history
- **Point of Sale (POS)**: Fast checkout with automatic stock updates and receipt generation
- **Purchase order management**: Full supplier ordering workflow with receiving and payment tracking
- **Stock transaction history**: Complete audit trail for all stock movements (sales, purchases, adjustments, transfers)
- **Inventory counting**: Physical count reconciliation with variance tracking and automated adjustments
- **Supplier & customer management**: Complete contact and transaction history
- **Warehouse filtering**: View stock and history by specific locations or across all warehouses
- **Real-time stock updates**: Automatic quantity adjustments across all operations
- **Mobile-responsive design**: Works seamlessly on smartphones, tablets, and desktops
- **USB Barcode scanner integration**: Automatic product scanning with cart addition in POS
- **USB Thermal printer support**: Direct receipt printing via WebUSB API
- **Receipt reprinting**: Print receipts for past sales from Sales History

## Technology Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Database**: SQLite with better-sqlite3 (embedded, zero-configuration)
- **Backend**: Express.js REST API for database operations
- **Storage**: SQLite database with better-sqlite3 (embedded)
- **State Management**: Custom React hooks with async database operations
- **UI Components**: Shadcn/ui with modern design system
- **Build Tool**: Vite for fast development and optimized builds

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Modern web browser
- SQLite database automatically created on first run (no installation required)

### Installation (Windows, macOS, Linux)

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/stocksage.git
cd stocksage
```

2. **Run the guided setup**

```bash
npm run setup
```

This command:
- Installs dependencies
- Builds the production web client into `dist/public`
- Initialises the SQLite database (`data/stocksage.db`)
- Seeds default values (admin account, stock locations, settings, etc.)

3. **Start the application**

```bash
npm start
```

`npm start` runs the production server (Express API + static assets) and will reinitialise the database automatically if it is missing.

4. **Sign in** using the default credentials created during setup:

```
Tenant ID : tenant_1
Username  : admin
Password  : admin123
PIN       : 1234
```

Override these values by passing flags such as `--tenant-id`, `--admin-user`, `--admin-password`, etc., to `node scripts/init-sqlite.js`, or by defining environment variables before running `npm run setup`.

5. **Access the application**

Visit `http://localhost:3000` in your browser. The API is served from `http://localhost:5000`.

### Quick Relaunch

If `node_modules` and `dist/public` already exist, `npm start` skips the setup work and launches immediately. Re-run `npm run setup` whenever you want to rebuild assets or reseed the database.

### Advanced Seeding

Customise the seeded business profile and administrator by running:

```bash
node scripts/init-sqlite.js \
  --tenant-id=mycompany \
  --admin-user=owner \
  --admin-password=StrongPass! \
  --admin-pin=4321 \
  --business-name="My Company" \
  --currency=USD \
  --language=en
```

All options respect environment variables prefixed with `STOCKSAGE_`. Add them to a `.env` file before invoking `npm run setup` to automate per-client provisioning.

### Deploying to Client Machines (Source-Free)

Follow these steps when you need to install StockSage for a customer while keeping your source code private:

1. **Prepare the release on your build machine**
   - Run `npm run setup` once. This installs dependencies, builds the web client, and ensures the seeding scripts work.
   - Remove the `data/` directory from the release bundle if it was created; the installer will rebuild it on-site.
   - Package the runtime artefacts only (for example: `dist/`, `server/`, `shared/`, `scripts/`, `package.json`, lockfile, `start.js`, `start.bat`, `start.sh`, and `node_modules/` if you prefer offline installs).

2. **Install on the client workstation**
   - Unpack the release into a directory such as `C:\StockSage\app` or `/opt/stocksage/app`.
   - Open a terminal in that directory and run `start.bat` (Windows) or `./start.sh` (macOS/Linux). On first launch the script invokes `node scripts/init-sqlite.js --seed` automatically and generates `data/stocksage.db` with the default admin account.
   - Log in with the default credentials from the previous section and hand the system over to the customer.

3. **Keep operational data isolated**
   - All business data lives in the `data/` directory (mainly `data/stocksage.db` plus WAL/SHM files). Back this folder up regularly.
   - You can store the backups in a separate drive or network share without exposing application files.

4. **Upgrade without touching data**
   - Stop the running instance.
   - Copy the existing `data/` folder to a safe location.
   - Replace the application directory with the new release package (which should not contain its own `data/` folder).
   - Restore the saved `data/` folder into the new installation root.
   - Run `start.bat` / `./start.sh` again; the app reuses the preserved SQLite database and immediately picks up the new code.

5. **Disaster recovery**
   - If you ever need to reinstall from scratch, unpack a fresh release and copy the most recent `data/` backup into the new install before starting the service. No additional migrations are required because SQLite is self-contained.

Documenting this process directly in the README ensures every deployment follows the same predictable pattern and keeps client data isolated from shipped binaries.

### Running StockSage Automatically After Reboots

Configure the platform’s startup manager so StockSage launches as soon as the machine boots:

- **Windows (Task Scheduler)**
  1. Open *Task Scheduler* → *Create Task*.
  2. *General* tab: pick a descriptive name (e.g. “StockSage POS”), tick “Run whether user is logged on or not”, and “Run with highest privileges”.
  3. *Triggers* tab: add a new trigger “At startup”.
  4. *Actions* tab: add an action “Start a program”, point to `start.bat`, and set the *Start in* directory to the StockSage install folder (e.g. `C:\StockSage\app`).
  5. Save the task; the app will start on every boot. (Optional: use [NSSM](https://nssm.cc/) or `sc.exe create` if you prefer a Windows service.)

- **Linux (systemd)**
  1. Copy the installation to `/opt/stocksage/app` (or similar) and make sure `start.sh` is executable.
  2. Create `/etc/systemd/system/stocksage.service` with:
     ```ini
     [Unit]
     Description=StockSage POS
     After=network.target

     [Service]
     WorkingDirectory=/opt/stocksage/app
     ExecStart=/usr/bin/env bash /opt/stocksage/app/start.sh
     Restart=on-failure
     Environment=NODE_ENV=production

     [Install]
     WantedBy=multi-user.target
     ```
  3. Enable and start it: `sudo systemctl daemon-reload && sudo systemctl enable --now stocksage`.

- **macOS (launchd)**
  1. Place the app under `/Applications/StockSage.app` (or any path) and ensure `start.sh` is executable.
  2. Create `~/Library/LaunchAgents/com.stocksage.pos.plist`:
     ```xml
     <?xml version="1.0" encoding="UTF-8"?>
     <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
     <plist version="1.0">
       <dict>
         <key>Label</key><string>com.stocksage.pos</string>
         <key>ProgramArguments</key>
         <array>
           <string>/bin/bash</string>
           <string>/Applications/StockSage/start.sh</string>
         </array>
         <key>WorkingDirectory</key><string>/Applications/StockSage</string>
         <key>RunAtLoad</key><true/>
         <key>KeepAlive</key><true/>
       </dict>
     </plist>
     ```
  3. Load it with `launchctl load ~/Library/LaunchAgents/com.stocksage.pos.plist`.

Whichever method you pick, make sure the command runs inside the StockSage installation directory so the script can locate `data/` and `dist/`. Test by rebooting once to confirm the service starts, then monitor logs (`journalctl -u stocksage`, Task Scheduler history, or `launchctl list`) for troubleshooting.

## Core Features

### Stock Management
- **Multi-warehouse support**: Manage inventory across multiple locations
- **Real-time stock tracking**: Automatic updates from all operations
- **Low stock alerts**: Configurable minimum stock level warnings
- **Stock adjustments**: Manual corrections with full audit trail
- **Stock transfers**: Move inventory between warehouses

### Transaction History
- **Complete audit trail**: Every stock movement is recorded
- **Transaction types**: Sales, purchases, adjustments, transfers, entries, exits
- **Warehouse filtering**: View history by specific location or all locations
- **Reference tracking**: Link transactions to orders, sales, or manual operations

### Point of Sale
- **Fast checkout**: Intuitive interface with barcode scanner support
- **USB barcode scanner**: Automatic product scanning and cart addition
- **Automatic stock updates**: Quantities decrease immediately upon sale
- **Customer management**: Track customer purchases and credit
- **Thermal receipt printing**: Direct USB printer integration with WebUSB
- **Receipt reprinting**: Reprint receipts for any past sale

### Purchase Orders
- **Supplier management**: Complete supplier contact and payment tracking
- **Order workflow**: Draft → Ordered → Received status progression
- **Stock receiving**: Automatic inventory updates when orders arrive
- **Payment tracking**: Partial and full payment management with credit balances

### Inventory Counting
- **Physical count sessions**: Organize counting by location
- **Variance detection**: Automatic identification of discrepancies
- **Reconciliation options**: Accept count, keep system, or manual adjustment
- **Transaction recording**: All reconciliations create audit trail entries

## Development

### Available Commands

- `node start.js` - Start the complete application (database + API + frontend)
- `npm run dev` - Start frontend only in development mode
- `npm run build` - Build the frontend for production
- `npm run lint` - Run TypeScript and ESLint checks
- `npm run test` - Run the test suite

### Data Management

StockSage uses a local SQLite database:
- **Data persistence**: All data stored in `/data/stocksage.db`
- **Automatic backups**: Database file can be easily copied/backed up
- **Cross-device access**: Multiple devices can access the same database
- **Privacy focused**: All data stays on your local machine
- **Real-time updates**: Direct database operations with immediate UI feedback

## Production Deployment

StockSage requires both frontend and backend for full functionality:

1. **Simple deployment** (recommended for small businesses):
   ```bash
   node start.js
   ```
   This starts everything needed on a single machine.

2. **Docker deployment** (for advanced users):
   ```bash
   docker-compose up -d
   ```

3. **Manual deployment**:
   - Build frontend: `npm run build`
   - Deploy backend API server
   - Configure database path and API endpoints

**Note**: Database and application run on the same machine for optimal offline performance.

## Architecture

### Offline-First Design
StockSage is built with an offline-first architecture:

- **Local database**: SQLite database runs on the same machine as the application
- **No internet required**: All operations work without external connectivity
- **Direct database access**: All operations use SQLite for immediate persistence
- **Instant startup**: Database initializes automatically on first run
- **Single-tenant**: Each installation is isolated and self-contained

### File Structure
```
├── client/src/
│   ├── components/     # Reusable UI components
│   ├── hooks/         # Custom React hooks for data management
│   ├── lib/           # Database storage and utility functions
│   ├── pages/         # Main application pages
│   └── shared/        # Shared types and schemas
├── server/            # Express.js API server
├── data/              # SQLite database files
├── scripts/           # Database initialization scripts
└── shared/            # Shared TypeScript interfaces
```

### Data Flow
1. **User interactions** trigger React component updates
2. **Custom hooks** manage state and call database storage functions
3. **Database storage** calls API endpoints for SQLite operations
4. **API endpoints** perform direct SQLite database operations
5. **Transaction recording** creates audit trails for stock changes
6. **UI updates** reflect changes immediately from cache

## Browser Compatibility

StockSage works in all modern browsers that support:
- ES2020+ JavaScript features
- Fetch API for database communication
- CSS Grid and Flexbox

**For full hardware integration (USB thermal printer):**
- Chrome 90+ ✅ (WebUSB support)
- Edge 90+ ✅ (WebUSB support)
- Firefox 88+ ⚠️ (No WebUSB - software fallback)
- Safari 14+ ⚠️ (No WebUSB - software fallback)

**Core features work in all browsers, hardware integration requires Chrome/Edge.**

## Data Security

With local SQLite database storage:
- **No data transmission**: Information never leaves your local machine
- **User controlled**: Complete ownership of business data in `/data/stocksage.db`
- **Privacy by design**: No external analytics or tracking
- **Easy backups**: Simply copy the database file for backups
- **File-based**: Database can be moved, copied, or restored easily

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Commit with descriptive messages: `git commit -m "feat: add new feature"`
5. Push to your fork: `git push origin feature-name`
6. Create a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For questions, issues, or feature requests:
- Open an issue on GitHub
- Check existing documentation
- Review the code comments for implementation details

---

**StockSage** - Simple, powerful, offline inventory management for modern businesses.
