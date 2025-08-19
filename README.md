# StockSage

A comprehensive offline-first inventory and point-of-sale (POS) system designed for small businesses, featuring complete stock management with detailed transaction history and multi-warehouse support.

## Features

- **Offline-first architecture**: Fully functional without internet connection using browser localStorage
- **Complete inventory management**: Multi-warehouse stock tracking with detailed transaction history
- **Point of Sale (POS)**: Fast checkout with automatic stock updates and receipt generation
- **Purchase order management**: Full supplier ordering workflow with receiving and payment tracking
- **Stock transaction history**: Complete audit trail for all stock movements (sales, purchases, adjustments, transfers)
- **Inventory counting**: Physical count reconciliation with variance tracking and automated adjustments
- **Supplier & customer management**: Complete contact and transaction history
- **Warehouse filtering**: View stock and history by specific locations or across all warehouses
- **Real-time stock updates**: Automatic quantity adjustments across all operations
- **Mobile-responsive design**: Works seamlessly on smartphones, tablets, and desktops
- **Barcode support**: Quick product identification and processing

## Technology Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Storage**: Browser localStorage (offline-first, no server required)
- **State Management**: Custom React hooks for offline data management
- **UI Components**: Shadcn/ui with modern design system
- **Build Tool**: Vite for fast development and optimized builds

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Modern web browser with localStorage support

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

3. **Start the development server**

```bash
npm run dev
```

4. **Access the application**

Open your browser and navigate to: `http://localhost:3000`

### No Setup Required

StockSage is designed to work immediately without any database setup or configuration. All data is stored locally in your browser using localStorage, making it perfect for:

- **Small businesses** needing immediate inventory management
- **Offline environments** where internet connectivity is limited
- **Demo purposes** without complex setup requirements
- **Development** with instant data persistence

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
- **Fast checkout**: Intuitive interface for quick sales processing
- **Automatic stock updates**: Quantities decrease immediately upon sale
- **Customer management**: Track customer purchases and credit
- **Receipt generation**: Professional receipts with business details

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

- `npm run dev` - Start the development server (port 3000)
- `npm run build` - Build the application for production
- `npm run start` - Run the production build
- `npm run lint` - Run TypeScript and ESLint checks

### Data Management

Since StockSage uses localStorage:
- **Data persistence**: All data survives browser restarts
- **Data isolation**: Each browser/device maintains separate data
- **No backups needed**: Data stays on the local device
- **Privacy focused**: No data transmitted to external servers

## Production Deployment

StockSage can be deployed as a static website since it requires no backend:

1. **Build the application**:
   ```bash
   npm run build
   ```

2. **Deploy the `dist/public` folder** to any static hosting service:
   - Netlify, Vercel, GitHub Pages
   - Apache, Nginx web servers
   - CDN services

3. **HTTPS recommended** for security and PWA features

## Architecture

### Offline-First Design
StockSage is built with an offline-first architecture:

- **No server dependencies**: Runs entirely in the browser
- **localStorage persistence**: All data stored locally and securely
- **Instant startup**: No network requests or database connections needed
- **Single-tenant**: Each installation is isolated and self-contained

### File Structure
```
├── client/src/
│   ├── components/     # Reusable UI components
│   ├── hooks/         # Custom React hooks for data management
│   ├── lib/           # Utility functions and offline storage
│   ├── pages/         # Main application pages
│   └── shared/        # Shared types and schemas
├── server/            # Development server (Express)
└── shared/            # Shared TypeScript interfaces
```

### Data Flow
1. **User interactions** trigger React component updates
2. **Custom hooks** manage state and call storage functions
3. **Offline storage** persists data to localStorage
4. **Transaction recording** creates audit trails for stock changes
5. **UI updates** reflect changes immediately

## Browser Compatibility

StockSage works in all modern browsers that support:
- ES2020+ JavaScript features
- localStorage API
- CSS Grid and Flexbox
- Fetch API

Tested browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Data Security

Since all data is stored locally:
- **No data transmission**: Information never leaves the device
- **User controlled**: Complete ownership of business data
- **Privacy by design**: No external analytics or tracking
- **Backup responsibility**: Users should backup their browser data if needed

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