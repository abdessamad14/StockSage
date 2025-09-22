-- Add payment and warehouse fields to orders table
ALTER TABLE orders ADD COLUMN order_date TEXT;
ALTER TABLE orders ADD COLUMN warehouse_id INTEGER;
ALTER TABLE orders ADD COLUMN payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE orders ADD COLUMN payment_method TEXT;
ALTER TABLE orders ADD COLUMN paid_amount REAL DEFAULT 0;
ALTER TABLE orders ADD COLUMN remaining_amount REAL;
ALTER TABLE orders ADD COLUMN payment_date TEXT;
