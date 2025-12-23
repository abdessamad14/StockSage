-- Add store_credit column to customers table (separate from credit_balance)
-- credit_balance = customer owes the store (debt/pay later)
-- store_credit = store owes the customer (avoir/coupons/refunds)
ALTER TABLE customers ADD COLUMN store_credit REAL DEFAULT 0;

