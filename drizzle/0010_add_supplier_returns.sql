-- Supplier Returns table (for defective stock returns to supplier)
CREATE TABLE IF NOT EXISTS supplier_returns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  return_number TEXT NOT NULL UNIQUE,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
  supplier_name TEXT NOT NULL,
  total_amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, received, completed
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at TEXT,
  completed_at TEXT
);

-- Supplier Return Items table
CREATE TABLE IF NOT EXISTS supplier_return_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  return_id INTEGER NOT NULL REFERENCES supplier_returns(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_cost REAL NOT NULL, -- Original cost price
  total_cost REAL NOT NULL,
  reason TEXT NOT NULL, -- defective, expired, damaged, wrong_item, etc.
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indices for performance
CREATE INDEX IF NOT EXISTS idx_supplier_returns_supplier_id ON supplier_returns(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_returns_status ON supplier_returns(status);
CREATE INDEX IF NOT EXISTS idx_supplier_return_items_return_id ON supplier_return_items(return_id);
CREATE INDEX IF NOT EXISTS idx_supplier_return_items_product_id ON supplier_return_items(product_id);

