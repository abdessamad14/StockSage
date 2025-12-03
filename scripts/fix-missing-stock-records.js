import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'data', 'stocksage.db');
const db = Database(dbPath);

console.log('🔧 Fixing missing stock records...\n');

try {
  // Get all products
  const products = db.prepare('SELECT id, name, quantity FROM products').all();
  console.log(`📦 Found ${products.length} products\n`);

  // Get primary warehouse
  const primaryWarehouse = db.prepare('SELECT id FROM stock_locations WHERE is_primary = 1 LIMIT 1').get();
  const warehouseId = primaryWarehouse?.id || 1;
  console.log(`📍 Using warehouse ID: ${warehouseId}\n`);

  let fixedCount = 0;
  let alreadyExistsCount = 0;

  for (const product of products) {
    // Check if stock record exists
    const existingStock = db.prepare(`
      SELECT id FROM product_stock 
      WHERE product_id = ? AND location_id = ?
    `).get(product.id, String(warehouseId));

    if (!existingStock) {
      // Create missing stock record
      db.prepare(`
        INSERT INTO product_stock (tenant_id, product_id, location_id, quantity, min_stock_level, created_at, updated_at)
        VALUES ('default', ?, ?, ?, 0, datetime('now'), datetime('now'))
      `).run(product.id, String(warehouseId), product.quantity || 0);

      console.log(`✅ Created stock record for product ${product.id} (${product.name}) - quantity: ${product.quantity || 0}`);
      fixedCount++;
    } else {
      alreadyExistsCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Migration complete!`);
  console.log(`   - Fixed: ${fixedCount} products`);
  console.log(`   - Already existed: ${alreadyExistsCount} products`);
  console.log('='.repeat(60));

} catch (error) {
  console.error('❌ Error:', error);
  process.exit(1);
} finally {
  db.close();
}
