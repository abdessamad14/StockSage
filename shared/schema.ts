import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, unique, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  businessName: text("business_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  role: text("role").notNull().default("admin"), // admin, cashier, merchant, supporter, viewer
  tenantId: text("tenant_id").notNull(),
  profileImage: text("profile_image"),
  active: boolean("active").notNull().default(true),
});

// Products table
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  name: text("name").notNull(),
  barcode: text("barcode"),
  description: text("description"),
  category: text("category"),
  costPrice: doublePrecision("cost_price").notNull(),
  sellingPrice: doublePrecision("selling_price").notNull(),
  quantity: integer("quantity").notNull().default(0),
  minStockLevel: integer("min_stock_level").default(10),
  unit: text("unit").default("pièce"),
  image: text("image"),
  active: boolean("active").notNull().default(true),
});

// Customers table
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  creditLimit: doublePrecision("credit_limit").default(0),
  creditBalance: doublePrecision("credit_balance").default(0),
  notes: text("notes"),
});

// Suppliers table
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  name: text("name").notNull(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  notes: text("notes"),
});

// Sales table
export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  invoiceNumber: text("invoice_number").notNull(),
  date: timestamp("date").notNull().defaultNow(),
  customerId: integer("customer_id").references(() => customers.id),
  totalAmount: doublePrecision("total_amount").notNull(),
  discountAmount: doublePrecision("discount_amount").default(0),
  taxAmount: doublePrecision("tax_amount").default(0),
  paidAmount: doublePrecision("paid_amount").notNull(),
  changeAmount: doublePrecision("change_amount").default(0),
  paymentMethod: text("payment_method").notNull().default("cash"),
  status: text("status").notNull().default("completed"),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
});

// Sale Items table
export const saleItems = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  saleId: integer("sale_id").notNull().references(() => sales.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitPrice: doublePrecision("unit_price").notNull(),
  totalPrice: doublePrecision("total_price").notNull(),
  discount: doublePrecision("discount").default(0),
});

// Orders table
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  orderNumber: text("order_number").notNull(),
  date: timestamp("date").notNull().defaultNow(),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  totalAmount: doublePrecision("total_amount").notNull(),
  status: text("status").notNull().default("pending"), // pending, received, cancelled
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
});

// Order Items table
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitPrice: doublePrecision("unit_price").notNull(),
  totalPrice: doublePrecision("total_price").notNull(),
});

// Inventory Adjustments table
export const inventoryAdjustments = pgTable("inventory_adjustments", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  date: timestamp("date").notNull().defaultNow(),
  type: text("type").notNull(), // increase, decrease
  reason: text("reason").notNull(),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
});

// Inventory Adjustment Items table
export const inventoryAdjustmentItems = pgTable("inventory_adjustment_items", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  adjustmentId: integer("adjustment_id").notNull().references(() => inventoryAdjustments.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantityBefore: integer("quantity_before").notNull(),
  quantityAfter: integer("quantity_after").notNull(),
  difference: integer("difference").notNull(),
});

// Sync log table
export const syncLogs = pgTable("sync_logs", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  userId: integer("user_id").references(() => users.id),
  deviceId: text("device_id").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  type: text("type").notNull(), // push, pull
  entityType: text("entity_type").notNull(), // products, sales, customers, etc.
  recordCount: integer("record_count").notNull(),
  status: text("status").notNull(), // success, failed
  errorMessage: text("error_message"),
});

// Settings table
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull().unique(),
  businessName: text("business_name").notNull(),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  taxRate: doublePrecision("tax_rate").default(0),
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

// Insert schemas for each table
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
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

// Define types for insert operations
export type InsertUser = z.infer<typeof insertUserSchema>;
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

// Define types for select operations
export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type SaleItem = typeof saleItems.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type InventoryAdjustment = typeof inventoryAdjustments.$inferSelect;
export type InventoryAdjustmentItem = typeof inventoryAdjustmentItems.$inferSelect;
export type SyncLog = typeof syncLogs.$inferSelect;
export type Settings = typeof settings.$inferSelect;

// Auth schemas
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginCredentials = z.infer<typeof loginSchema>;

// Extended types with related data
export type SaleWithItems = Sale & {
  items: SaleItem[];
  customer?: Customer;
};

export type OrderWithItems = Order & {
  items: OrderItem[];
  supplier?: Supplier;
};

export type ProductWithStockStatus = Product & {
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
};

export type Role = 'admin' | 'cashier' | 'merchant' | 'supporter' | 'viewer';
