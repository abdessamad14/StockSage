import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  businessName: text("business_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  role: text("role").notNull().default("admin"), // admin, cashier, merchant, supporter, viewer
  tenantId: text("tenant_id").notNull(),
  profileImage: text("profile_image"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

// Product Categories table
export const productCategories = sqliteTable("product_categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#A7C7E7"),
  parent_id: integer("parent_id"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

// Products table
export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").notNull(),
  name: text("name").notNull(),
  barcode: text("barcode"),
  description: text("description"),
  category: text("category"),
  costPrice: real("cost_price").notNull(),
  sellingPrice: real("selling_price").notNull(),
  quantity: integer("quantity").notNull().default(0),
  minStockLevel: integer("min_stock_level").default(10),
  unit: text("unit").default("pièce"),
  image: text("image"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

// Customers table
export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  creditLimit: real("credit_limit").default(0),
  creditBalance: real("credit_balance").default(0),
  notes: text("notes"),
});

// Suppliers table
export const suppliers = sqliteTable("suppliers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").notNull(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  notes: text("notes"),
});

// Sales table
export const sales = sqliteTable("sales", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  date: text("date").notNull().default("CURRENT_TIMESTAMP"),
  customerId: integer("customer_id").references(() => customers.id),
  totalAmount: real("total_amount").notNull(),
  discountAmount: real("discount_amount").default(0),
  taxAmount: real("tax_amount").default(0),
  paidAmount: real("paid_amount").notNull(),
  changeAmount: real("change_amount").default(0),
  paymentMethod: text("payment_method").notNull().default("cash"),
  status: text("status").notNull().default("completed"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
});

// Sale Items table
export const saleItems = sqliteTable("sale_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").notNull(),
  saleId: integer("sale_id").notNull().references(() => sales.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  totalPrice: real("total_price").notNull(),
  discount: real("discount").default(0),
});

// Orders table
export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").notNull(),
  orderNumber: text("order_number").notNull(),
  date: text("date").notNull().default("CURRENT_TIMESTAMP"),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  totalAmount: real("total_amount").notNull(),
  status: text("status").notNull().default("pending"), // pending, received, cancelled
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
});

// Order Items table
export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").notNull(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitPrice: real("unit_price").notNull(),
  totalPrice: real("total_price").notNull(),
});

// Inventory Adjustments table
export const inventoryAdjustments = sqliteTable("inventory_adjustments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").notNull(),
  date: text("date").notNull().default("CURRENT_TIMESTAMP"),
  type: text("type").notNull(), // increase, decrease
  reason: text("reason").notNull(),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
});

// Inventory Adjustment Items table
export const inventoryAdjustmentItems = sqliteTable("inventory_adjustment_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").notNull(),
  adjustmentId: integer("adjustment_id").notNull().references(() => inventoryAdjustments.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantityBefore: integer("quantity_before").notNull(),
  quantityAfter: integer("quantity_after").notNull(),
  difference: integer("difference").notNull(),
});

// Sync log table
export const syncLogs = sqliteTable("sync_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").notNull(),
  userId: integer("user_id").references(() => users.id),
  deviceId: text("device_id").notNull(),
  timestamp: text("timestamp").notNull().default("CURRENT_TIMESTAMP"),
  type: text("type").notNull(), // push, pull
  entityType: text("entity_type").notNull(), // products, sales, customers, etc.
  recordCount: integer("record_count").notNull(),
  status: text("status").notNull(), // success, failed
  errorMessage: text("error_message"),
});

// Settings table
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").notNull().unique(),
  businessName: text("business_name").notNull(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  taxRate: real("tax_rate").default(0),
  currency: text("currency").default("MAD"),
  logo: text("logo"),
  receiptHeader: text("receipt_header"),
  receiptFooter: text("receipt_footer"),
  language: text("language").default("fr"),
  printerType: text("printer_type").default("none"), // none, thermal, standard
  printerAddress: text("printer_address"),
  theme: text("theme").default("light"),
  syncInterval: integer("sync_interval").default(15), // minutes
});

