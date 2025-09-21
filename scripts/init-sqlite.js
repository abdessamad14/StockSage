#!/usr/bin/env node

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { randomBytes, scryptSync } from 'crypto';

const argOptions = parseArgs(process.argv.slice(2));

const config = {
  seed: argOptions.seed !== false,
  tenantId: argOptions['tenant-id'] || process.env.STOCKSAGE_TENANT_ID || 'tenant_1',
  adminUsername: argOptions['admin-user'] || process.env.STOCKSAGE_ADMIN_USER || 'admin',
  adminPassword: argOptions['admin-password'] || process.env.STOCKSAGE_ADMIN_PASSWORD || 'admin123',
  adminPin: argOptions['admin-pin'] || process.env.STOCKSAGE_ADMIN_PIN || '1234',
  adminName: argOptions['admin-name'] || process.env.STOCKSAGE_ADMIN_NAME || 'Administrator',
  adminEmail: argOptions['admin-email'] || process.env.STOCKSAGE_ADMIN_EMAIL || '',
  businessName: argOptions['business-name'] || process.env.STOCKSAGE_BUSINESS_NAME || 'StockSage Demo Store',
  businessPhone: argOptions['business-phone'] || process.env.STOCKSAGE_BUSINESS_PHONE || '+212 600000000',
  businessAddress: argOptions['business-address'] || process.env.STOCKSAGE_BUSINESS_ADDRESS || '123 Avenue Hassan II, Casablanca',
  businessEmail: argOptions['business-email'] || process.env.STOCKSAGE_BUSINESS_EMAIL || 'contact@stocksage.ma',
  currency: argOptions.currency || process.env.STOCKSAGE_CURRENCY || 'MAD',
  language: argOptions.language || process.env.STOCKSAGE_LANGUAGE || 'fr',
};

// Create data directory if it doesn't exist
const dataDir = join(process.cwd(), 'data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
  console.log('✅ Created data directory');
}

// SQLite database file path
const dbPath = join(dataDir, 'stocksage.db');

// Create SQLite connection
const sqlite = new Database(dbPath);

// Enable WAL mode for better performance
sqlite.pragma('journal_mode = WAL');

// Create drizzle instance
const db = drizzle(sqlite);

try {
  // Run migrations
  console.log('🔄 Running database migrations...');
  migrate(db, { migrationsFolder: './drizzle' });
  console.log('✅ Database migrations completed successfully');
  
  if (config.seed) {
    seedDatabase(sqlite, config);
  } else {
    console.log('ℹ️  Seeding skipped (use --seed or default behaviour to seed)');
  }

  const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log(`✅ Database initialized with ${tables.length} tables`);
} catch (error) {
  console.error('❌ Database initialization failed:', error);
  process.exit(1);
} finally {
  sqlite.close();
}

console.log('🎉 SQLite database ready at:', dbPath);

function parseArgs(rawArgs) {
  const options = {};

  for (const arg of rawArgs) {
    if (!arg.startsWith('--')) continue;

    if (arg === '--no-seed') {
      options.seed = false;
      continue;
    }

    const cleaned = arg.replace(/^--/, '');
    const [key, value] = cleaned.split('=');
    if (typeof value === 'undefined') {
      options[key] = true;
    } else {
      options[key] = value;
    }
  }

  return options;
}

function seedDatabase(db, config) {
  console.log('🌱 Seeding database with default data...');

  const seed = db.transaction(() => {
    ensureTenantDefaults(db, config);
    ensureAdminAccount(db, config);
    ensureSettings(db, config);
    ensureStockLocations(db, config);
    ensureProductCategories(db, config);
    ensureWalkInCustomer(db, config);
  });

  seed();
  console.log('✅ Default data ensured');
}

