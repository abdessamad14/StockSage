#!/usr/bin/env node

import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync } from 'fs';

console.log('🔧 StockSage Database Repair Tool\n');

// SQLite database file path
const dataDir = join(process.cwd(), 'data');
const dbPath = join(dataDir, 'stocksage.db');

if (!existsSync(dbPath)) {
  console.error('❌ Database file not found at:', dbPath);
  console.log('💡 Run "npm run setup" first to create the database');
  process.exit(1);
}

// Create SQLite connection
const db = new Database(dbPath);

try {
  console.log('📊 Analyzing database schema...\n');
  
  // Check and fix product_categories table
  fixProductCategoriesTable();
  
  // Check and fix stock_locations table
  fixStockLocationsTable();
  
  // Check and fix purchase_orders table
  fixPurchaseOrdersTable();
  
  console.log('\n✅ Database repair completed successfully!');
  console.log('💡 Restart your application to apply changes');
  
} catch (error) {
  console.error('❌ Database repair failed:', error);
  process.exit(1);
} finally {
  db.close();
}

function tableExists(tableName) {
  const result = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?")
    .get(tableName);
  return !!result;
}

function columnExists(tableName, columnName) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  return columns.some(col => col.name === columnName);
}

function fixProductCategoriesTable() {
  console.log('🔍 Checking product_categories table...');
  
  if (!tableExists('product_categories')) {
    console.log('  ⚠️  Table does not exist, creating...');
    db.exec(`
      CREATE TABLE product_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        image TEXT,
        created_at TEXT,
        updated_at TEXT,
        parent_id INTEGER,
        active INTEGER NOT NULL DEFAULT 1
      )
    `);
    console.log('  ✅ Created product_categories table');
    return;
  }
  
  // Check for missing 'image' column
  if (!columnExists('product_categories', 'image')) {
    console.log('  ⚠️  Missing "image" column, adding...');
    db.exec('ALTER TABLE product_categories ADD COLUMN image TEXT');
    console.log('  ✅ Added image column');
  } else {
    console.log('  ✅ image column exists');
  }
  
  // Check for missing 'created_at' column
  if (!columnExists('product_categories', 'created_at')) {
    console.log('  ⚠️  Missing "created_at" column, adding...');
    db.exec('ALTER TABLE product_categories ADD COLUMN created_at TEXT');
    console.log('  ✅ Added created_at column');
  }
  
  // Check for missing 'updated_at' column
  if (!columnExists('product_categories', 'updated_at')) {
    console.log('  ⚠️  Missing "updated_at" column, adding...');
    db.exec('ALTER TABLE product_categories ADD COLUMN updated_at TEXT');
    console.log('  ✅ Added updated_at column');
  }
  
  // Check for missing 'active' column
  if (!columnExists('product_categories', 'active')) {
    console.log('  ⚠️  Missing "active" column, adding...');
    db.exec('ALTER TABLE product_categories ADD COLUMN active INTEGER NOT NULL DEFAULT 1');
    console.log('  ✅ Added active column');
  }
}

function fixStockLocationsTable() {
  console.log('\n🔍 Checking stock_locations table...');
  
  if (!tableExists('stock_locations')) {
    console.log('  ⚠️  Table does not exist, creating...');
    db.exec(`
      CREATE TABLE stock_locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        is_primary INTEGER NOT NULL DEFAULT 0,
        created_at TEXT,
        updated_at TEXT
      )
    `);
    console.log('  ✅ Created stock_locations table');
    
    // Add default location
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO stock_locations (tenant_id, name, description, is_primary, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('tenant_1', 'Magasin principal', 'Entrepôt principal', 1, now, now);
    console.log('  ✅ Added default stock location');
  } else {
    console.log('  ✅ stock_locations table exists');
  }
}

function fixPurchaseOrdersTable() {
  console.log('\n🔍 Checking purchase_orders table...');
  
  if (!tableExists('purchase_orders')) {
    console.log('  ⚠️  Table does not exist, creating...');
    db.exec(`
      CREATE TABLE purchase_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tenant_id TEXT NOT NULL,
        order_number TEXT NOT NULL,
        supplier_id INTEGER NOT NULL,
        order_date TEXT NOT NULL,
        expected_date TEXT,
        received_date TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        subtotal REAL NOT NULL DEFAULT 0,
        tax_amount REAL NOT NULL DEFAULT 0,
        total_amount REAL NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TEXT,
        updated_at TEXT,
        payment_method TEXT,
        payment_status TEXT,
        paid_amount REAL DEFAULT 0,
        due_amount REAL DEFAULT 0,
        payment_date TEXT,
        check_number TEXT,
        check_image TEXT,
        check_due_date TEXT
      )
    `);
    console.log('  ✅ Created purchase_orders table');
    
    // Create purchase_order_items table
    db.exec(`
      CREATE TABLE purchase_order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        unit_cost REAL NOT NULL,
        total_cost REAL NOT NULL,
        received_quantity INTEGER DEFAULT 0,
        FOREIGN KEY (order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);
    console.log('  ✅ Created purchase_order_items table');
  } else {
    console.log('  ✅ purchase_orders table exists');
    
    // Check for missing 'order_date' column (might be named differently)
    if (!columnExists('purchase_orders', 'order_date')) {
      console.log('  ⚠️  Missing "order_date" column, adding...');
      db.exec('ALTER TABLE purchase_orders ADD COLUMN order_date TEXT NOT NULL DEFAULT ""');
      console.log('  ✅ Added order_date column');
    }
  }
}
