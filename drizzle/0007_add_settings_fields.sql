-- Add missing settings fields for database persistence
ALTER TABLE settings ADD COLUMN low_stock_threshold INTEGER DEFAULT 10;
ALTER TABLE settings ADD COLUMN enable_notifications INTEGER DEFAULT 0;
ALTER TABLE settings ADD COLUMN enable_low_stock_alerts INTEGER DEFAULT 1;
ALTER TABLE settings ADD COLUMN enable_auto_backup INTEGER DEFAULT 0;
ALTER TABLE settings ADD COLUMN printer_connected INTEGER DEFAULT 0;
ALTER TABLE settings ADD COLUMN printer_vendor_id INTEGER;
ALTER TABLE settings ADD COLUMN printer_product_id INTEGER;
ALTER TABLE settings ADD COLUMN printer_cash_drawer INTEGER DEFAULT 0;
ALTER TABLE settings ADD COLUMN printer_buzzer INTEGER DEFAULT 0;
ALTER TABLE settings ADD COLUMN created_at TEXT DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE settings ADD COLUMN updated_at TEXT DEFAULT CURRENT_TIMESTAMP;
