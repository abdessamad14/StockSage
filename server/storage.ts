import { 
  users, type User, type InsertUser,
  products, type Product, type InsertProduct,
  customers, type Customer, type InsertCustomer,
  suppliers, type Supplier, type InsertSupplier,
  sales, type Sale, type InsertSale,
  saleItems, type SaleItem, type InsertSaleItem,
  orders, type Order, type InsertOrder,
  orderItems, type OrderItem, type InsertOrderItem,
  inventoryAdjustments, type InventoryAdjustment, type InsertInventoryAdjustment,
  inventoryAdjustmentItems, type InventoryAdjustmentItem, type InsertInventoryAdjustmentItem,
  syncLogs, type SyncLog,
  settings, type Settings, type InsertSettings,
  type ProductWithStockStatus, type SaleWithItems, type OrderWithItems
} from "@shared/schema";

// Interface for storage operations
export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  
  // Product management
  getProduct(id: number, tenantId: string): Promise<Product | undefined>;
  getProductByBarcode(barcode: string, tenantId: string): Promise<Product | undefined>;
  getProducts(tenantId: string, options?: { search?: string, category?: string, lowStock?: boolean }): Promise<ProductWithStockStatus[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, tenantId: string, updates: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number, tenantId: string): Promise<boolean>;
  
  // Customer management
  getCustomer(id: number, tenantId: string): Promise<Customer | undefined>;
  getCustomers(tenantId: string, search?: string): Promise<Customer[]>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, tenantId: string, updates: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: number, tenantId: string): Promise<boolean>;
  
  // Supplier management
  getSupplier(id: number, tenantId: string): Promise<Supplier | undefined>;
  getSuppliers(tenantId: string, search?: string): Promise<Supplier[]>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, tenantId: string, updates: Partial<InsertSupplier>): Promise<Supplier | undefined>;
  deleteSupplier(id: number, tenantId: string): Promise<boolean>;
  
  // Sales management
  getSale(id: number, tenantId: string): Promise<SaleWithItems | undefined>;
  getSales(tenantId: string, options?: { startDate?: Date, endDate?: Date, customerId?: number }): Promise<Sale[]>;
  createSale(sale: InsertSale, items: InsertSaleItem[]): Promise<SaleWithItems>;
  
  // Order management
  getOrder(id: number, tenantId: string): Promise<OrderWithItems | undefined>;
  getOrders(tenantId: string, options?: { status?: string, supplierId?: number }): Promise<Order[]>;
  createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<OrderWithItems>;
  updateOrderStatus(id: number, tenantId: string, status: string): Promise<Order | undefined>;
  
  // Inventory management
  createInventoryAdjustment(adjustment: InsertInventoryAdjustment, items: InsertInventoryAdjustmentItem[]): Promise<InventoryAdjustment>;
  getInventoryAdjustments(tenantId: string, options?: { startDate?: Date, endDate?: Date }): Promise<InventoryAdjustment[]>;
  
  // Settings management
  getSettings(tenantId: string): Promise<Settings | undefined>;
  updateSettings(tenantId: string, updates: Partial<InsertSettings>): Promise<Settings | undefined>;
  
  // Synchronization
  syncData(tenantId: string, userId: number, deviceId: string, entityType: string, data: any[]): Promise<boolean>;
  getLastSyncTimestamp(tenantId: string, deviceId: string): Promise<Date | undefined>;
  
  // Dashboard data
  getDashboardData(tenantId: string): Promise<{
    dailySales: number;
    lowStockCount: number;
    popularProducts: Product[];
    recentActivities: any[];
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private products: Map<number, Product>;
  private customers: Map<number, Customer>;
  private suppliers: Map<number, Supplier>;
  private sales: Map<number, Sale>;
  private saleItems: Map<number, SaleItem[]>;
  private orders: Map<number, Order>;
  private orderItems: Map<number, OrderItem[]>;
  private inventoryAdjustments: Map<number, InventoryAdjustment>;
  private inventoryAdjustmentItems: Map<number, InventoryAdjustmentItem[]>;
  private syncLogs: Map<number, SyncLog>;
  private settingsMap: Map<string, Settings>;
  
  private currentUserId: number;
  private currentProductId: number;
  private currentCustomerId: number;
  private currentSupplierId: number;
  private currentSaleId: number;
  private currentSaleItemId: number;
  private currentOrderId: number;
  private currentOrderItemId: number;
  private currentAdjustmentId: number;
  private currentAdjustmentItemId: number;
  private currentSyncLogId: number;
  private currentSettingsId: number;

  constructor() {
    this.users = new Map();
    this.products = new Map();
    this.customers = new Map();
    this.suppliers = new Map();
    this.sales = new Map();
    this.saleItems = new Map();
    this.orders = new Map();
    this.orderItems = new Map();
    this.inventoryAdjustments = new Map();
    this.inventoryAdjustmentItems = new Map();
    this.syncLogs = new Map();
    this.settingsMap = new Map();
    
    this.currentUserId = 1;
    this.currentProductId = 1;
    this.currentCustomerId = 1;
    this.currentSupplierId = 1;
    this.currentSaleId = 1;
    this.currentSaleItemId = 1;
    this.currentOrderId = 1;
    this.currentOrderItemId = 1;
    this.currentAdjustmentId = 1;
    this.currentAdjustmentItemId = 1;
    this.currentSyncLogId = 1;
    this.currentSettingsId = 1;
    
    // Add demo data
    this.initializeDemoData();
  }

  private initializeDemoData() {
    // Create a demo user
    const demoUser: InsertUser = {
      username: "demo",
      password: "demo123", // In a real app, this would be hashed
      name: "Ahmed Talbi",
      businessName: "Market Essaada",
      email: "demo@example.com",
      phone: "+212 600000000",
      role: "admin",
      tenantId: "demo-tenant",
      active: true
    };
    this.createUser(demoUser);
    
    // Create demo settings
    const demoSettings: InsertSettings = {
      tenantId: "demo-tenant",
      businessName: "Market Essaada",
      address: "123 Avenue Hassan II, Casablanca",
      phone: "+212 600000000",
      email: "contact@marketessaada.ma",
      taxRate: 20,
      currency: "MAD",
      language: "fr",
      printerType: "none",
      theme: "light",
      syncInterval: 15
    };
    this.updateSettings("demo-tenant", demoSettings);
    
    // Create demo products
    const products = [
      { name: "Lait Centrale 1L", barcode: "6001234567890", costPrice: 10, sellingPrice: 12.5, quantity: 50, category: "Laitages" },
      { name: "Pain sucré", barcode: "6001234567891", costPrice: 1.5, sellingPrice: 2.5, quantity: 8, category: "Boulangerie" },
      { name: "Coca Cola 1.5L", barcode: "6001234567892", costPrice: 12, sellingPrice: 15, quantity: 30, category: "Boissons" },
      { name: "Yaourt Jaouda", barcode: "6001234567893", costPrice: 4.5, sellingPrice: 5.75, quantity: 25, category: "Laitages" }
    ];
    
    for (const product of products) {
      this.createProduct({
        ...product,
        tenantId: "demo-tenant",
        minStockLevel: 10,
        description: "",
        unit: "pièce",
        active: true
      });
    }
    
    // Create demo customers
    const customers = [
      { name: "Mohammed Alami", phone: "+212 612345678", creditLimit: 1000, creditBalance: 0 },
      { name: "Fatima Zahra", phone: "+212 623456789", creditLimit: 500, creditBalance: 200 }
    ];
    
    for (const customer of customers) {
      this.createCustomer({
        ...customer,
        tenantId: "demo-tenant",
        email: "",
        address: "",
        notes: ""
      });
    }
    
    // Create demo suppliers
    const suppliers = [
      { name: "Distribex", contactPerson: "Omar Said", phone: "+212 678901234" },
      { name: "Centrale Laitière", contactPerson: "Hakim Tazi", phone: "+212 654321987" }
    ];
    
    for (const supplier of suppliers) {
      this.createSupplier({
        ...supplier,
        tenantId: "demo-tenant",
        email: "",
        address: "",
        notes: ""
      });
    }
  }

  // User management
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // Product management
  async getProduct(id: number, tenantId: string): Promise<Product | undefined> {
    const product = this.products.get(id);
    if (product && product.tenantId === tenantId) {
      return product;
    }
    return undefined;
  }
  
  async getProductByBarcode(barcode: string, tenantId: string): Promise<Product | undefined> {
    return Array.from(this.products.values()).find(
      (product) => product.barcode === barcode && product.tenantId === tenantId
    );
  }
  
  async getProducts(tenantId: string, options?: { search?: string; category?: string; lowStock?: boolean; }): Promise<ProductWithStockStatus[]> {
    let products = Array.from(this.products.values()).filter(
      (product) => product.tenantId === tenantId
    );
    
    if (options?.search) {
      const search = options.search.toLowerCase();
      products = products.filter(
        (product) => 
          product.name.toLowerCase().includes(search) || 
          product.barcode?.toLowerCase().includes(search) ||
          product.description?.toLowerCase().includes(search)
      );
    }
    
    if (options?.category) {
      products = products.filter(
        (product) => product.category === options.category
      );
    }
    
    if (options?.lowStock) {
      products = products.filter(
        (product) => product.quantity <= (product.minStockLevel || 0)
      );
    }
    
    return products.map(product => ({
      ...product,
      stockStatus: 
        product.quantity <= 0 ? 'out_of_stock' : 
        product.quantity <= (product.minStockLevel || 0) ? 'low_stock' : 'in_stock'
    }));
  }
  
  async createProduct(product: InsertProduct): Promise<Product> {
    const id = this.currentProductId++;
    const newProduct: Product = { ...product, id };
    this.products.set(id, newProduct);
    return newProduct;
  }
  
  async updateProduct(id: number, tenantId: string, updates: Partial<InsertProduct>): Promise<Product | undefined> {
    const product = this.products.get(id);
    if (!product || product.tenantId !== tenantId) return undefined;
    
    const updatedProduct = { ...product, ...updates };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }
  
  async deleteProduct(id: number, tenantId: string): Promise<boolean> {
    const product = this.products.get(id);
    if (!product || product.tenantId !== tenantId) return false;
    
    return this.products.delete(id);
  }
  
  // Customer management
  async getCustomer(id: number, tenantId: string): Promise<Customer | undefined> {
    const customer = this.customers.get(id);
    if (customer && customer.tenantId === tenantId) {
      return customer;
    }
    return undefined;
  }
  
  async getCustomers(tenantId: string, search?: string): Promise<Customer[]> {
    let customers = Array.from(this.customers.values()).filter(
      (customer) => customer.tenantId === tenantId
    );
    
    if (search) {
      const searchLower = search.toLowerCase();
      customers = customers.filter(
        (customer) => 
          customer.name.toLowerCase().includes(searchLower) || 
          customer.phone?.toLowerCase().includes(searchLower) ||
          customer.email?.toLowerCase().includes(searchLower)
      );
    }
    
    return customers;
  }
  
  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const id = this.currentCustomerId++;
    const newCustomer: Customer = { ...customer, id };
    this.customers.set(id, newCustomer);
    return newCustomer;
  }
  
  async updateCustomer(id: number, tenantId: string, updates: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const customer = this.customers.get(id);
    if (!customer || customer.tenantId !== tenantId) return undefined;
    
    const updatedCustomer = { ...customer, ...updates };
    this.customers.set(id, updatedCustomer);
    return updatedCustomer;
  }
  
  async deleteCustomer(id: number, tenantId: string): Promise<boolean> {
    const customer = this.customers.get(id);
    if (!customer || customer.tenantId !== tenantId) return false;
    
    return this.customers.delete(id);
  }
  
  // Supplier management
  async getSupplier(id: number, tenantId: string): Promise<Supplier | undefined> {
    const supplier = this.suppliers.get(id);
    if (supplier && supplier.tenantId === tenantId) {
      return supplier;
    }
    return undefined;
  }
  
  async getSuppliers(tenantId: string, search?: string): Promise<Supplier[]> {
    let suppliers = Array.from(this.suppliers.values()).filter(
      (supplier) => supplier.tenantId === tenantId
    );
    
    if (search) {
      const searchLower = search.toLowerCase();
      suppliers = suppliers.filter(
        (supplier) => 
          supplier.name.toLowerCase().includes(searchLower) || 
          supplier.contactPerson?.toLowerCase().includes(searchLower) ||
          supplier.phone?.toLowerCase().includes(searchLower) ||
          supplier.email?.toLowerCase().includes(searchLower)
      );
    }
    
    return suppliers;
  }
  
  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const id = this.currentSupplierId++;
    const newSupplier: Supplier = { ...supplier, id };
    this.suppliers.set(id, newSupplier);
    return newSupplier;
  }
  
  async updateSupplier(id: number, tenantId: string, updates: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const supplier = this.suppliers.get(id);
    if (!supplier || supplier.tenantId !== tenantId) return undefined;
    
    const updatedSupplier = { ...supplier, ...updates };
    this.suppliers.set(id, updatedSupplier);
    return updatedSupplier;
  }
  
  async deleteSupplier(id: number, tenantId: string): Promise<boolean> {
    const supplier = this.suppliers.get(id);
    if (!supplier || supplier.tenantId !== tenantId) return false;
    
    return this.suppliers.delete(id);
  }
  
  // Sales management
  async getSale(id: number, tenantId: string): Promise<SaleWithItems | undefined> {
    const sale = this.sales.get(id);
    if (!sale || sale.tenantId !== tenantId) return undefined;
    
    const items = this.saleItems.get(id) || [];
    let customer: Customer | undefined;
    
    if (sale.customerId) {
      customer = await this.getCustomer(sale.customerId, tenantId);
    }
    
    return {
      ...sale,
      items,
      customer
    };
  }
  
  async getSales(tenantId: string, options?: { startDate?: Date; endDate?: Date; customerId?: number; }): Promise<Sale[]> {
    let sales = Array.from(this.sales.values()).filter(
      (sale) => sale.tenantId === tenantId
    );
    
    if (options?.startDate) {
      sales = sales.filter((sale) => new Date(sale.date) >= options.startDate!);
    }
    
    if (options?.endDate) {
      sales = sales.filter((sale) => new Date(sale.date) <= options.endDate!);
    }
    
    if (options?.customerId) {
      sales = sales.filter((sale) => sale.customerId === options.customerId);
    }
    
    return sales;
  }
  
  async createSale(sale: InsertSale, items: InsertSaleItem[]): Promise<SaleWithItems> {
    const id = this.currentSaleId++;
    const newSale: Sale = { ...sale, id };
    this.sales.set(id, newSale);
    
    const saleItems: SaleItem[] = [];
    for (const item of items) {
      const itemId = this.currentSaleItemId++;
      const newItem: SaleItem = { ...item, id: itemId, saleId: id };
      saleItems.push(newItem);
      
      // Update product quantity
      const product = this.products.get(item.productId);
      if (product) {
        product.quantity -= item.quantity;
        this.products.set(product.id, product);
      }
    }
    
    this.saleItems.set(id, saleItems);
    
    let customer: Customer | undefined;
    if (sale.customerId) {
      customer = await this.getCustomer(sale.customerId, sale.tenantId);
      
      // Update customer credit balance if necessary
      if (customer && sale.paidAmount < sale.totalAmount) {
        const creditUsed = sale.totalAmount - sale.paidAmount;
        customer.creditBalance = (customer.creditBalance || 0) + creditUsed;
        this.customers.set(customer.id, customer);
      }
    }
    
    return {
      ...newSale,
      items: saleItems,
      customer
    };
  }
  
  // Order management
  async getOrder(id: number, tenantId: string): Promise<OrderWithItems | undefined> {
    const order = this.orders.get(id);
    if (!order || order.tenantId !== tenantId) return undefined;
    
    const items = this.orderItems.get(id) || [];
    let supplier: Supplier | undefined;
    
    if (order.supplierId) {
      supplier = await this.getSupplier(order.supplierId, tenantId);
    }
    
    return {
      ...order,
      items,
      supplier
    };
  }
  
  async getOrders(tenantId: string, options?: { status?: string; supplierId?: number; }): Promise<Order[]> {
    let orders = Array.from(this.orders.values()).filter(
      (order) => order.tenantId === tenantId
    );
    
    if (options?.status) {
      orders = orders.filter((order) => order.status === options.status);
    }
    
    if (options?.supplierId) {
      orders = orders.filter((order) => order.supplierId === options.supplierId);
    }
    
    return orders;
  }
  
  async createOrder(order: InsertOrder, items: InsertOrderItem[]): Promise<OrderWithItems> {
    const id = this.currentOrderId++;
    const newOrder: Order = { ...order, id };
    this.orders.set(id, newOrder);
    
    const orderItems: OrderItem[] = [];
    for (const item of items) {
      const itemId = this.currentOrderItemId++;
      const newItem: OrderItem = { ...item, id: itemId, orderId: id };
      orderItems.push(newItem);
    }
    
    this.orderItems.set(id, orderItems);
    
    let supplier: Supplier | undefined;
    if (order.supplierId) {
      supplier = await this.getSupplier(order.supplierId, order.tenantId);
    }
    
    return {
      ...newOrder,
      items: orderItems,
      supplier
    };
  }
  
  async updateOrderStatus(id: number, tenantId: string, status: string): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order || order.tenantId !== tenantId) return undefined;
    
    const updatedOrder: Order = { ...order, status };
    this.orders.set(id, updatedOrder);
    
    // If status is 'received', update product quantities
    if (status === 'received') {
      const items = this.orderItems.get(id) || [];
      for (const item of items) {
        const product = this.products.get(item.productId);
        if (product) {
          product.quantity += item.quantity;
          this.products.set(product.id, product);
        }
      }
    }
    
    return updatedOrder;
  }
  
  // Inventory management
  async createInventoryAdjustment(adjustment: InsertInventoryAdjustment, items: InsertInventoryAdjustmentItem[]): Promise<InventoryAdjustment> {
    const id = this.currentAdjustmentId++;
    const newAdjustment: InventoryAdjustment = { ...adjustment, id };
    this.inventoryAdjustments.set(id, newAdjustment);
    
    const adjustmentItems: InventoryAdjustmentItem[] = [];
    for (const item of items) {
      const itemId = this.currentAdjustmentItemId++;
      const newItem: InventoryAdjustmentItem = { ...item, id: itemId, adjustmentId: id };
      adjustmentItems.push(newItem);
      
      // Update product quantity
      const product = this.products.get(item.productId);
      if (product) {
        product.quantity = item.quantityAfter;
        this.products.set(product.id, product);
      }
    }
    
    this.inventoryAdjustmentItems.set(id, adjustmentItems);
    
    return newAdjustment;
  }
  
  async getInventoryAdjustments(tenantId: string, options?: { startDate?: Date; endDate?: Date; }): Promise<InventoryAdjustment[]> {
    let adjustments = Array.from(this.inventoryAdjustments.values()).filter(
      (adjustment) => adjustment.tenantId === tenantId
    );
    
    if (options?.startDate) {
      adjustments = adjustments.filter((adjustment) => new Date(adjustment.date) >= options.startDate!);
    }
    
    if (options?.endDate) {
      adjustments = adjustments.filter((adjustment) => new Date(adjustment.date) <= options.endDate!);
    }
    
    return adjustments;
  }
  
  // Settings management
  async getSettings(tenantId: string): Promise<Settings | undefined> {
    return this.settingsMap.get(tenantId);
  }
  
  async updateSettings(tenantId: string, updates: Partial<InsertSettings>): Promise<Settings | undefined> {
    const existingSettings = this.settingsMap.get(tenantId);
    
    if (existingSettings) {
      const updatedSettings: Settings = { ...existingSettings, ...updates };
      this.settingsMap.set(tenantId, updatedSettings);
      return updatedSettings;
    } else {
      const id = this.currentSettingsId++;
      const newSettings: Settings = { id, tenantId, ...updates as InsertSettings };
      this.settingsMap.set(tenantId, newSettings);
      return newSettings;
    }
  }
  
  // Synchronization
  async syncData(tenantId: string, userId: number, deviceId: string, entityType: string, data: any[]): Promise<boolean> {
    const id = this.currentSyncLogId++;
    
    // Log the sync operation
    const syncLog: SyncLog = {
      id,
      tenantId,
      userId,
      deviceId,
      timestamp: new Date(),
      type: 'push',
      entityType,
      recordCount: data.length,
      status: 'success',
      errorMessage: null
    };
    
    this.syncLogs.set(id, syncLog);
    
    return true;
  }
  
  async getLastSyncTimestamp(tenantId: string, deviceId: string): Promise<Date | undefined> {
    const syncLogs = Array.from(this.syncLogs.values())
      .filter(log => log.tenantId === tenantId && log.deviceId === deviceId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return syncLogs.length > 0 ? new Date(syncLogs[0].timestamp) : undefined;
  }
  
  // Dashboard data
  async getDashboardData(tenantId: string): Promise<{ dailySales: number; lowStockCount: number; popularProducts: Product[]; recentActivities: any[]; }> {
    // Get today's sales
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const sales = Array.from(this.sales.values())
      .filter(sale => sale.tenantId === tenantId && new Date(sale.date) >= today);
    
    const dailySales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    
    // Get low stock products
    const products = await this.getProducts(tenantId, { lowStock: true });
    const lowStockCount = products.length;
    
    // Get popular products
    // In a real implementation, this would be based on sales data
    const popularProducts = Array.from(this.products.values())
      .filter(product => product.tenantId === tenantId)
      .sort(() => Math.random() - 0.5) // Just for demo purposes
      .slice(0, 4);
    
    // Get recent activities
    const recentSales = sales.map(sale => ({
      type: 'sale',
      id: sale.id,
      amount: sale.totalAmount,
      date: sale.date,
      description: `Vente #${sale.invoiceNumber}`
    }));
    
    const recentOrders = Array.from(this.orders.values())
      .filter(order => order.tenantId === tenantId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 2)
      .map(order => ({
        type: 'order',
        id: order.id,
        amount: order.totalAmount,
        date: order.date,
        description: `Commande #${order.orderNumber}`
      }));
    
    const recentAdjustments = Array.from(this.inventoryAdjustments.values())
      .filter(adj => adj.tenantId === tenantId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 2)
      .map(adj => ({
        type: 'adjustment',
        id: adj.id,
        date: adj.date,
        description: `Ajustement de stock: ${adj.reason}`
      }));
    
    const recentActivities = [...recentSales, ...recentOrders, ...recentAdjustments]
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

export const storage = new MemStorage();