// Stock Locations table
export const stockLocations = sqliteTable("stock_locations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isPrimary: integer("is_primary", { mode: "boolean" }).default(false),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
});

// Supplier Payments table
export const supplierPayments = sqliteTable("supplier_payments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").notNull(),
  supplierId: integer("supplier_id").notNull().references(() => suppliers.id),
  orderId: integer("order_id").references(() => orders.id),
  amount: real("amount").notNull(),
  paymentMethod: text("payment_method").notNull().default("cash"),
  paymentDate: text("payment_date").notNull().default("CURRENT_TIMESTAMP"),
  reference: text("reference"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
});

// Stock Transactions table
export const stockTransactions = sqliteTable("stock_transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").notNull(),
  productId: integer("product_id").notNull().references(() => products.id),
  warehouseId: text("warehouse_id").notNull().default("main"),
  type: text("type").notNull(), // purchase, sale, adjustment, transfer_in, transfer_out, entry, exit
  quantity: integer("quantity").notNull(),
  previousQuantity: integer("previous_quantity").notNull(),
  newQuantity: integer("new_quantity").notNull(),
  reason: text("reason"),
  reference: text("reference"),
  relatedId: text("related_id"),
  createdAt: text("created_at").notNull().default("(datetime('now'))"),
  createdBy: integer("created_by").references(() => users.id),
});

// Inventory Counts table
export const inventoryCounts = sqliteTable("inventory_counts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").notNull(),
  name: text("name").notNull(),
  locationId: text("location_id").notNull().default("main"),
  status: text("status").notNull().default("draft"), // draft, in_progress, completed, cancelled
  startDate: text("start_date").notNull().default("CURRENT_TIMESTAMP"),
  endDate: text("end_date"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
  createdBy: integer("created_by").references(() => users.id),
});

// Inventory Count Items table
export const inventoryCountItems = sqliteTable("inventory_count_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").notNull(),
  countId: integer("count_id").notNull().references(() => inventoryCounts.id),
  productId: integer("product_id").notNull().references(() => products.id),
  expectedQuantity: integer("expected_quantity").notNull(),
  actualQuantity: integer("actual_quantity"),
  variance: integer("variance"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
});

// Insert schemas for each table
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertProductCategorySchema = createInsertSchema(productCategories).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true });
export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true });
export const insertSaleSchema = createInsertSchema(sales).omit({ id: true });
export const insertSaleItemSchema = createInsertSchema(saleItems).omit({ id: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export const insertInventoryAdjustmentSchema = createInsertSchema(inventoryAdjustments).omit({ id: true });
export const insertInventoryAdjustmentItemSchema = createInsertSchema(inventoryAdjustmentItems).omit({ id: true });
export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true });
export const insertStockLocationSchema = createInsertSchema(stockLocations).omit({ id: true });
export const insertSupplierPaymentSchema = createInsertSchema(supplierPayments).omit({ id: true });
export const insertStockTransactionSchema = createInsertSchema(stockTransactions).omit({ id: true });
export const insertInventoryCountSchema = createInsertSchema(inventoryCounts).omit({ id: true });
export const insertInventoryCountItemSchema = createInsertSchema(inventoryCountItems).omit({ id: true });

// Define types for insert operations
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertProductCategory = z.infer<typeof insertProductCategorySchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type InsertSaleItem = z.infer<typeof insertSaleItemSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type InsertInventoryAdjustment = z.infer<typeof insertInventoryAdjustmentSchema>;
export type InsertInventoryAdjustmentItem = z.infer<typeof insertInventoryAdjustmentItemSchema>;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type InsertStockLocation = z.infer<typeof insertStockLocationSchema>;
export type InsertSupplierPayment = z.infer<typeof insertSupplierPaymentSchema>;
export type InsertStockTransaction = z.infer<typeof insertStockTransactionSchema>;
export type InsertInventoryCount = z.infer<typeof insertInventoryCountSchema>;
export type InsertInventoryCountItem = z.infer<typeof insertInventoryCountItemSchema>;

