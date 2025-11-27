#!/usr/bin/env node

/**
 * Database Settings Schema Repair Script
 * Adds missing columns to the settings table for existing databases
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = join(__dirname, '..');
const dbPath = join(projectRoot, 'data', 'stocksage.db');

console.log('========================================');
console.log('   Settings Table Schema Repair');
console.log('========================================\n');

try {
  // Open database connection
  console.log(`📂 Opening database: ${dbPath}`);
  const db = new Database(dbPath);
  
  // Check if settings table exists
  const tableExists = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name='settings'
  `).get();
  
  if (!tableExists) {
    console.error('❌ Settings table does not exist!');
    console.log('\nPlease run: npm run setup');
    process.exit(1);
  }
  
  console.log('✅ Settings table found\n');
  
  // Get current table schema
  console.log('📋 Checking current table structure...');
  const tableInfo = db.prepare('PRAGMA table_info(settings)').all();
  const existingColumns = tableInfo.map(col => col.name);
  
  console.log('   Current columns:', existingColumns.join(', '));
  
  // Define columns that should exist
  const requiredColumns = [
    { name: 'low_stock_threshold', type: 'INTEGER', defaultValue: '10' },
    { name: 'enable_notifications', type: 'INTEGER', defaultValue: '0' },
    { name: 'enable_low_stock_alerts', type: 'INTEGER', defaultValue: '1' },
    { name: 'enable_auto_backup', type: 'INTEGER', defaultValue: '0' },
    { name: 'printer_connected', type: 'INTEGER', defaultValue: '0' },
    { name: 'printer_vendor_id', type: 'INTEGER', defaultValue: 'NULL' },
    { name: 'printer_product_id', type: 'INTEGER', defaultValue: 'NULL' },
    { name: 'printer_cash_drawer', type: 'INTEGER', defaultValue: '0' },
    { name: 'printer_buzzer', type: 'INTEGER', defaultValue: '0' },
    { name: 'created_at', type: 'TEXT', defaultValue: "datetime('now')" },
    { name: 'updated_at', type: 'TEXT', defaultValue: "datetime('now')" },
  ];
  
  // Check for missing columns
  const missingColumns = requiredColumns.filter(
    col => !existingColumns.includes(col.name)
  );
  
  if (missingColumns.length === 0) {
    console.log('\n✅ All required columns exist!');
    console.log('   No schema repair needed.');
    db.close();
    process.exit(0);
  }
  
  console.log(`\n⚠️  Found ${missingColumns.length} missing column(s):`);
  missingColumns.forEach(col => {
    console.log(`   - ${col.name} (${col.type})`);
  });
  
  // Add missing columns
  console.log('\n🔧 Adding missing columns...\n');
  
  for (const col of missingColumns) {
    try {
      const defaultClause = col.defaultValue !== 'NULL' 
        ? `DEFAULT ${col.defaultValue}` 
        : '';
      
      const sql = `ALTER TABLE settings ADD COLUMN ${col.name} ${col.type} ${defaultClause}`.trim();
      
      console.log(`   Adding: ${col.name}...`);
      db.prepare(sql).run();
      console.log(`   ✅ ${col.name} added successfully`);
    } catch (error) {
      console.error(`   ❌ Failed to add ${col.name}:`, error.message);
    }
  }
  
  // Verify the fix
  console.log('\n🔍 Verifying schema repair...');
  const updatedTableInfo = db.prepare('PRAGMA table_info(settings)').all();
  const updatedColumns = updatedTableInfo.map(col => col.name);
  
  const stillMissing = requiredColumns.filter(
    col => !updatedColumns.includes(col.name)
  );
  
  if (stillMissing.length === 0) {
    console.log('✅ All columns verified!\n');
    
    // Update existing settings records
    console.log('📝 Updating existing settings records...');
    try {
      const updateFields = missingColumns
        .filter(col => col.defaultValue !== 'NULL' && !['created_at', 'updated_at'].includes(col.name))
        .map(col => `${col.name} = ${col.defaultValue}`)
        .join(', ');
      
      if (updateFields) {
        db.prepare(`UPDATE settings SET ${updateFields}, updated_at = datetime('now')`).run();
        console.log('✅ Settings records updated\n');
      }
    } catch (error) {
      console.log('⚠️  Could not update settings records:', error.message);
      console.log('   Settings will use default values for new columns\n');
    }
    
    console.log('========================================');
    console.log('   ✅ Schema Repair Complete!');
    console.log('========================================\n');
    console.log('Your database has been successfully updated.');
    console.log('You can now start the application:\n');
    console.log('   npm start\n');
  } else {
    console.error('❌ Some columns could not be added:');
    stillMissing.forEach(col => {
      console.error(`   - ${col.name}`);
    });
    console.log('\nPlease contact support for assistance.');
    process.exit(1);
  }
  
  db.close();
  
} catch (error) {
  console.error('\n❌ Error during schema repair:', error.message);
  console.error('\nStack trace:', error.stack);
  console.log('\n========================================');
  console.log('   Troubleshooting Steps');
  console.log('========================================\n');
  console.log('1. Make sure the database exists:');
  console.log('   npm run setup\n');
  console.log('2. Check database permissions');
  console.log('3. If the problem persists, delete the database and run setup again:');
  console.log('   - Windows: del data\\stocksage.db');
  console.log('   - Mac/Linux: rm data/stocksage.db');
  console.log('   npm run setup\n');
  process.exit(1);
}
