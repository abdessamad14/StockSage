#!/usr/bin/env node

import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync } from 'fs';

console.log('🔧 StockSage Database Repair Tool');
console.log('==================================');

// SQLite database file path
const dataDir = join(process.cwd(), 'data');
const dbPath = join(dataDir, 'stocksage.db');

if (!existsSync(dbPath)) {
  console.error('❌ Database file not found at:', dbPath);
  console.log('💡 Run "npm run setup" first to create the database');
  process.exit(1);
}

// Create SQLite connection
const sqlite = new Database(dbPath);

try {
  console.log('🔍 Checking database schema...');
  
  // Check if users table exists
  const usersTable = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
  if (!usersTable) {
    console.error('❌ Users table not found. Database may be corrupted.');
    process.exit(1);
  }
  
  // Check if PIN column exists
  const columns = sqlite.prepare("PRAGMA table_info(users)").all();
  const hasPinColumn = columns.some(column => column.name === 'pin');
  
  if (hasPinColumn) {
    console.log('✅ PIN column already exists in users table');
  } else {
    console.log('🔧 Adding missing PIN column to users table...');
    sqlite.prepare("ALTER TABLE users ADD COLUMN pin TEXT").run();
    console.log('✅ PIN column added successfully');
    
    // Update existing admin user with default PIN
    const adminUser = sqlite.prepare("SELECT id FROM users WHERE role = 'admin' LIMIT 1").get();
    if (adminUser) {
      sqlite.prepare("UPDATE users SET pin = '1234' WHERE id = ?").run(adminUser.id);
      console.log('✅ Updated admin user with default PIN (1234)');
    }
    
    // Add cashier user if it doesn't exist
    const cashierUser = sqlite.prepare("SELECT id FROM users WHERE username = 'cashier'").get();
    if (!cashierUser) {
      const tenantId = sqlite.prepare("SELECT tenant_id FROM users LIMIT 1").get()?.tenant_id || 'tenant_1';
      const businessName = sqlite.prepare("SELECT business_name FROM users LIMIT 1").get()?.business_name || 'StockSage Store';
      
      sqlite.prepare(`
        INSERT INTO users (username, password, pin, name, business_name, email, phone, role, tenant_id, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('cashier', 'hashed_password.salt', '5678', 'Cashier', businessName, '', '', 'cashier', tenantId, 1);
      
      console.log('✅ Created default cashier user with PIN (5678)');
    }
  }
  
  // Verify other essential columns
  const requiredColumns = ['username', 'password', 'name', 'role', 'tenant_id', 'active'];
  const missingColumns = requiredColumns.filter(col => !columns.some(column => column.name === col));
  
  if (missingColumns.length > 0) {
    console.warn('⚠️  Missing columns detected:', missingColumns.join(', '));
    console.log('💡 Consider running "npm run setup" to recreate the database with the latest schema');
  }
  
  console.log('🎉 Database repair completed successfully!');
  
} catch (error) {
  console.error('❌ Database repair failed:', error.message);
  console.log('\n💡 Troubleshooting steps:');
  console.log('1. Backup your data directory');
  console.log('2. Delete the database file: rm data/stocksage.db');
  console.log('3. Run: npm run setup');
  console.log('4. Restore your data if needed');
  process.exit(1);
} finally {
  sqlite.close();
}
