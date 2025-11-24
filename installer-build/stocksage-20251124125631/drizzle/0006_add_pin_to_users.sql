-- Add PIN field to users table for POS authentication
ALTER TABLE users ADD COLUMN pin TEXT;
