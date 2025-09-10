-- Add missing timestamp columns to product_categories table
ALTER TABLE product_categories ADD COLUMN created_at TEXT;
ALTER TABLE product_categories ADD COLUMN updated_at TEXT;

-- Update existing rows with current timestamp
UPDATE product_categories SET created_at = datetime('now'), updated_at = datetime('now') WHERE created_at IS NULL;
