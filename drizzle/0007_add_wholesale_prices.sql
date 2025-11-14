-- Add semi_wholesale_price and wholesale_price columns to products table
ALTER TABLE products ADD COLUMN semi_wholesale_price REAL;
ALTER TABLE products ADD COLUMN wholesale_price REAL;
