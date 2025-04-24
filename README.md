# iGoodar Stock

A comprehensive inventory and point-of-sale (POS) system designed for Moroccan small businesses, with robust multi-tenant data isolation and user management capabilities.

## Features

- **Mobile-first design**: Works seamlessly on smartphones, tablets, and desktops
- **Multi-tenant architecture**: Securely isolates data between different businesses
- **Offline capability**: Continue working without internet connection
- **Inventory management**: Track stock levels, set alerts for low stock
- **Point of Sale (POS)**: Process sales quickly with an intuitive interface
- **Customer management**: Store customer details and purchase history
- **Supplier management**: Track suppliers and orders
- **User management**: Control who can access what with role-based permissions
- **Reports and analytics**: Gain insights into your business performance
- **Thermal receipt printing**: Print professional receipts
- **Barcode scanning**: Quickly add products to sales

## Technology Stack

- **Frontend**: React.js with TypeScript and Tailwind CSS
- **Backend**: Node.js with Express
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: Passport.js with session-based auth
- **State Management**: React Query, Zustand
- **UI Components**: Shadcn UI

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Docker and Docker Compose (for easy database setup)

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/igoodar-stock.git
cd igoodar-stock
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up environment variables**

Create a `.env` file in the root directory:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/igoodar
SESSION_SECRET=your_secret_key_here
```

4. **Start the PostgreSQL database using Docker**

```bash
docker-compose up -d
```

5. **Initialize the database schema**

```bash
npm run db:push
```

6. **Start the development server**

```bash
npm run dev
```

7. **Access the application**

Open your browser and navigate to: `http://localhost:5000`

### Default Login Credentials

The application comes with pre-configured users:

- **Administrator:**
  - Username: `superadmin`
  - Password: `admin123`
  - Tenant: `tenant_1`

- **Demo User:**
  - Username: `demo`
  - Password: `demo123`
  - Tenant: `demo-tenant`

## Development

### Available Commands

- `npm run dev` - Start the development server
- `npm run build` - Build the application for production
- `npm run start` - Run the application in production mode
- `npm run db:push` - Push schema changes to the database
- `npm run lint` - Run linting checks

### Docker Commands

- Start containers: `docker-compose up -d`
- Stop containers: `docker-compose down`
- View logs: `docker-compose logs postgres`
- Reset database (remove volume): `docker-compose down -v`

## Production Deployment

For production deployment, consider:

1. Setting up a proper PostgreSQL database with regular backups
2. Using environment variables for all sensitive information
3. Setting up a reverse proxy (like Nginx) in front of the application
4. Enabling HTTPS for secure connections
5. Implementing proper monitoring and logging

## GitHub Repository

It's recommended to upload this project to a GitHub repository for:

- Version control
- Collaboration with other developers
- Issue tracking
- CI/CD integration
- Documentation hosting

Make sure to:
- Add a `.gitignore` file to exclude node_modules, .env, and other sensitive/large files
- Document the project thoroughly in the README
- Add license information if applicable

## Security Considerations

1. Never commit sensitive information like passwords or API keys to the repository
2. Always use environment variables for configuration
3. Keep dependencies updated regularly to avoid security vulnerabilities
4. Implement proper input validation and sanitization
5. Use HTTPS in production environments

## License

[Add your chosen license here]

## Support

For questions or issues, please [open an issue](https://github.com/yourusername/igoodar-stock/issues) on the GitHub repository.