#!/usr/bin/env node

/**
 * Seed Test Data Script
 * 
 * This script populates the database with realistic test data for testing the POS and other features.
 * Run with: npm run seed:test
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '..', 'data', 'stocksage.db');

console.log('🌱 Seeding test data...\n');

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

const tenantId = 'tenant_1';

try {
  // Get the admin user ID
  const adminUser = db.prepare('SELECT id FROM users WHERE username = ? AND tenant_id = ?').get('admin', tenantId);
  const userId = adminUser?.id || 1;

  // Get the principal warehouse location
  const principalLocation = db.prepare('SELECT id FROM stock_locations WHERE tenant_id = ? AND is_primary = 1').get(tenantId);
  const locationId = principalLocation?.id || 1;
  console.log(`📍 Using principal warehouse (ID: ${locationId})\n`);

  console.log('📦 Creating test products...');
  
  // Sample product categories
  const categories = [
    { name: 'Beverages', description: 'Drinks and beverages', color: '#3B82F6' },
    { name: 'Snacks', description: 'Chips, cookies, and snacks', color: '#F59E0B' },
    { name: 'Dairy', description: 'Milk, cheese, yogurt', color: '#10B981' },
    { name: 'Bakery', description: 'Bread, pastries, cakes', color: '#EF4444' },
    { name: 'Household', description: 'Cleaning and household items', color: '#8B5CF6' },
  ];

  const categoryIds = [];
  for (const cat of categories) {
    const existing = db.prepare('SELECT id FROM product_categories WHERE name = ? AND tenant_id = ?').get(cat.name, tenantId);
    if (!existing) {
      const result = db.prepare(`
        INSERT INTO product_categories (tenant_id, name, description, color, created_at, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(tenantId, cat.name, cat.description, cat.color);
      categoryIds.push(result.lastInsertRowid);
      console.log(`  ✓ Created category: ${cat.name}`);
    } else {
      categoryIds.push(existing.id);
      console.log(`  ⊙ Category exists: ${cat.name}`);
    }
  }

  // Sample products with realistic data
  const products = [
    // Beverages
    { name: 'Coca Cola 1.5L', barcode: '5449000000996', category: 'Beverages', costPrice: 8.50, sellingPrice: 12.00, quantity: 50 },
    { name: 'Pepsi 1L', barcode: '5449000054227', category: 'Beverages', costPrice: 6.00, sellingPrice: 9.00, quantity: 45 },
    { name: 'Mineral Water 1.5L', barcode: '6111000123456', category: 'Beverages', costPrice: 3.00, sellingPrice: 5.00, quantity: 100 },
    { name: 'Orange Juice 1L', barcode: '6111000234567', category: 'Beverages', costPrice: 12.00, sellingPrice: 18.00, quantity: 30 },
    { name: 'Energy Drink 250ml', barcode: '9002490100070', category: 'Beverages', costPrice: 8.00, sellingPrice: 12.00, quantity: 60 },
    
    // Snacks
    { name: 'Lays Chips 150g', barcode: '6111000345678', category: 'Snacks', costPrice: 8.00, sellingPrice: 12.00, quantity: 75 },
    { name: 'Oreo Cookies 154g', barcode: '7622210449283', category: 'Snacks', costPrice: 10.00, sellingPrice: 15.00, quantity: 40 },
    { name: 'Pringles Original 165g', barcode: '5053990101764', category: 'Snacks', costPrice: 15.00, sellingPrice: 22.00, quantity: 35 },
    { name: 'KitKat Chocolate 45g', barcode: '7613034626844', category: 'Snacks', costPrice: 4.00, sellingPrice: 7.00, quantity: 80 },
    { name: 'Snickers Bar 50g', barcode: '5000159461122', category: 'Snacks', costPrice: 4.50, sellingPrice: 7.50, quantity: 90 },
    
    // Dairy
    { name: 'Fresh Milk 1L', barcode: '6111000456789', category: 'Dairy', costPrice: 8.00, sellingPrice: 12.00, quantity: 40 },
    { name: 'Yogurt 125g', barcode: '6111000567890', category: 'Dairy', costPrice: 3.00, sellingPrice: 5.00, quantity: 60 },
    { name: 'Cheese Slices 200g', barcode: '6111000678901', category: 'Dairy', costPrice: 18.00, sellingPrice: 25.00, quantity: 25 },
    { name: 'Butter 250g', barcode: '6111000789012', category: 'Dairy', costPrice: 20.00, sellingPrice: 28.00, quantity: 30 },
    
    // Bakery
    { name: 'White Bread', barcode: '6111000890123', category: 'Bakery', costPrice: 3.00, sellingPrice: 5.00, quantity: 50 },
    { name: 'Croissant Pack (6)', barcode: '6111000901234', category: 'Bakery', costPrice: 12.00, sellingPrice: 18.00, quantity: 20 },
    { name: 'Chocolate Cake', barcode: '6111001012345', category: 'Bakery', costPrice: 35.00, sellingPrice: 50.00, quantity: 10 },
    
    // Household
    { name: 'Dish Soap 500ml', barcode: '6111001123456', category: 'Household', costPrice: 12.00, sellingPrice: 18.00, quantity: 40 },
    { name: 'Paper Towels (2 rolls)', barcode: '6111001234567', category: 'Household', costPrice: 15.00, sellingPrice: 22.00, quantity: 35 },
    { name: 'Trash Bags (20pcs)', barcode: '6111001345678', category: 'Household', costPrice: 18.00, sellingPrice: 25.00, quantity: 30 },
  ];

  let productsCreated = 0;
  for (const product of products) {
    const existing = db.prepare('SELECT id FROM products WHERE barcode = ? AND tenant_id = ?').get(product.barcode, tenantId);
    if (!existing) {
      const result = db.prepare(`
        INSERT INTO products (
          tenant_id, name, barcode, category, cost_price, selling_price, 
          quantity, min_stock_level, active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(
        tenantId,
        product.name,
        product.barcode,
        product.category,
        product.costPrice,
        product.sellingPrice,
        product.quantity,
        10 // min stock level
      );
      
      const productId = result.lastInsertRowid;
      
      // Create product stock record in principal warehouse
      db.prepare(`
        INSERT INTO product_stock (tenant_id, product_id, location_id, quantity, min_stock_level, created_at, updated_at)
        VALUES (?, ?, ?, ?, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(tenantId, productId, locationId, product.quantity);
      
      productsCreated++;
      console.log(`  ✓ Created: ${product.name} (${product.barcode})`);
    } else {
      console.log(`  ⊙ Exists: ${product.name}`);
    }
  }

  console.log(`\n✅ Created ${productsCreated} new products\n`);

  // Create test customers
  console.log('👥 Creating test customers...');
  
  const customers = [
    { name: 'Ahmed Hassan', phone: '0612345678', email: 'ahmed@example.com' },
    { name: 'Fatima Zahra', phone: '0623456789', email: 'fatima@example.com' },
    { name: 'Mohammed Ali', phone: '0634567890', email: 'mohammed@example.com' },
    { name: 'Samira Benali', phone: '0645678901', email: 'samira@example.com' },
    { name: 'Youssef Idrissi', phone: '0656789012', email: 'youssef@example.com' },
  ];

  let customersCreated = 0;
  for (const customer of customers) {
    const existing = db.prepare('SELECT id FROM customers WHERE phone = ? AND tenant_id = ?').get(customer.phone, tenantId);
    if (!existing) {
      db.prepare(`
        INSERT INTO customers (tenant_id, name, phone, email)
        VALUES (?, ?, ?, ?)
      `).run(tenantId, customer.name, customer.phone, customer.email);
      customersCreated++;
      console.log(`  ✓ Created customer: ${customer.name}`);
    } else {
      console.log(`  ⊙ Customer exists: ${customer.name}`);
    }
  }

  console.log(`\n✅ Created ${customersCreated} new customers\n`);

  // Create test suppliers
  console.log('🚚 Creating test suppliers...');
  
  const suppliers = [
    { name: 'Marjane Wholesale', phone: '0522123456', email: 'contact@marjane.ma' },
    { name: 'Metro Cash & Carry', phone: '0522234567', email: 'info@metro.ma' },
    { name: 'Aswak Assalam', phone: '0522345678', email: 'sales@aswak.ma' },
  ];

  let suppliersCreated = 0;
  for (const supplier of suppliers) {
    const existing = db.prepare('SELECT id FROM suppliers WHERE phone = ? AND tenant_id = ?').get(supplier.phone, tenantId);
    if (!existing) {
      db.prepare(`
        INSERT INTO suppliers (tenant_id, name, phone, email)
        VALUES (?, ?, ?, ?)
      `).run(tenantId, supplier.name, supplier.phone, supplier.email);
      suppliersCreated++;
      console.log(`  ✓ Created supplier: ${supplier.name}`);
    } else {
      console.log(`  ⊙ Supplier exists: ${supplier.name}`);
    }
  }

  console.log(`\n✅ Created ${suppliersCreated} new suppliers\n`);

  console.log('🎉 Test data seeding completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`   • ${productsCreated} products created`);
  console.log(`   • ${customersCreated} customers created`);
  console.log(`   • ${suppliersCreated} suppliers created`);
  console.log('\n💡 You can now test the POS with realistic data!');
  console.log('   Run: npm start\n');

} catch (error) {
  console.error('❌ Error seeding test data:', error);
  process.exit(1);
} finally {
  db.close();
}
