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

iGoodar Stock is designed to run seamlessly in multiple environments:

### Quick Setup (Recommended)

The unified setup script automatically detects your environment and configures everything accordingly:

```bash
# Clone the repository
git clone https://github.com/yourusername/igoodar-stock.git
cd igoodar-stock

# Run the universal setup script
./setup.sh
```

### Environment-Specific Deployment Options

#### Running in Replit

In Replit, the application is automatically configured to work within the Replit environment:

1. **Database Configuration:**
   - A PostgreSQL database is automatically configured using the DATABASE_URL secret
   - If no DATABASE_URL is found, you'll be prompted to set one up

2. **Starting the Application:**
   - Use the "Start application" workflow in Replit
   - The application will be available at the Replit URL

#### Local Docker Deployment

For a containerized development or production environment:

```bash
# Development mode with live reloading
./setup.sh docker dev

# Production mode
./setup.sh docker
```

This will:
- Build the Docker images
- Start the PostgreSQL database in a container
- Initialize the database with schema and demo data
- Start the application container
- Make the application available at http://localhost:5000

#### Manual Local Installation

For traditional local development:

1. **Prerequisites:**
   - Node.js (v18 or higher)
   - Docker and Docker Compose (recommended for database)

2. **Installation Steps:**

   ```bash
   # Clone and enter the repository
   git clone https://github.com/yourusername/igoodar-stock.git
   cd igoodar-stock
   
   # Install dependencies
   npm install
   
   # Set up the environment
   ./setup.sh
   
   # Start the development server
   npm run dev
   ```

3. **Access the application**
   
   Open your browser and navigate to: `http://localhost:5000`

### Advanced Configuration

For custom configurations, you can create a `.env` file based on the provided `.env.example`:

```
# Database connection
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/igoodar

# Session security
SESSION_SECRET=your_custom_secret_here

# Environment (development, production)
NODE_ENV=development

# Application port
PORT=5000
```

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

### Steps to Upload to GitHub

#### Option 1: From Replit

1. **Create a new repository on GitHub**
   - Go to [GitHub](https://github.com) and log in
   - Click on "New repository"
   - Name your repository (e.g., "igoodar-stock")
   - Choose public or private visibility based on your needs
   - Do not initialize with README, .gitignore, or license (we already have these)

2. **Use Replit's Git integration**
   - Click on the "Version Control" tab in the Replit sidebar (Git icon)
   - Connect your GitHub account if you haven't already
   - Select "Connect to existing GitHub repo"
   - Choose the repository you created
   - Commit all changes and push to GitHub

#### Option 2: From Local Environment

1. **Create a new repository on GitHub** (as described above)

2. **Initialize git in your local project**
   ```bash
   git init
   ```

3. **Add your files to git**
   ```bash
   git add .
   ```

4. **Create your first commit**
   ```bash
   git commit -m "Initial commit of iGoodar Stock application"
   ```

5. **Add the GitHub repository as a remote**
   ```bash
   git remote add origin https://github.com/yourusername/igoodar-stock.git
   ```

6. **Push your code to GitHub**
   ```bash
   git push -u origin main
   ```
   (Use `git push -u origin master` if your default branch is named "master")

#### Important Considerations

- Use the provided `.gitignore` file to exclude node_modules, .env, and other sensitive/large files
- Document any project changes thoroughly in the README
- Add license information if applicable
- For continuous integration, consider setting up GitHub Actions to automate testing and deployment

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