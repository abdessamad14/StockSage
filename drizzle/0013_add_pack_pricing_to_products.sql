-- Add pack pricing fields to products table
ALTER TABLE products ADD COLUMN pack_size INTEGER DEFAULT NULL;
ALTER TABLE products ADD COLUMN pack_price REAL DEFAULT NULL;
ALTER TABLE products ADD COLUMN pack_barcode TEXT DEFAULT NULL;

