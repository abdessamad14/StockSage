#!/usr/bin/env node

import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync } from 'fs';
import { randomBytes, scryptSync } from 'crypto';

console.log('🧪 Testing User Creation on Windows');
console.log('===================================');

// SQLite database file path
const dataDir = join(process.cwd(), 'data');
const dbPath = join(dataDir, 'stocksage.db');

console.log('📂 Data directory:', dataDir);
console.log('🗃️  Database path:', dbPath);

if (!existsSync(dbPath)) {
  console.error('❌ Database file not found at:', dbPath);
  console.log('💡 Run "npm run setup" first to create the database');
  process.exit(1);
}

// Create SQLite connection
const sqlite = new Database(dbPath);

try {
  console.log('🔍 Checking database connection...');
  
  // Test basic database connection
  const testQuery = sqlite.prepare("SELECT 1 as test").get();
  console.log('✅ Database connection successful:', testQuery);
  
  // Check if users table exists
  const usersTable = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").get();
  if (!usersTable) {
    console.error('❌ Users table not found');
    process.exit(1);
  }
  console.log('✅ Users table exists');
  
  // Check table structure
  const columns = sqlite.prepare("PRAGMA table_info(users)").all();
  console.log('📋 Users table columns:', columns.map(c => c.name).join(', '));
  
  // Check existing users
  const existingUsers = sqlite.prepare("SELECT id, username, name, role, pin, active FROM users").all();
  console.log('👥 Existing users:', existingUsers.length);
  existingUsers.forEach(user => {
    console.log(`   - ${user.username} (${user.name}) - Role: ${user.role}, PIN: ${user.pin}, Active: ${user.active}`);
  });
  
  // Test creating a test user if none exist
  if (existingUsers.length === 0) {
    console.log('🔧 No users found, creating test users...');
    
    function hashPassword(password) {
      const salt = randomBytes(16).toString('hex');
      const hash = scryptSync(password, salt, 64).toString('hex');
      return `${hash}.${salt}`;
    }
    
    try {
      // Create admin user
      const adminResult = sqlite.prepare(`
        INSERT INTO users (username, password, pin, name, business_name, email, phone, role, tenant_id, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('admin', hashPassword('admin123'), '1234', 'Administrator', 'StockSage Demo Store', '', '', 'admin', 'tenant_1', 1);
      
      console.log('✅ Admin user created with ID:', adminResult.lastInsertRowid);
      
      // Create cashier user
      const cashierResult = sqlite.prepare(`
        INSERT INTO users (username, password, pin, name, business_name, email, phone, role, tenant_id, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('cashier', hashPassword('cashier123'), '5678', 'Cashier', 'StockSage Demo Store', '', '', 'cashier', 'tenant_1', 1);
      
      console.log('✅ Cashier user created with ID:', cashierResult.lastInsertRowid);
      
      // Verify users were created
      const newUsers = sqlite.prepare("SELECT id, username, name, role, pin, active FROM users").all();
      console.log('🎉 Users after creation:', newUsers.length);
      newUsers.forEach(user => {
        console.log(`   - ${user.username} (${user.name}) - Role: ${user.role}, PIN: ${user.pin}, Active: ${user.active}`);
      });
      
    } catch (error) {
      console.error('❌ Error creating users:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
  
  console.log('🎉 User creation test completed successfully!');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
} finally {
  sqlite.close();
}
