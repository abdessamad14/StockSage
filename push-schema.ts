import { db } from './server/db';
import * as schema from './shared/schema';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    console.log('Creating database schema...');
    
    // Create all tables directly using the SQL schema definitions
    const tablesCreation = [
      // Users table
      sql`CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        business_name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        role TEXT NOT NULL DEFAULT 'admin',
        tenant_id TEXT NOT NULL,
        profile_image TEXT,
        active BOOLEAN NOT NULL DEFAULT true
      )`,
      
      // Product Categories table
      sql`CREATE TABLE IF NOT EXISTS product_categories (
        id SERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        color TEXT DEFAULT '#A7C7E7',
        parent_id INTEGER,
        active BOOLEAN NOT NULL DEFAULT true
      )`,
      
      // Products table
      sql`CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        barcode TEXT,
        description TEXT,
        category_id INTEGER REFERENCES product_categories(id),
        cost_price DOUBLE PRECISION NOT NULL,
        selling_price DOUBLE PRECISION NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        min_stock_level INTEGER DEFAULT 10,
        unit TEXT DEFAULT 'pièce',
        image TEXT,
        active BOOLEAN NOT NULL DEFAULT true
      )`,
      
      // Customers table
      sql`CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        address TEXT,
        credit_limit DOUBLE PRECISION DEFAULT 0,
        credit_balance DOUBLE PRECISION DEFAULT 0,
        notes TEXT
      )`,
      
      // Suppliers table
      sql`CREATE TABLE IF NOT EXISTS suppliers (
        id SERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        contact_person TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        notes TEXT
      )`,
      
      // Sales table
      sql`CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        invoice_number TEXT NOT NULL,
        date TIMESTAMP NOT NULL DEFAULT NOW(),
        customer_id INTEGER REFERENCES customers(id),
        total_amount DOUBLE PRECISION NOT NULL,
        discount_amount DOUBLE PRECISION DEFAULT 0,
        tax_amount DOUBLE PRECISION DEFAULT 0,
        paid_amount DOUBLE PRECISION NOT NULL,
        change_amount DOUBLE PRECISION DEFAULT 0,
        payment_method TEXT NOT NULL DEFAULT 'cash',
        status TEXT NOT NULL DEFAULT 'completed',
        notes TEXT,
        created_by INTEGER REFERENCES users(id)
      )`,
      
      // Sale Items table
      sql`CREATE TABLE IF NOT EXISTS sale_items (
        id SERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        sale_id INTEGER NOT NULL REFERENCES sales(id),
        product_id INTEGER NOT NULL REFERENCES products(id),
        quantity INTEGER NOT NULL,
        unit_price DOUBLE PRECISION NOT NULL,
        total_price DOUBLE PRECISION NOT NULL,
        discount DOUBLE PRECISION DEFAULT 0
      )`,
      
      // Orders table
      sql`CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        order_number TEXT NOT NULL,
        date TIMESTAMP NOT NULL DEFAULT NOW(),
        supplier_id INTEGER REFERENCES suppliers(id),
        total_amount DOUBLE PRECISION NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        notes TEXT,
        created_by INTEGER REFERENCES users(id)
      )`,
      
      // Order Items table
      sql`CREATE TABLE IF NOT EXISTS order_items (
        id SERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        order_id INTEGER NOT NULL REFERENCES orders(id),
        product_id INTEGER NOT NULL REFERENCES products(id),
        quantity INTEGER NOT NULL,
        unit_price DOUBLE PRECISION NOT NULL,
        total_price DOUBLE PRECISION NOT NULL
      )`,
      
      // Inventory Adjustments table
      sql`CREATE TABLE IF NOT EXISTS inventory_adjustments (
        id SERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        date TIMESTAMP NOT NULL DEFAULT NOW(),
        type TEXT NOT NULL,
        reason TEXT NOT NULL,
        notes TEXT,
        created_by INTEGER REFERENCES users(id)
      )`,
      
      // Inventory Adjustment Items table
      sql`CREATE TABLE IF NOT EXISTS inventory_adjustment_items (
        id SERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        adjustment_id INTEGER NOT NULL REFERENCES inventory_adjustments(id),
        product_id INTEGER NOT NULL REFERENCES products(id),
        quantity_before INTEGER NOT NULL,
        quantity_after INTEGER NOT NULL,
        difference INTEGER NOT NULL
      )`,
      
      // Sync log table
      sql`CREATE TABLE IF NOT EXISTS sync_logs (
        id SERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        user_id INTEGER REFERENCES users(id),
        device_id TEXT NOT NULL,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        type TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        record_count INTEGER NOT NULL,
        status TEXT NOT NULL,
        error_message TEXT
      )`,
      
      // Settings table
      sql`CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        tenant_id TEXT NOT NULL UNIQUE,
        business_name TEXT NOT NULL,
        address TEXT,
        phone TEXT,
        email TEXT,
        tax_rate DOUBLE PRECISION DEFAULT 0,
        currency TEXT DEFAULT 'MAD',
        logo TEXT,
        receipt_header TEXT,
        receipt_footer TEXT,
        language TEXT DEFAULT 'fr',
        printer_type TEXT DEFAULT 'none',
        printer_address TEXT,
        theme TEXT DEFAULT 'light',
        sync_interval INTEGER DEFAULT 15
      )`,
      
      // Session table for connect-pg-simple
      sql`CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      )`
    ];
    
    // Execute all table creation queries
    for (const query of tablesCreation) {
      await db.execute(query);
    }
    
    console.log('Schema created successfully');
    
    // Create a default admin user for testing
    const hashedPassword = 'ba0bf74e149dede5d7d6bf21c597b94e5ca12eac4c1f7a8e461573033e2f963f.9a95a74b3d10d478';
    const userExistsResult = await db.execute(sql`SELECT COUNT(*) FROM users WHERE username = 'admin'`);
    const userExists = parseInt(userExistsResult.rows[0]?.count || '0') > 0;
    
    if (!userExists) {
      await db.execute(sql`
        INSERT INTO users (username, password, name, business_name, role, tenant_id)
        VALUES ('admin', ${hashedPassword}, 'Administrator', 'iGoodar Stock', 'admin', 'tenant_1')
      `);
      console.log('Default admin user created');
    } else {
      console.log('Default admin user already exists');
    }
    
    // Create default settings
    const settingsExistsResult = await db.execute(sql`SELECT COUNT(*) FROM settings WHERE tenant_id = 'tenant_1'`);
    const settingsExists = parseInt(settingsExistsResult.rows[0]?.count || '0') > 0;
    
    if (!settingsExists) {
      await db.execute(sql`
        INSERT INTO settings (tenant_id, business_name, receipt_footer, language, currency)
        VALUES ('tenant_1', 'iGoodar Stock', 'Merci pour votre achat / شكرا لشرائكم', 'fr', 'MAD')
      `);
      console.log('Default settings created');
    } else {
      console.log('Default settings already exist');
    }
    
    console.log('Database setup completed successfully');
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

main();