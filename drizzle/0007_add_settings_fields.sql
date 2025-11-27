-- Add missing settings fields for database persistence
ALTER TABLE settings ADD COLUMN low_stock_threshold INTEGER DEFAULT 10
