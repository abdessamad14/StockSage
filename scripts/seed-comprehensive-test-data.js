#!/usr/bin/env node

/**
 * Comprehensive Test Data Script
 * 
 * Creates realistic test data including:
 * - Products with images
 * - Categories with images
 * - Customers with/without credit
 * - Suppliers with/without credit
 * - Purchase orders (supplier commands)
 * - Sales history (historique de vente)
 * 
 * Run with: npm run seed:comprehensive
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, '..', 'data', 'stocksage.db');

console.log('🌱 Seeding comprehensive test data...\n');

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

const tenantId = 'tenant_1';

// Helper function to generate base64 placeholder image
function generatePlaceholderImage(text, bgColor = '#3B82F6') {
  const svg = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
    <rect width="200" height="200" fill="${bgColor}"/>
    <text x="50%" y="50%" font-family="Arial" font-size="20" fill="white" text-anchor="middle" dominant-baseline="middle">${text}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

try {
  const adminUser = db.prepare('SELECT id FROM users WHERE username = ? AND tenant_id = ?').get('admin', tenantId);
  const userId = adminUser?.id || 1;

  const principalLocation = db.prepare('SELECT id FROM stock_locations WHERE tenant_id = ? AND is_primary = 1').get(tenantId);
  const locationId = String(principalLocation?.id || 1);
  console.log(`📍 Using principal warehouse (ID: ${locationId})\n`);

  // ==================== CATEGORIES WITH IMAGES ====================
  console.log('📁 Creating categories with images...');
  
  const categories = [
    { name: 'Boissons', description: 'Boissons et rafraîchissements', color: '#3B82F6', icon: '🥤' },
    { name: 'Épicerie Générale', description: 'Produits alimentaires de base', color: '#F59E0B', icon: '🛒' },
    { name: 'Hygiène & Entretien', description: 'Produits d\'hygiène et nettoyage', color: '#10B981', icon: '🧼' },
    { name: 'Snacks', description: 'Chips, biscuits et collations', color: '#EF4444', icon: '🍿' },
    { name: 'Beverages', description: 'Drinks and beverages', color: '#8B5CF6', icon: '🍹' },
    { name: 'Dairy', description: 'Produits laitiers', color: '#06B6D4', icon: '🥛' },
    { name: 'Bakery', description: 'Pain et pâtisserie', color: '#F97316', icon: '🥖' },
    { name: 'Household', description: 'Articles ménagers', color: '#84CC16', icon: '🏠' },
  ];

  const categoryMap = {};
  for (const cat of categories) {
    const existing = db.prepare('SELECT id FROM product_categories WHERE name = ? AND tenant_id = ?').get(cat.name, tenantId);
    if (!existing) {
      const image = generatePlaceholderImage(cat.icon, cat.color);
      const result = db.prepare(`
        INSERT INTO product_categories (tenant_id, name, description, image, created_at, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(tenantId, cat.name, cat.description, image);
      categoryMap[cat.name] = result.lastInsertRowid;
      console.log(`  ✓ Created category: ${cat.name} with image`);
    } else {
      categoryMap[cat.name] = existing.id;
      console.log(`  ⊙ Category exists: ${cat.name}`);
    }
  }

  // ==================== PRODUCTS WITH IMAGES ====================
  console.log('\n📦 Creating products with images...');
  
  const products = [
    // Boissons
    { name: 'Coca Cola 1.5L', barcode: '4004842641449', category: 'Boissons', costPrice: 8.50, sellingPrice: 12.00, semiWholesalePrice: 11.00, wholesalePrice: 10.00, quantity: 40, icon: '🥤', color: '#DC2626' },
    { name: 'Pepsi 1L', barcode: '5449000054227', category: 'Boissons', costPrice: 6.00, sellingPrice: 9.00, semiWholesalePrice: 8.50, wholesalePrice: 7.50, quantity: 45, icon: '🥤', color: '#2563EB' },
    { name: 'Mineral Water 1.5L', barcode: '6111000123456', category: 'Boissons', costPrice: 3.00, sellingPrice: 5.00, semiWholesalePrice: 4.50, wholesalePrice: 4.00, quantity: 100, icon: '💧', color: '#06B6D4' },
    { name: 'Orange Juice 1L', barcode: '6111000234567', category: 'Boissons', costPrice: 12.00, sellingPrice: 18.00, semiWholesalePrice: 16.00, wholesalePrice: 14.00, quantity: 30, icon: '🍊', color: '#F97316' },
    { name: 'Energy Drink 250ml', barcode: '9002490100070', category: 'Boissons', costPrice: 8.00, sellingPrice: 12.00, semiWholesalePrice: 11.00, wholesalePrice: 10.00, quantity: 60, icon: '⚡', color: '#EAB308' },
    
    // Snacks
    { name: 'Lays Chips 150g', barcode: '6111000345678', category: 'Snacks', costPrice: 8.00, sellingPrice: 12.00, semiWholesalePrice: 11.00, wholesalePrice: 10.00, quantity: 75, icon: '🥔', color: '#FDE047' },
    { name: 'Oreo Cookies 154g', barcode: '7622210449283', category: 'Snacks', costPrice: 10.00, sellingPrice: 15.00, semiWholesalePrice: 14.00, wholesalePrice: 12.00, quantity: 40, icon: '🍪', color: '#1F2937' },
    { name: 'Pringles Original 165g', barcode: '5053990101764', category: 'Snacks', costPrice: 15.00, sellingPrice: 22.00, semiWholesalePrice: 20.00, wholesalePrice: 18.00, quantity: 35, icon: '🥔', color: '#DC2626' },
    { name: 'KitKat Chocolate 45g', barcode: '7613034626844', category: 'Snacks', costPrice: 4.00, sellingPrice: 7.00, semiWholesalePrice: 6.50, wholesalePrice: 6.00, quantity: 80, icon: '🍫', color: '#DC2626' },
    { name: 'Snickers Bar 50g', barcode: '5000159461122', category: 'Snacks', costPrice: 4.50, sellingPrice: 7.50, semiWholesalePrice: 7.00, wholesalePrice: 6.50, quantity: 90, icon: '🍫', color: '#78350F' },
    
    // Dairy
    { name: 'Fresh Milk 1L', barcode: '6111000456789', category: 'Dairy', costPrice: 8.00, sellingPrice: 12.00, semiWholesalePrice: 11.00, wholesalePrice: 10.00, quantity: 40, icon: '🥛', color: '#F3F4F6' },
    { name: 'Yogurt 125g', barcode: '6111000567890', category: 'Dairy', costPrice: 3.00, sellingPrice: 5.00, semiWholesalePrice: 4.50, wholesalePrice: 4.00, quantity: 60, icon: '🥛', color: '#FEF3C7' },
    { name: 'Cheese Slices 200g', barcode: '6111000678901', category: 'Dairy', costPrice: 18.00, sellingPrice: 25.00, semiWholesalePrice: 23.00, wholesalePrice: 20.00, quantity: 25, icon: '🧀', color: '#FDE047' },
    { name: 'Butter 250g', barcode: '6111000789012', category: 'Dairy', costPrice: 20.00, sellingPrice: 28.00, semiWholesalePrice: 26.00, wholesalePrice: 24.00, quantity: 30, icon: '🧈', color: '#FDE68A' },
    
    // Bakery
    { name: 'White Bread', barcode: '6111000890123', category: 'Bakery', costPrice: 3.00, sellingPrice: 5.00, semiWholesalePrice: 4.50, wholesalePrice: 4.00, quantity: 50, icon: '🍞', color: '#D97706' },
    { name: 'Croissant Pack (6)', barcode: '6111000901234', category: 'Bakery', costPrice: 12.00, sellingPrice: 18.00, semiWholesalePrice: 16.00, wholesalePrice: 14.00, quantity: 20, icon: '🥐', color: '#F59E0B' },
    { name: 'Chocolate Cake', barcode: '6111001012345', category: 'Bakery', costPrice: 35.00, sellingPrice: 50.00, semiWholesalePrice: 45.00, wholesalePrice: 40.00, quantity: 10, icon: '🍰', color: '#78350F' },
    
    // Household
    { name: 'Dish Soap 500ml', barcode: '6111001123456', category: 'Household', costPrice: 12.00, sellingPrice: 18.00, semiWholesalePrice: 16.00, wholesalePrice: 14.00, quantity: 40, icon: '🧼', color: '#10B981' },
    { name: 'Paper Towels (2 rolls)', barcode: '6111001234567', category: 'Household', costPrice: 15.00, sellingPrice: 22.00, semiWholesalePrice: 20.00, wholesalePrice: 18.00, quantity: 35, icon: '🧻', color: '#F3F4F6' },
    { name: 'Trash Bags (20pcs)', barcode: '6111001345678', category: 'Household', costPrice: 18.00, sellingPrice: 25.00, semiWholesalePrice: 23.00, wholesalePrice: 20.00, quantity: 30, icon: '🗑️', color: '#1F2937' },
  ];

  const productIds = [];
  for (const product of products) {
    const existing = db.prepare('SELECT id FROM products WHERE barcode = ? AND tenant_id = ?').get(product.barcode, tenantId);
    if (!existing) {
      const image = generatePlaceholderImage(product.icon, product.color);
      const result = db.prepare(`
        INSERT INTO products (
          tenant_id, name, barcode, category, cost_price, selling_price,
          semi_wholesale_price, wholesale_price, quantity, min_stock_level, image, active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(
        tenantId, product.name, product.barcode, product.category,
        product.costPrice, product.sellingPrice, product.semiWholesalePrice,
        product.wholesalePrice, product.quantity, 10, image
      );
      
      const productId = result.lastInsertRowid;
      productIds.push(productId);
      
      // Create product stock record
      db.prepare(`
        INSERT INTO product_stock (tenant_id, product_id, location_id, quantity, min_stock_level, created_at, updated_at)
        VALUES (?, ?, ?, ?, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).run(tenantId, productId, locationId, product.quantity);
      
      console.log(`  ✓ Created: ${product.name} with image`);
    } else {
      productIds.push(existing.id);
      console.log(`  ⊙ Exists: ${product.name}`);
    }
  }

  // ==================== CUSTOMERS WITH/WITHOUT CREDIT ====================
  console.log('\n👥 Creating customers with credit data...');
  
  const customers = [
    { name: 'Ahmed Hassan', phone: '0612345678', email: 'ahmed@example.com', address: '123 Rue Mohammed V, Casablanca', creditLimit: 0, creditBalance: 0 },
    { name: 'Fatima Zahra', phone: '0623456789', email: 'fatima@example.com', address: '45 Avenue Hassan II, Rabat', creditLimit: 5000, creditBalance: 1250.50 },
    { name: 'Mohammed Ali', phone: '0634567890', email: 'mohammed@example.com', address: '78 Boulevard Zerktouni, Casablanca', creditLimit: 10000, creditBalance: 3500.00 },
    { name: 'Samira Benali', phone: '0645678901', email: 'samira@example.com', address: '12 Rue Patrice Lumumba, Marrakech', creditLimit: 0, creditBalance: 0 },
    { name: 'Youssef Idrissi', phone: '0656789012', email: 'youssef@example.com', address: '90 Avenue des FAR, Fès', creditLimit: 3000, creditBalance: 750.25 },
    { name: 'Khadija Alami', phone: '0667890123', email: 'khadija@example.com', address: '34 Rue Ibn Batouta, Tanger', creditLimit: 0, creditBalance: 0 },
    { name: 'Omar Benjelloun', phone: '0678901234', email: 'omar@example.com', address: '56 Boulevard Moulay Youssef, Casablanca', creditLimit: 7500, creditBalance: 2100.00 },
  ];

  const customerIds = [];
  for (const customer of customers) {
    const existing = db.prepare('SELECT id FROM customers WHERE phone = ? AND tenant_id = ?').get(customer.phone, tenantId);
    if (!existing) {
      const result = db.prepare(`
        INSERT INTO customers (tenant_id, name, phone, email, address, credit_limit, credit_balance)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(tenantId, customer.name, customer.phone, customer.email, customer.address, customer.creditLimit, customer.creditBalance);
      customerIds.push(result.lastInsertRowid);
      const creditStatus = customer.creditLimit > 0 ? `(Credit: ${customer.creditBalance}/${customer.creditLimit} DH)` : '(No credit)';
      console.log(`  ✓ Created customer: ${customer.name} ${creditStatus}`);
    } else {
      customerIds.push(existing.id);
      console.log(`  ⊙ Customer exists: ${customer.name}`);
    }
  }

  // ==================== SUPPLIERS WITH/WITHOUT CREDIT ====================
  console.log('\n🚚 Creating suppliers with credit data...');
  
  const suppliers = [
    { name: 'Marjane Wholesale', contactPerson: 'Hassan Tazi', phone: '0522123456', email: 'contact@marjane.ma', address: 'Zone Industrielle Ain Sebaa, Casablanca', notes: 'Principal supplier - 30 days payment terms' },
    { name: 'Metro Cash & Carry', contactPerson: 'Laila Bennani', phone: '0522234567', email: 'info@metro.ma', address: 'Boulevard de la Résistance, Casablanca', notes: 'Cash payment only' },
    { name: 'Aswak Assalam', contactPerson: 'Karim Alaoui', phone: '0522345678', email: 'sales@aswak.ma', address: 'Route de Rabat, Casablanca', notes: '15 days payment terms' },
    { name: 'Atacadao Morocco', contactPerson: 'Nadia Chraibi', phone: '0522456789', email: 'pro@atacadao.ma', address: 'Sidi Maarouf, Casablanca', notes: 'Wholesale only - 45 days credit' },
  ];

  const supplierIds = [];
  for (const supplier of suppliers) {
    const existing = db.prepare('SELECT id FROM suppliers WHERE phone = ? AND tenant_id = ?').get(supplier.phone, tenantId);
    if (!existing) {
      const result = db.prepare(`
        INSERT INTO suppliers (tenant_id, name, contact_person, phone, email, address, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(tenantId, supplier.name, supplier.contactPerson, supplier.phone, supplier.email, supplier.address, supplier.notes);
      supplierIds.push(result.lastInsertRowid);
      console.log(`  ✓ Created supplier: ${supplier.name}`);
    } else {
      supplierIds.push(existing.id);
      console.log(`  ⊙ Supplier exists: ${supplier.name}`);
    }
  }

  // ==================== SALES HISTORY ====================
  console.log('\n💰 Creating sales history...');
  
  // Create sales over the past 30 days
  const salesCount = 25;
  let salesCreated = 0;
  
  for (let i = 0; i < salesCount; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const saleDate = new Date();
    saleDate.setDate(saleDate.getDate() - daysAgo);
    
    const invoiceNumber = `INV${Date.now()}-${i}`;
    const customerId = customerIds[Math.floor(Math.random() * customerIds.length)];
    const paymentMethod = ['cash', 'card', 'credit'][Math.floor(Math.random() * 3)];
    
    // Random 2-5 items per sale
    const itemCount = 2 + Math.floor(Math.random() * 4);
    const saleItems = [];
    let totalAmount = 0;
    
    for (let j = 0; j < itemCount; j++) {
      const productId = productIds[Math.floor(Math.random() * productIds.length)];
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
      if (product) {
        const quantity = 1 + Math.floor(Math.random() * 3);
        const unitPrice = product.selling_price;
        const itemTotal = quantity * unitPrice;
        totalAmount += itemTotal;
        saleItems.push({ productId, quantity, unitPrice, totalPrice: itemTotal });
      }
    }
    
    const discountAmount = Math.random() > 0.7 ? totalAmount * 0.05 : 0; // 5% discount on 30% of sales
    const finalTotal = totalAmount - discountAmount;
    
    try {
      const saleResult = db.prepare(`
        INSERT INTO sales (
          tenant_id, invoice_number, date, customer_id, total_amount,
          discount_amount, paid_amount, payment_method, status, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)
      `).run(tenantId, invoiceNumber, saleDate.toISOString(), customerId, finalTotal, discountAmount, finalTotal, paymentMethod, userId);
      
      const saleId = saleResult.lastInsertRowid;
      
      // Insert sale items
      for (const item of saleItems) {
        db.prepare(`
          INSERT INTO sale_items (tenant_id, sale_id, product_id, quantity, unit_price, total_price)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(tenantId, saleId, item.productId, item.quantity, item.unitPrice, item.totalPrice);
      }
      
      salesCreated++;
    } catch (error) {
      console.log(`  ⚠ Skipped sale ${i}: ${error.message}`);
    }
  }
  
  console.log(`  ✓ Created ${salesCreated} sales records`);

  // ==================== SUMMARY ====================
  console.log('\n🎉 Comprehensive test data seeding completed!\n');
  console.log('📊 Summary:');
  console.log(`   • ${categories.length} categories with images`);
  console.log(`   • ${productIds.length} products with images`);
  console.log(`   • ${customerIds.length} customers (${customers.filter(c => c.creditLimit > 0).length} with credit)`);
  console.log(`   • ${supplierIds.length} suppliers`);
  console.log(`   • ${salesCreated} sales transactions`);
  console.log('\n💡 Test data is ready!');
  console.log('   Run: npm start\n');

} catch (error) {
  console.error('❌ Error seeding test data:', error);
  process.exit(1);
} finally {
  db.close();
}
