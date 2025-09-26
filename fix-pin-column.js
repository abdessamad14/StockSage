#!/usr/bin/env node

// Quick fix for missing PIN column on Windows installations
// This can be run directly: node fix-pin-column.js

import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync } from 'fs';
import { randomBytes, scryptSync } from 'crypto';

console.log('🔧 StockSage PIN Column Fix');
console.log('============================');

// SQLite database file path
const dataDir = join(process.cwd(), 'data');
const dbPath = join(dataDir, 'stocksage.db');

console.log('📂 Database path:', dbPath);

if (!existsSync(dbPath)) {
  console.error('❌ Database file not found at:', dbPath);
  console.log('💡 Run "npm run setup" first to create the database');
  process.exit(1);
}

// Create SQLite connection
const sqlite = new Database(dbPath);

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${hash}.${salt}`;
}

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
  }
  
  // Check existing users
  const existingUsers = sqlite.prepare("SELECT id, username, name, role, pin FROM users").all();
  console.log(`👥 Found ${existingUsers.length} existing users`);
  
  if (existingUsers.length === 0) {
    console.log('🔧 No users found, creating default users...');
    
    // Create admin user
    sqlite.prepare(`
      INSERT INTO users (username, password, pin, name, business_name, email, phone, role, tenant_id, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('admin', hashPassword('admin123'), '1234', 'Administrator', 'StockSage Demo Store', '', '', 'admin', 'tenant_1', 1);
    
    console.log('✅ Created admin user (PIN: 1234)');
    
    // Create cashier user
    sqlite.prepare(`
      INSERT INTO users (username, password, pin, name, business_name, email, phone, role, tenant_id, active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('cashier', hashPassword('cashier123'), '5678', 'Cashier', 'StockSage Demo Store', '', '', 'cashier', 'tenant_1', 1);
    
    console.log('✅ Created cashier user (PIN: 5678)');
    
  } else {
    // Update existing users with PINs if they don't have them
    existingUsers.forEach(user => {
      if (!user.pin) {
        const defaultPin = user.role === 'admin' ? '1234' : '5678';
        sqlite.prepare("UPDATE users SET pin = ? WHERE id = ?").run(defaultPin, user.id);
        console.log(`✅ Updated ${user.username} with default PIN (${defaultPin})`);
      } else {
        console.log(`✅ User ${user.username} already has PIN: ${user.pin}`);
      }
    });
  }
  
  // Verify final state
  const finalUsers = sqlite.prepare("SELECT id, username, name, role, pin, active FROM users").all();
  console.log('\n🎉 Final user list:');
  finalUsers.forEach(user => {
    console.log(`   - ${user.username} (${user.name}) - Role: ${user.role}, PIN: ${user.pin}, Active: ${user.active}`);
  });
  
  console.log('\n✅ PIN column fix completed successfully!');
  console.log('💡 You can now restart the application and log in with the PINs shown above.');
  
} catch (error) {
  console.error('❌ Fix failed:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
} finally {
  sqlite.close();
}