// Define types for select operations
export type User = typeof users.$inferSelect;
export type ProductCategory = typeof productCategories.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type SaleItem = typeof saleItems.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type StockLocation = typeof stockLocations.$inferSelect;
export type SupplierPayment = typeof supplierPayments.$inferSelect;
export type StockTransaction = typeof stockTransactions.$inferSelect;
export type InventoryCount = typeof inventoryCounts.$inferSelect;
export type InventoryCountItem = typeof inventoryCountItems.$inferSelect;

// Product Stock table
export const productStock = sqliteTable("product_stock", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").notNull(),
  productId: integer("product_id").notNull().references(() => products.id),
  locationId: text("location_id").notNull().default("main"),
  quantity: integer("quantity").notNull().default(0),
  minStockLevel: integer("min_stock_level").default(0),
  createdAt: text("created_at").notNull().default("CURRENT_TIMESTAMP"),
  updatedAt: text("updated_at").notNull().default("CURRENT_TIMESTAMP"),
});

// Offline types for client-side storage (keep existing interfaces)
export interface OfflineProduct {
  id: string;
  name: string;
  barcode?: string;
  description?: string;
  categoryId?: string;
  costPrice: number;
  sellingPrice: number;
  semiWholesalePrice?: number;
  wholesalePrice?: number;
  quantity: number;
  minStockLevel?: number;
  unit?: string;
  image?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineProductStock {
  productId: string;
  locationId: string;
  quantity: number;
  minStockLevel: number;
  updatedAt: string;
}

export interface OfflineInventoryCount {
  id: string;
  name: string;
  description?: string;
  type: 'full' | 'partial';
  locationId?: string;
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  createdBy: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  totalProducts: number;
  countedProducts: number;
  totalVariances: number;
  notes?: string;
}

export interface OfflineInventoryCountItem {
  id: string;
  countId: string;
  productId: string;
  expectedQuantity: number;
  actualQuantity?: number;
  variance?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfflinePurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  warehouseId: string;
  status: 'draft' | 'pending' | 'ordered' | 'received' | 'cancelled';
  orderDate: string;
  expectedDeliveryDate?: string;
  receivedDate?: string;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  paymentMethod: 'cash' | 'credit' | 'bank_check';
  paymentStatus: 'unpaid' | 'partial' | 'paid';
  paidAmount: number;
  remainingAmount: number;
  paymentDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfflinePurchaseOrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  receivedQuantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineSupplierPayment {
  id: string;
  supplierId: string;
  orderId?: string;
  amount: number;
  paymentMethod: 'cash' | 'credit' | 'bank_check';
  paymentDate: string;
  reference?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineStockTransaction {
  id: string;
  productId: string;
  warehouseId: string;
  type: 'purchase' | 'sale' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'entry' | 'exit';
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason?: string;
  reference?: string;
  relatedId?: string;
  createdAt: string;
  createdBy?: string;
}

// Extended types with related data
export type SaleItemWithProduct = SaleItem & {
  product?: OfflineProduct;
};

export type SaleWithItems = Sale & {
  items: SaleItemWithProduct[];
  customer?: Customer;
};

export type OrderItemWithProduct = OrderItem & {
  product?: OfflineProduct;
};

export type OrderWithItems = Order & {
  items: OrderItemWithProduct[];
  supplier?: Supplier;
};

export type OfflinePurchaseOrderItemWithProduct = OfflinePurchaseOrderItem & {
  product?: OfflineProduct;
};

export type OfflinePurchaseOrderWithItems = OfflinePurchaseOrder & {
  items: OfflinePurchaseOrderItemWithProduct[];
  supplier?: Supplier;
};

export type ProductWithStockStatus = OfflineProduct & {
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
};

export type Role = 'admin' | 'cashier' | 'merchant' | 'supporter' | 'viewer';

// Auth schemas
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginCredentials = z.infer<typeof loginSchema>;
