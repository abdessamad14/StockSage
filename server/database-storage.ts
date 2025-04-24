import { IStorage } from './storage';
import { db, pool } from './db';
import session from 'express-session';
import connectPg from 'connect-pg-simple';
import { eq, and, gte, lte, like, or, desc, sql } from 'drizzle-orm';
import {
  users,
  products,
  productCategories,
  customers,
  suppliers,
  sales,
  saleItems,
  orders,
  orderItems,
  inventoryAdjustments,
  inventoryAdjustmentItems,
  syncLogs,
  settings,
  User,
  Product,
  ProductCategory,
  Customer,
  Supplier,
  Sale,
  SaleItem,
  Order,
  OrderItem,
  InventoryAdjustment,
  InventoryAdjustmentItem,
  SyncLog,
  Settings,
  InsertUser,
  InsertProduct,
  InsertProductCategory,
  InsertCustomer,
  InsertSupplier,
  InsertSale,
  InsertSaleItem,
  InsertOrder,
  InsertOrderItem,
  InsertInventoryAdjustment,
  InsertInventoryAdjustmentItem,
  InsertSettings,
  SaleWithItems,
  OrderWithItems,
  ProductWithStockStatus,
  SaleItemWithProduct,
  OrderItemWithProduct
} from '@shared/schema';

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool,
      tableName: 'session', 
      createTableIfMissing: true 
    });
  }

  // User management
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    console.log(`Looking for user with username: '${username}'`);
    const [user] = await db.select().from(users).where(eq(users.username, username));
    console.log(`Result:`, user ? `Found user: ${user.username}, tenantId: ${user.tenantId}` : 'User not found');
    return user;
  }
  
  async getUsersByTenant(tenantId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.tenantId, tenantId));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    try {
      const result = await db.delete(users).where(eq(users.id, id));
      // Different PostgreSQL drivers might use different properties for affected rows count
      return (result.rowCount > 0) || (result.count > 0);
    } catch (error) {
      console.error('Error deleting user:', error);
      return false;
    }
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Product management
  async getProduct(id: number, tenantId: string): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.id, id), eq(products.tenantId, tenantId)));
    return product;
  }

  async getProductByBarcode(barcode: string, tenantId: string): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(and(eq(products.barcode, barcode), eq(products.tenantId, tenantId)));
    return product;
  }

  async getProducts(tenantId: string, options?: { search?: string, category?: string, lowStock?: boolean }): Promise<ProductWithStockStatus[]> {
    let query = db
      .select()
      .from(products)
      .where(eq(products.tenantId, tenantId));

    if (options?.search) {
      query = query.where(like(products.name, `%${options.search}%`));
    }

    if (options?.category) {
      query = query.where(eq(products.category, options.category));
    }

    if (options?.lowStock) {
      query = query.where(products.quantity, lte(products.minStockLevel));
    }

    const productsResult = await query;

    // Add stock status
    return productsResult.map(product => {
      let stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock' = 'in_stock';
      
      if (product.quantity <= 0) {
        stockStatus = 'out_of_stock';
      } else if (product.quantity <= (product.minStockLevel || 10)) {
        stockStatus = 'low_stock';
      }
      
      return {
        ...product,
        stockStatus
      };
    });
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: number, tenantId: string, updates: Partial<InsertProduct>): Promise<Product | undefined> {
    const [product] = await db
      .update(products)
      .set(updates)
      .where(and(eq(products.id, id), eq(products.tenantId, tenantId)))
      .returning();
    return product;
  }

  async deleteProduct(id: number, tenantId: string): Promise<boolean> {
    const result = await db
      .delete(products)
      .where(and(eq(products.id, id), eq(products.tenantId, tenantId)));
    return result.count > 0;
  }

  // Product Categories management
  async getProductCategory(id: number, tenantId: string): Promise<ProductCategory | undefined> {
    const [category] = await db
      .select()
      .from(productCategories)
      .where(and(eq(productCategories.id, id), eq(productCategories.tenantId, tenantId)));
    return category;
  }

  async getProductCategories(tenantId: string): Promise<ProductCategory[]> {
    return db
      .select()
      .from(productCategories)
      .where(eq(productCategories.tenantId, tenantId));
  }

  async createProductCategory(category: InsertProductCategory): Promise<ProductCategory> {
    const [newCategory] = await db.insert(productCategories).values(category).returning();
    return newCategory;
  }

  async updateProductCategory(id: number, tenantId: string, updates: Partial<InsertProductCategory>): Promise<ProductCategory | undefined> {
    const [category] = await db
      .update(productCategories)
      .set(updates)
      .where(and(eq(productCategories.id, id), eq(productCategories.tenantId, tenantId)))
      .returning();
    return category;
  }

  async deleteProductCategory(id: number, tenantId: string): Promise<boolean> {
    const result = await db
      .delete(productCategories)
      .where(and(eq(productCategories.id, id), eq(productCategories.tenantId, tenantId)));
    return result.count > 0;
  }

  // Customer management
  async getCustomer(id: number, tenantId: string): Promise<Customer | undefined> {
    const [customer] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)));
    return customer;
  }

  async getCustomers(tenantId: string, search?: string): Promise<Customer[]> {
    let query = db
      .select()
      .from(customers)
      .where(eq(customers.tenantId, tenantId));

    if (search) {
      query = query.where(
        or(
          like(customers.name, `%${search}%`),
          like(customers.phone, `%${search}%`),
          like(customers.email, `%${search}%`)
        )
      );
    }

    return query;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  }

  async updateCustomer(id: number, tenantId: string, updates: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [customer] = await db
      .update(customers)
      .set(updates)
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)))
      .returning();
    return customer;
  }

  async deleteCustomer(id: number, tenantId: string): Promise<boolean> {
    const result = await db
      .delete(customers)
      .where(and(eq(customers.id, id), eq(customers.tenantId, tenantId)));
    return result.count > 0;
  }

  // Supplier management
  async getSupplier(id: number, tenantId: string): Promise<Supplier | undefined> {
    const [supplier] = await db
      .select()
      .from(suppliers)
      .where(and(eq(suppliers.id, id), eq(suppliers.tenantId, tenantId)));
    return supplier;
  }

  async getSuppliers(tenantId: string, search?: string): Promise<Supplier[]> {
    let query = db
      .select()
      .from(suppliers)
      .where(eq(suppliers.tenantId, tenantId));

    if (search) {
      query = query.where(
        or(
          like(suppliers.name, `%${search}%`),
          like(suppliers.phone, `%${search}%`),
          like(suppliers.email, `%${search}%`)
        )
      );
    }

    return query;
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const [newSupplier] = await db.insert(suppliers).values(supplier).returning();
    return newSupplier;
  }

  async updateSupplier(id: number, tenantId: string, updates: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const [supplier] = await db
      .update(suppliers)
      .set(updates)
      .where(and(eq(suppliers.id, id), eq(suppliers.tenantId, tenantId)))
      .returning();
    return supplier;
  }

  async deleteSupplier(id: number, tenantId: string): Promise<boolean> {
    const result = await db
      .delete(suppliers)
      .where(and(eq(suppliers.id, id), eq(suppliers.tenantId, tenantId)));
    return result.count > 0;
  }

  // Sales management
  async getSale(id: number, tenantId: string): Promise<SaleWithItems | undefined> {
    // Get sale
    const [sale] = await db
      .select()
      .from(sales)
      .where(and(eq(sales.id, id), eq(sales.tenantId, tenantId)));
    
    if (!sale) return undefined;

    // Get sale items
    const items = await db
      .select()
      .from(saleItems)
      .where(and(eq(saleItems.saleId, id), eq(saleItems.tenantId, tenantId)));

    // Get customer if available
    let customer: Customer | undefined;
    if (sale.customerId) {
      const [customerRecord] = await db
        .select()
        .from(customers)
        .where(and(eq(customers.id, sale.customerId), eq(customers.tenantId, tenantId)));
      customer = customerRecord;
    }

    // Add product information to each sale item
    const itemsWithProducts: SaleItemWithProduct[] = await Promise.all(
      items.map(async (item) => {
        const [product] = await db
          .select()
          .from(products)
          .where(and(eq(products.id, item.productId), eq(products.tenantId, tenantId)));
        
        return {
          ...item,
          product
        };
      })
    );

    return {
      ...sale,
      items: itemsWithProducts,
      customer
    };
  }

  async getSales(tenantId: string, options?: { startDate?: Date, endDate?: Date, customerId?: number }): Promise<Sale[]> {
    let query = db
      .select()
      .from(sales)
      .where(eq(sales.tenantId, tenantId))
      .orderBy(desc(sales.date));

    if (options?.startDate) {
      query = query.where(gte(sales.date, options.startDate));
    }

    if (options?.endDate) {
      query = query.where(lte(sales.date, options.endDate));
    }

    if (options?.customerId) {
      query = query.where(eq(sales.customerId, options.customerId));
    }

    return query;
  }

  async createSale(sale: InsertSale, items: InsertSaleItem[]): Promise<SaleWithItems> {
    // Start transaction
    return await db.transaction(async (tx) => {
      // Insert sale
      const [newSale] = await tx.insert(sales).values(sale).returning();

      // Insert sale items and update product quantities
      const saleItemsWithProducts: SaleItemWithProduct[] = [];
      
      for (const item of items) {
        // Insert sale item
        const [newItem] = await tx
          .insert(saleItems)
          .values({ ...item, saleId: newSale.id })
          .returning();

        // Get product
        const [product] = await tx
          .select()
          .from(products)
          .where(and(eq(products.id, item.productId), eq(products.tenantId, sale.tenantId)));

        if (product) {
          // Update product quantity
          await tx
            .update(products)
            .set({ quantity: product.quantity - item.quantity })
            .where(eq(products.id, item.productId));

          // Add product to sale item
          saleItemsWithProducts.push({
            ...newItem,
            product
          });
        } else {
          saleItemsWithProducts.push(newItem);
        }
      }

      // Update customer credit if necessary
      let customer: Customer | undefined;
      if (sale.customerId && sale.paidAmount < sale.totalAmount) {
        const [customerRecord] = await tx
          .select()
          .from(customers)
          .where(and(eq(customers.id, sale.customerId), eq(customers.tenantId, sale.tenantId)));
        
        if (customerRecord) {
          const creditUsed = sale.totalAmount - sale.paidAmount;
          const updatedCreditBalance = (customerRecord.creditBalance || 0) + creditUsed;
          
          const [updatedCustomer] = await tx
            .update(customers)
            .set({ creditBalance: updatedCreditBalance })
            .where(eq(customers.id, sale.customerId))
            .returning();
          
          customer = updatedCustomer;
        }
      } else if (sale.customerId) {
        const [customerRecord] = await tx
          .select()
          .from(customers)
          .where(and(eq(customers.id, sale.customerId), eq(customers.tenantId, sale.tenantId)));
        customer = customerRecord;
      }

      return {
        ...newSale,
        items: saleItemsWithProducts,
        customer
      };
    });
  }
  
  // Order management
  async getOrder(id: number, tenantId: string): Promise<OrderWithItems | undefined> {
    // Get order
    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)));
    
    if (!order) return undefined;

    // Get order items
    const items = await db
      .select()
      .from(orderItems)
      .where(and(eq(orderItems.orderId, id), eq(orderItems.tenantId, tenantId)));

    // Get supplier if available
    let supplier: Supplier | undefined;
    if (order.supplierId) {
      const [supplierRecord] = await db
        .select()
        .from(suppliers)
        .where(and(eq(suppliers.id, order.supplierId), eq(suppliers.tenantId, tenantId)));
      supplier = supplierRecord;
    }

    // Add product information to each order item
    const itemsWithProducts: OrderItemWithProduct[] = await Promise.all(
      items.map(async (item) => {
        const [product] = await db
          .select()
          .from(products)
          .where(and(eq(products.id, item.productId), eq(products.tenantId, tenantId)));
        
        return {
          ...item,
          product
        };
      })
    );

    return {
      ...order,
      items: itemsWithProducts,
      supplier
    };
  }

  async getOrders(tenantId: string, options?: { status?: string, supplierId?: number }): Promise<Order[]> {
    let query = db
      .select()
      .from(orders)
      .where(eq(orders.tenantId, tenantId))
      .orderBy(desc(orders.date));

    if (options?.status) {
      query = query.where(eq(orders.status, options.status));
    }

    if (options?.supplierId) {
      query = query.where(eq(orders.supplierId, options.supplierId));
    }

    return query;
  }

  async createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<OrderWithItems> {
    // Start transaction
    return await db.transaction(async (tx) => {
      // Insert order
      const [newOrder] = await tx.insert(orders).values(order).returning();

      // Insert order items
      const orderItemsWithProducts: OrderItemWithProduct[] = [];
      
      for (const item of items) {
        // Insert order item
        const [newItem] = await tx
          .insert(orderItems)
          .values({ ...item, orderId: newOrder.id })
          .returning();

        // Get product
        const [product] = await tx
          .select()
          .from(products)
          .where(and(eq(products.id, item.productId), eq(products.tenantId, order.tenantId)));

        if (product) {
          // Add product to order item
          orderItemsWithProducts.push({
            ...newItem,
            product
          });
        } else {
          orderItemsWithProducts.push(newItem);
        }
      }

      // Get supplier if available
      let supplier: Supplier | undefined;
      if (order.supplierId) {
        const [supplierRecord] = await tx
          .select()
          .from(suppliers)
          .where(and(eq(suppliers.id, order.supplierId), eq(suppliers.tenantId, order.tenantId)));
        supplier = supplierRecord;
      }

      return {
        ...newOrder,
        items: orderItemsWithProducts,
        supplier
      };
    });
  }

  async updateOrderStatus(id: number, tenantId: string, status: string): Promise<Order | undefined> {
    return await db.transaction(async (tx) => {
      // Update order status
      const [updatedOrder] = await tx
        .update(orders)
        .set({ status })
        .where(and(eq(orders.id, id), eq(orders.tenantId, tenantId)))
        .returning();
      
      if (!updatedOrder) return undefined;

      // If status is 'received', update product quantities
      if (status === 'received') {
        const items = await tx
          .select()
          .from(orderItems)
          .where(and(eq(orderItems.orderId, id), eq(orderItems.tenantId, tenantId)));

        for (const item of items) {
          const [product] = await tx
            .select()
            .from(products)
            .where(and(eq(products.id, item.productId), eq(products.tenantId, tenantId)));

          if (product) {
            await tx
              .update(products)
              .set({ quantity: product.quantity + item.quantity })
              .where(eq(products.id, item.productId));
          }
        }
      }

      return updatedOrder;
    });
  }

  // Inventory management
  async createInventoryAdjustment(adjustment: InsertInventoryAdjustment, items: InsertInventoryAdjustmentItem[]): Promise<InventoryAdjustment> {
    // Start transaction
    return await db.transaction(async (tx) => {
      // Insert adjustment
      const [newAdjustment] = await tx.insert(inventoryAdjustments).values(adjustment).returning();

      // Insert adjustment items
      for (const item of items) {
        await tx
          .insert(inventoryAdjustmentItems)
          .values({ ...item, adjustmentId: newAdjustment.id });

        // Update product quantity
        await tx
          .update(products)
          .set({ quantity: item.quantityAfter })
          .where(eq(products.id, item.productId));
      }

      return newAdjustment;
    });
  }

  async getInventoryAdjustments(tenantId: string, options?: { startDate?: Date, endDate?: Date }): Promise<InventoryAdjustment[]> {
    let query = db
      .select()
      .from(inventoryAdjustments)
      .where(eq(inventoryAdjustments.tenantId, tenantId))
      .orderBy(desc(inventoryAdjustments.date));

    if (options?.startDate) {
      query = query.where(gte(inventoryAdjustments.date, options.startDate));
    }

    if (options?.endDate) {
      query = query.where(lte(inventoryAdjustments.date, options.endDate));
    }

    return query;
  }

  // Settings management
  async getSettings(tenantId: string): Promise<Settings | undefined> {
    const [setting] = await db
      .select()
      .from(settings)
      .where(eq(settings.tenantId, tenantId));
    return setting;
  }

  async updateSettings(tenantId: string, updates: Partial<InsertSettings>): Promise<Settings | undefined> {
    const [existingSettings] = await db
      .select()
      .from(settings)
      .where(eq(settings.tenantId, tenantId));

    if (existingSettings) {
      const [updatedSettings] = await db
        .update(settings)
        .set(updates)
        .where(eq(settings.tenantId, tenantId))
        .returning();
      return updatedSettings;
    } else {
      const [newSettings] = await db
        .insert(settings)
        .values({ ...updates, tenantId } as InsertSettings)
        .returning();
      return newSettings;
    }
  }

  // Synchronization
  async syncData(tenantId: string, userId: number, deviceId: string, entityType: string, data: any[]): Promise<boolean> {
    // Insert sync log
    await db.insert(syncLogs).values({
      tenantId,
      userId,
      deviceId,
      timestamp: new Date(),
      type: 'push',
      entityType,
      recordCount: data.length,
      status: 'success',
      errorMessage: null
    });

    return true;
  }

  async getLastSyncTimestamp(tenantId: string, deviceId: string): Promise<Date | undefined> {
    const [log] = await db
      .select()
      .from(syncLogs)
      .where(and(eq(syncLogs.tenantId, tenantId), eq(syncLogs.deviceId, deviceId)))
      .orderBy(desc(syncLogs.timestamp))
      .limit(1);
    
    return log ? new Date(log.timestamp) : undefined;
  }

  // Dashboard data
  async getDashboardData(tenantId: string): Promise<{ dailySales: number; lowStockCount: number; popularProducts: Product[]; recentActivities: any[]; }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's sales
    const todaySales = await db
      .select()
      .from(sales)
      .where(and(eq(sales.tenantId, tenantId), gte(sales.date, today)));

    const dailySales = todaySales.reduce((sum, sale) => sum + sale.totalAmount, 0);

    // Get low stock products
    const lowStockProducts = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.tenantId, tenantId),
          products.quantity <= products.minStockLevel
        )
      );

    const lowStockCount = lowStockProducts.length;

    // Get popular products (in a real implementation, this would be based on sales data)
    const popularProducts = await db
      .select()
      .from(products)
      .where(eq(products.tenantId, tenantId))
      .limit(4);

    // Get recent activities
    const recentSales = todaySales.map(sale => ({
      type: 'sale',
      id: sale.id,
      amount: sale.totalAmount,
      date: sale.date,
      description: `Vente #${sale.invoiceNumber}`
    }));

    const recentOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.tenantId, tenantId))
      .orderBy(desc(orders.date))
      .limit(2);

    const orderActivities = recentOrders.map(order => ({
      type: 'order',
      id: order.id,
      amount: order.totalAmount,
      date: order.date,
      description: `Commande #${order.orderNumber}`
    }));

    const recentAdjustments = await db
      .select()
      .from(inventoryAdjustments)
      .where(eq(inventoryAdjustments.tenantId, tenantId))
      .orderBy(desc(inventoryAdjustments.date))
      .limit(2);

    const adjustmentActivities = recentAdjustments.map(adj => ({
      type: 'adjustment',
      id: adj.id,
      date: adj.date,
      description: `Ajustement de stock: ${adj.reason}`
    }));

    const recentActivities = [...recentSales, ...orderActivities, ...adjustmentActivities]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);

    return {
      dailySales,
      lowStockCount,
      popularProducts,
      recentActivities
    };
  }
}