function ensureTenantDefaults(db, config) {
  const tenantsTableExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tenants'")
    .get();

  if (tenantsTableExists) {
    const tenant = db
      .prepare('SELECT id FROM tenants WHERE id = ?')
      .get(config.tenantId);

    if (!tenant) {
      const now = new Date().toISOString();
      db.prepare(`INSERT INTO tenants (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)`)
        .run(config.tenantId, config.businessName, now, now);
      console.log(`  • Created tenant record ${config.tenantId}`);
    }
  }
}

function ensureAdminAccount(db, config) {
  const existing = db
    .prepare('SELECT id FROM users WHERE username = ?')
    .get(config.adminUsername);

  if (existing) {
    console.log('  • Admin account already present, skipping');
    return;
  }

  const hashedPassword = hashPassword(config.adminPassword);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (username, password, pin, name, business_name, email, phone, role, tenant_id, profile_image, active)
    VALUES (@username, @password, @pin, @name, @businessName, @email, @phone, @role, @tenantId, @profileImage, @active)
  `).run({
    username: config.adminUsername,
    password: hashedPassword,
    pin: config.adminPin,
    name: config.adminName,
    businessName: config.businessName,
    email: config.adminEmail,
    phone: config.businessPhone,
    role: 'admin',
    tenantId: config.tenantId,
    profileImage: null,
    active: 1,
  });

  console.log(`  • Created admin user '${config.adminUsername}' (tenant ${config.tenantId})`);

  // Also ensure there is a support user if desired? keep simple.
}

function ensureSettings(db, config) {
  const settingsExists = db
    .prepare('SELECT id FROM settings WHERE tenant_id = ?')
    .get(config.tenantId);

  if (settingsExists) {
    return;
  }

  db.prepare(`
    INSERT INTO settings (
      tenant_id, business_name, address, phone, email, tax_rate, currency,
      receipt_header, receipt_footer, language, printer_type, printer_address, theme, sync_interval, logo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    config.tenantId,
    config.businessName,
    config.businessAddress,
    config.businessPhone,
    config.businessEmail,
    20,
    config.currency,
    `${config.businessName} - ${config.businessAddress}`,
    'Merci de votre confiance',
    config.language,
    'none',
    '',
    'light',
    15,
    ''
  );

  console.log('  • Added default business settings');
}

function ensureStockLocations(db, config) {
  const locationExists = db
    .prepare('SELECT id FROM stock_locations WHERE tenant_id = ?')
    .get(config.tenantId);

  if (locationExists) {
    return;
  }

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO stock_locations (tenant_id, name, description, is_primary, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(config.tenantId, 'Magasin principal', 'Entrepôt principal', 1, now, now);

  console.log('  • Created default stock location');
}

function ensureProductCategories(db, config) {
  const result = db
    .prepare('SELECT COUNT(*) as count FROM product_categories WHERE tenant_id = ?')
    .get(config.tenantId);

  if (result?.count > 0) {
    return;
  }

  const now = new Date().toISOString();
  const categories = [
    { name: 'Épicerie générale', description: 'Produits de base pour supérettes' },
    { name: 'Boissons', description: 'Boissons chaudes et froides' },
    { name: 'Hygiène & Entretien', description: 'Produits ménagers et hygiène' },
  ];

  const insert = db.prepare(`
    INSERT INTO product_categories (tenant_id, name, description, created_at, updated_at, active)
    VALUES (?, ?, ?, ?, ?, 1)
  `);

  for (const category of categories) {
    insert.run(config.tenantId, category.name, category.description, now, now);
  }

  console.log('  • Seeded default product categories');
}

function ensureWalkInCustomer(db, config) {
  const existing = db
    .prepare('SELECT id FROM customers WHERE tenant_id = ? AND name = ?')
    .get(config.tenantId, 'Client comptoir');

  if (existing) {
    return;
  }

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO customers (tenant_id, name, phone, email, address, credit_limit, credit_balance, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    config.tenantId,
    'Client comptoir',
    '',
    '',
    '',
    0,
    0,
    'Client par défaut pour les ventes au comptoir'
  );

  console.log('  • Added default walk-in customer');
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${hash}.${salt}`;
}
