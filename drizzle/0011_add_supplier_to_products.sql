-- Add supplier_id to products table for better supplier tracking
ALTER TABLE products ADD COLUMN supplier_id INTEGER;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);

