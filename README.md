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

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/stocksage.git
cd stocksage
```

2. **Install dependencies**

```bash
npm install
```

3. **Start the application**

```bash
node start.js
```

This will:
- Initialize the SQLite database automatically
- Start the backend API server (port 5003)
- Start the frontend development server (port 3001)

4. **Access the application**

Open your browser and navigate to: `http://localhost:3001`

### Simple Setup

StockSage is designed to work immediately with minimal setup. The SQLite database is automatically initialized and all services start with one command, making it perfect for:

- **Small businesses** needing immediate inventory management
- **Offline environments** where internet connectivity is limited
- **Demo purposes** with one-command deployment
- **Development** with persistent local database

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