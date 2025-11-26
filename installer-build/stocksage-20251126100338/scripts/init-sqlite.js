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
  const migrationsPath = join(process.cwd(), 'drizzle');

  if (!existsSync(migrationsPath)) {
    console.warn(`⚠️  Migrations folder not found at ${migrationsPath}, skipping migrations`);
  } else {
    console.log('🔄 Running database migrations...');
    migrate(db, { migrationsFolder: migrationsPath });
    console.log('✅ Database migrations completed successfully');
  }
  
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

function tableExists(db, tableName) {
  const result = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?")
    .get(tableName);
  return !!result;
}

function insertRowIfColumnsExist(db, table, values) {
  if (!tableExists(db, table)) {
    console.log(`  • ${table} table not found, skipping seed`);
    return false;
  }

  const existingColumns = db.prepare(`PRAGMA table_info(${table})`).all().map(column => column.name);
  const filteredEntries = Object.entries(values).filter(([column]) => existingColumns.includes(column));

  if (filteredEntries.length === 0) {
    console.log(`  • No insertable columns for ${table}, skipping`);
    return false;
  }

  const columns = filteredEntries.map(([column]) => column).join(', ');
  const placeholders = filteredEntries.map(([column]) => `@${column}`).join(', ');
  const params = Object.fromEntries(filteredEntries);

  try {
    db.prepare(`INSERT INTO ${table} (${columns}) VALUES (${placeholders})`).run(params);
    return true;
  } catch (error) {
    console.error(`  ❌ Error inserting into ${table}:`, error.message);
    console.error(`  📝 Attempted columns:`, columns);
    console.error(`  📝 Attempted values:`, Object.keys(params).map(key => `${key}=${params[key]}`).join(', '));
    return false;
  }
}

function ensureTenantDefaults(db, config) {
  if (tableExists(db, 'tenants')) {
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
  if (!tableExists(db, 'users')) {
    console.log('  • Users table not found, skipping admin seed');
    return;
  }

  const existing = db
    .prepare('SELECT id FROM users WHERE username = ?')
    .get(config.adminUsername);

  if (existing) {
    console.log('  • Admin account already present, skipping');
    return;
  }

  const hashedPassword = hashPassword(config.adminPassword);
  const now = new Date().toISOString();

  const userColumns = db.prepare("PRAGMA table_info(users)").all();
  const hasPinColumn = userColumns.some(column => column.name === 'pin');

  const params = {
    username: config.adminUsername,
    password: hashedPassword,
    pin: config.adminPin,
    name: config.adminName,
    business_name: config.businessName,
    email: config.adminEmail,
    phone: config.businessPhone,
    role: 'admin',
    tenant_id: config.tenantId,
    profile_image: null,
    active: 1
  };

  if (!hasPinColumn) {
    delete params.pin;
  }

  const adminCreated = insertRowIfColumnsExist(db, 'users', params);
  if (adminCreated) {
    console.log(`  • Created admin user '${config.adminUsername}' (tenant ${config.tenantId})`);
  } else {
    console.warn(`  ⚠️  Failed to create admin user '${config.adminUsername}'`);
  }

  // Create default cashier user
  const cashierExists = db
    .prepare('SELECT id FROM users WHERE username = ?')
    .get('cashier');

  if (!cashierExists) {
    const cashierParams = {
      username: 'cashier',
      password: hashPassword('cashier123'),
      pin: '5678',
      name: 'Cashier',
      business_name: config.businessName,
      email: '',
      phone: '',
      role: 'cashier',
      tenant_id: config.tenantId,
      profile_image: null,
      active: 1
    };

    if (!hasPinColumn) {
      delete cashierParams.pin;
    }

    const cashierCreated = insertRowIfColumnsExist(db, 'users', cashierParams);
    if (cashierCreated) {
      console.log(`  • Created cashier user 'cashier' (PIN: 5678)`);
    } else {
      console.warn(`  ⚠️  Failed to create cashier user`);
    }
  }
}

function ensureSettings(db, config) {
  if (!tableExists(db, 'settings')) {
    console.log('  • Settings table not found, skipping default settings');
    return;
  }

  const settingsExists = db
    .prepare('SELECT id FROM settings WHERE tenant_id = ?')
    .get(config.tenantId);

  if (settingsExists) {
    return;
  }

  insertRowIfColumnsExist(db, 'settings', {
    tenant_id: config.tenantId,
    business_name: config.businessName,
    address: config.businessAddress,
    phone: config.businessPhone,
    email: config.businessEmail,
    tax_rate: 20,
    currency: config.currency,
    receipt_header: `${config.businessName} - ${config.businessAddress}`,
    receipt_footer: 'Merci de votre confiance',
    language: config.language,
    printer_type: 'none',
    printer_address: '',
    theme: 'light',
    sync_interval: 15,
    logo: ''
  });

  console.log('  • Added default business settings');
}

function ensureStockLocations(db, config) {
  if (!tableExists(db, 'stock_locations')) {
    console.log('  • Stock locations table not found, skipping default location');
    return;
  }

  const locationExists = db
    .prepare('SELECT id FROM stock_locations WHERE tenant_id = ?')
    .get(config.tenantId);

  if (locationExists) {
    return;
  }

  const now = new Date().toISOString();
  insertRowIfColumnsExist(db, 'stock_locations', {
    tenant_id: config.tenantId,
    name: 'Magasin principal',
    description: 'Entrepôt principal',
    is_primary: 1,
    created_at: now,
    updated_at: now
  });

  console.log('  • Created default stock location');
}

function ensureProductCategories(db, config) {
  if (!tableExists(db, 'product_categories')) {
    console.log('  • Product categories table not found, skipping defaults');
    return;
  }

  const result = db
    .prepare('SELECT COUNT(*) as count FROM product_categories WHERE tenant_id = ?')
    .get(config.tenantId);

  if (result && result.count > 0) {
    return;
  }

  const now = new Date().toISOString();
  const categories = [
    { name: 'Épicerie générale', description: 'Produits de base pour supérettes' },
    { name: 'Boissons', description: 'Boissons chaudes et froides' },
    { name: 'Hygiène & Entretien', description: 'Produits ménagers et hygiène' },
  ];

  for (const category of categories) {
    insertRowIfColumnsExist(db, 'product_categories', {
      tenant_id: config.tenantId,
      name: category.name,
      description: category.description,
      image: null,
      created_at: now,
      updated_at: now,
      active: 1
    });
  }

  console.log('  • Seeded default product categories');
}

function ensureWalkInCustomer(db, config) {
  if (!tableExists(db, 'customers')) {
    console.log('  • Customers table not found, skipping walk-in customer');
    return;
  }

  const existing = db
    .prepare('SELECT id FROM customers WHERE tenant_id = ? AND name = ?')
    .get(config.tenantId, 'Client comptoir');

  if (existing) {
    return;
  }

  const now = new Date().toISOString();
  insertRowIfColumnsExist(db, 'customers', {
    tenant_id: config.tenantId,
    name: 'Client comptoir',
    phone: '',
    email: '',
    address: '',
    credit_limit: 0,
    credit_balance: 0,
    notes: 'Client par défaut pour les ventes au comptoir',
    created_at: now,
    updated_at: now
  });

  console.log('  • Added default walk-in customer');
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${hash}.${salt}`;
}
