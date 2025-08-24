// Simple test script to verify SQLite database integration
import Database from 'better-sqlite3';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing SQLite Database Integration...\n');

// Test 1: Check if database file exists
const dbPath = join(__dirname, 'data', 'stocksage.db');
console.log('1. Database file path:', dbPath);

try {
  const db = Database(dbPath);
  console.log('✅ Database connection successful');
  
  // Test 2: Check if tables exist
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('2. Tables found:', tables.map(t => t.name));
  
  // Test 3: Insert a test product
  try {
    const insertProduct = db.prepare(`
      INSERT INTO products (name, barcode, cost_price, selling_price, quantity, active)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = insertProduct.run('Test Product', 'TEST123', 10.0, 15.0, 100, 1);
    console.log('✅ Test product inserted, ID:', result.lastInsertRowid);
    
    // Test 4: Query the test product
    const selectProduct = db.prepare('SELECT * FROM products WHERE barcode = ?');
    const product = selectProduct.get('TEST123');
    console.log('✅ Test product retrieved:', product);
    
    // Test 5: Clean up test data
    const deleteProduct = db.prepare('DELETE FROM products WHERE barcode = ?');
    deleteProduct.run('TEST123');
    console.log('✅ Test product cleaned up');
    
  } catch (error) {
    console.log('❌ Product operations failed:', error.message);
  }
  
  db.close();
  console.log('\n🎉 Database integration test completed successfully!');
  
} catch (error) {
  console.log('❌ Database connection failed:', error.message);
  console.log('\n💡 Make sure to run: npm run db:init');
}
