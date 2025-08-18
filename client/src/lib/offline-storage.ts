
import type { OfflinePurchaseOrder, OfflinePurchaseOrderItem } from '../../../shared/schema';

// Types for offline storage - simplified and self-contained
export interface OfflineCategory {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  active: boolean;
  createdAt: Date;
}

export interface OfflineStockLocation {
  id: string;
  name: string;
  description?: string;
  address?: string;
  isPrimary: boolean;
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
  locationId?: string; // null for full count across all locations
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
  locationId: string;
  systemQuantity: number;
  countedQuantity?: number;
  variance?: number;
  status: 'pending' | 'counted' | 'verified';
  countedBy?: string;
  countedAt?: string;
  notes?: string;
}

export interface OfflineStockAdjustment {
  id: string;
  productId: string;
  locationId: string;
  type: 'inventory_count' | 'manual_adjustment' | 'transfer' | 'sale' | 'purchase';
  previousQuantity: number;
  newQuantity: number;
  adjustmentQuantity: number;
  reason: string;
  referenceId?: string; // countId for inventory count adjustments
  createdBy: string;
  createdAt: string;
  notes?: string;
}

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
  quantity: number; // This will be the primary stock quantity for backward compatibility
  minStockLevel: number;
  unit: string;
  image?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  // Stock quantities per location
  stockLocations?: { [locationId: string]: number };
}

export interface OfflineCustomer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  creditBalance: number | null;
  notes: string | null;
}

export interface OfflineCreditTransaction {
  id: string;
  customerId: string;
  type: 'credit_sale' | 'payment' | 'adjustment';
  amount: number;
  description: string;
  date: Date;
  saleId?: string | null;
}

export interface OfflineSupplier {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
}

export interface OfflineSale {
  id: string;
  invoiceNumber: string;
  date: Date;
  customerId: string | null;
  totalAmount: number;
  discountAmount: number | null;
  taxAmount: number | null;
  paidAmount: number;
  changeAmount: number | null;
  paymentMethod: string;
  status: string;
  notes: string | null;
  items: OfflineSaleItem[];
}

export interface OfflineSaleItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discount: number | null;
}

export interface OfflineOrder {
  id: string;
  orderNumber: string;
  date: Date;
  supplierId: string | null;
  totalAmount: number;
  status: string;
  notes: string | null;
  items: OfflineOrderItem[];
}

export interface OfflineOrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OfflineProductCategory {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  parent_id: string | null;
  active: boolean;
}

export interface OfflineSalesPeriod {
  id: string;
  date: string; // YYYY-MM-DD format
  openedAt: Date;
  closedAt: Date | null;
  openingBalance: number;
  closingBalance: number | null;
  totalSales: number;
  totalTransactions: number;
  status: 'open' | 'closed';
  notes: string | null;
}

export interface OfflineSettings {
  id: string;
  businessName: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  taxRate: number | null;
  currency: string | null;
  logo: string | null;
  receiptHeader: string | null;
  receiptFooter: string | null;
  language: string | null;
  printerType: string | null;
  printerAddress: string | null;
  theme: string | null;
  syncInterval: number | null;
  lowStockThreshold: number | null;
  enableNotifications: boolean;
  enableLowStockAlerts: boolean;
  enableAutoBackup: boolean;
}

// Storage keys
const STORAGE_KEYS = {
  PRODUCTS: 'stocksage_products',
  CUSTOMERS: 'stocksage_customers',
  SUPPLIERS: 'stocksage_suppliers',
  SALES: 'stocksage_sales',
  ORDERS: 'stocksage_orders',
  SETTINGS: 'stocksage_settings',
  CATEGORIES: 'stocksage_categories',
  SALES_PERIODS: 'stocksage_sales_periods',
  STOCK_LOCATIONS: 'stocksage_stock_locations',
  PRODUCT_STOCK: 'stocksage_product_stock',
  INVENTORY_COUNTS: 'stocksage_inventory_counts',
  INVENTORY_COUNT_ITEMS: 'stocksage_inventory_count_items',
  STOCK_ADJUSTMENTS: 'stocksage_stock_adjustments',
  CREDIT_TRANSACTIONS: 'stocksage_credit_transactions',
  LAST_SYNC: 'stocksage_last_sync'
} as const;

// Utility functions
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getFromStorage<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`Error reading from localStorage key ${key}:`, error);
    return [];
  }
}

function saveToStorage<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving to localStorage key ${key}:`, error);
  }
}

// Categories
export const offlineCategoryStorage = {
  getAll: (): OfflineCategory[] => getFromStorage<OfflineCategory>(STORAGE_KEYS.CATEGORIES),
  
  getById: (id: string): OfflineCategory | undefined => {
    const categories = getFromStorage<OfflineCategory>(STORAGE_KEYS.CATEGORIES);
    return categories.find(c => c.id === id);
  },
  
  create: (category: Omit<OfflineCategory, 'id' | 'createdAt'>): OfflineCategory => {
    const categories = getFromStorage<OfflineCategory>(STORAGE_KEYS.CATEGORIES);
    const newCategory: OfflineCategory = { 
      ...category, 
      id: generateId(),
      createdAt: new Date()
    };
    categories.push(newCategory);
    saveToStorage(STORAGE_KEYS.CATEGORIES, categories);
    return newCategory;
  },
  
  update: (id: string, updates: Partial<OfflineCategory>): OfflineCategory | null => {
    const categories = getFromStorage<OfflineCategory>(STORAGE_KEYS.CATEGORIES);
    const index = categories.findIndex(c => c.id === id);
    if (index === -1) return null;
    
    categories[index] = { ...categories[index], ...updates };
    saveToStorage(STORAGE_KEYS.CATEGORIES, categories);
    return categories[index];
  },
  
  delete: (id: string): boolean => {
    const categories = getFromStorage<OfflineCategory>(STORAGE_KEYS.CATEGORIES);
    const filteredCategories = categories.filter(c => c.id !== id);
    if (filteredCategories.length === categories.length) return false;
    
    saveToStorage(STORAGE_KEYS.CATEGORIES, filteredCategories);
    return true;
  }
};

// Products
export const offlineProductStorage = {
  getAll: (): OfflineProduct[] => getFromStorage<OfflineProduct>(STORAGE_KEYS.PRODUCTS),
  
  getById: (id: string): OfflineProduct | undefined => {
    const products = getFromStorage<OfflineProduct>(STORAGE_KEYS.PRODUCTS);
    return products.find(p => p.id === id);
  },
  
  create: (product: Omit<OfflineProduct, 'id' | 'createdAt' | 'updatedAt'>): OfflineProduct => {
    const products = getFromStorage<OfflineProduct>(STORAGE_KEYS.PRODUCTS);
    const newProduct: OfflineProduct = { 
      ...product, 
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    products.push(newProduct);
    saveToStorage(STORAGE_KEYS.PRODUCTS, products);
    return newProduct;
  },
  
  update: (id: string, updates: Partial<OfflineProduct>): OfflineProduct | null => {
    const products = getFromStorage<OfflineProduct>(STORAGE_KEYS.PRODUCTS);
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return null;
    
    products[index] = { ...products[index], ...updates };
    saveToStorage(STORAGE_KEYS.PRODUCTS, products);
    return products[index];
  },
  
  delete: (id: string): boolean => {
    const products = getFromStorage<OfflineProduct>(STORAGE_KEYS.PRODUCTS);
    const filteredProducts = products.filter(p => p.id !== id);
    if (filteredProducts.length === products.length) return false;
    
    saveToStorage(STORAGE_KEYS.PRODUCTS, filteredProducts);
    return true;
  },
  
  search: (query: string): OfflineProduct[] => {
    const products = getFromStorage<OfflineProduct>(STORAGE_KEYS.PRODUCTS);
    const lowercaseQuery = query.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(lowercaseQuery) ||
      p.barcode?.toLowerCase().includes(lowercaseQuery) ||
      p.description?.toLowerCase().includes(lowercaseQuery)
    );
  }
};

// Customers
export const offlineCustomerStorage = {
  getAll: (): OfflineCustomer[] => getFromStorage<OfflineCustomer>(STORAGE_KEYS.CUSTOMERS),
  
  getById: (id: string): OfflineCustomer | undefined => {
    const customers = getFromStorage<OfflineCustomer>(STORAGE_KEYS.CUSTOMERS);
    return customers.find(c => c.id === id);
  },
  
  create: (customer: Omit<OfflineCustomer, 'id'>): OfflineCustomer => {
    const customers = getFromStorage<OfflineCustomer>(STORAGE_KEYS.CUSTOMERS);
    const newCustomer: OfflineCustomer = { ...customer, id: generateId() };
    customers.push(newCustomer);
    saveToStorage(STORAGE_KEYS.CUSTOMERS, customers);
    return newCustomer;
  },
  
  update: (id: string, updates: Partial<OfflineCustomer>): OfflineCustomer | null => {
    const customers = getFromStorage<OfflineCustomer>(STORAGE_KEYS.CUSTOMERS);
    const index = customers.findIndex(c => c.id === id);
    if (index === -1) return null;
    
    customers[index] = { ...customers[index], ...updates };
    saveToStorage(STORAGE_KEYS.CUSTOMERS, customers);
    return customers[index];
  },
  
  delete: (id: string): boolean => {
    const customers = getFromStorage<OfflineCustomer>(STORAGE_KEYS.CUSTOMERS);
    const filteredCustomers = customers.filter(c => c.id !== id);
    if (filteredCustomers.length === customers.length) return false;
    
    saveToStorage(STORAGE_KEYS.CUSTOMERS, filteredCustomers);
    return true;
  }
};

// Sales
export const offlineSaleStorage = {
  getAll: (): OfflineSale[] => getFromStorage<OfflineSale>(STORAGE_KEYS.SALES),
  
  getById: (id: string): OfflineSale | undefined => {
    const sales = getFromStorage<OfflineSale>(STORAGE_KEYS.SALES);
    return sales.find(s => s.id === id);
  },
  
  create: (sale: Omit<OfflineSale, 'id'>): OfflineSale => {
    const sales = getFromStorage<OfflineSale>(STORAGE_KEYS.SALES);
    const newSale: OfflineSale = { 
      ...sale, 
      id: generateId(),
      date: new Date(),
      items: sale.items.map(item => ({ ...item, id: generateId() }))
    };
    sales.push(newSale);
    saveToStorage(STORAGE_KEYS.SALES, sales);
    
    // Update product quantities
    newSale.items.forEach(item => {
      const product = offlineProductStorage.getById(item.productId);
      if (product) {
        offlineProductStorage.update(item.productId, {
          quantity: Math.max(0, product.quantity - item.quantity)
        });
      }
    });
    
    return newSale;
  }
};

// Settings
export const offlineSettingsStorage = {
  get: (): OfflineSettings | null => {
    const settings = getFromStorage<OfflineSettings>(STORAGE_KEYS.SETTINGS);
    return settings.length > 0 ? settings[0] : null;
  },
  
  update: (updates: Partial<OfflineSettings>): OfflineSettings => {
    const settings = getFromStorage<OfflineSettings>(STORAGE_KEYS.SETTINGS);
    let currentSettings: OfflineSettings;
    
    if (settings.length === 0) {
      currentSettings = {
        id: generateId(),
        businessName: 'My Business',
        address: null,
        phone: null,
        email: null,
        taxRate: 0,
        currency: 'USD',
        logo: null,
        receiptHeader: null,
        receiptFooter: null,
        language: 'en',
        printerType: null,
        printerAddress: null,
        theme: 'light',
        syncInterval: null,
        lowStockThreshold: 10,
        enableNotifications: false,
        enableLowStockAlerts: true,
        enableAutoBackup: false,
        ...updates
      };
      settings.push(currentSettings);
    } else {
      currentSettings = { ...settings[0], ...updates };
      settings[0] = currentSettings;
    }
    
    saveToStorage(STORAGE_KEYS.SETTINGS, settings);
    return currentSettings;
  }
};

// Supplier storage operations
export const offlineSupplierStorage = {
  getAll: (): OfflineSupplier[] => {
    return getFromStorage<OfflineSupplier>(STORAGE_KEYS.SUPPLIERS);
  },
  
  getById: (id: string): OfflineSupplier | undefined => {
    const suppliers = getFromStorage<OfflineSupplier>(STORAGE_KEYS.SUPPLIERS);
    return suppliers.find(s => s.id === id);
  },
  
  create: (supplier: Omit<OfflineSupplier, 'id'>): OfflineSupplier => {
    const suppliers = getFromStorage<OfflineSupplier>(STORAGE_KEYS.SUPPLIERS);
    const newSupplier: OfflineSupplier = { ...supplier, id: generateId() };
    suppliers.push(newSupplier);
    saveToStorage(STORAGE_KEYS.SUPPLIERS, suppliers);
    return newSupplier;
  },
  
  update: (id: string, updates: Partial<OfflineSupplier>): OfflineSupplier | null => {
    const suppliers = getFromStorage<OfflineSupplier>(STORAGE_KEYS.SUPPLIERS);
    const index = suppliers.findIndex(s => s.id === id);
    if (index === -1) return null;
    
    suppliers[index] = { ...suppliers[index], ...updates };
    saveToStorage(STORAGE_KEYS.SUPPLIERS, suppliers);
    return suppliers[index];
  },
  
  delete: (id: string): boolean => {
    const suppliers = getFromStorage<OfflineSupplier>(STORAGE_KEYS.SUPPLIERS);
    const filteredSuppliers = suppliers.filter(s => s.id !== id);
    if (filteredSuppliers.length === suppliers.length) return false;
    
    saveToStorage(STORAGE_KEYS.SUPPLIERS, filteredSuppliers);
    return true;
  }
};

// Credit transaction storage operations
export const offlineCreditTransactionStorage = {
  getAll: (): OfflineCreditTransaction[] => {
    return getFromStorage<OfflineCreditTransaction>(STORAGE_KEYS.CREDIT_TRANSACTIONS);
  },
  
  getByCustomerId: (customerId: string): OfflineCreditTransaction[] => {
    const transactions = getFromStorage<OfflineCreditTransaction>(STORAGE_KEYS.CREDIT_TRANSACTIONS);
    return transactions.filter(t => t.customerId === customerId);
  },
  
  create: (transaction: Omit<OfflineCreditTransaction, 'id'>): OfflineCreditTransaction => {
    const transactions = getFromStorage<OfflineCreditTransaction>(STORAGE_KEYS.CREDIT_TRANSACTIONS);
    const newTransaction: OfflineCreditTransaction = { ...transaction, id: generateId() };
    transactions.push(newTransaction);
    saveToStorage(STORAGE_KEYS.CREDIT_TRANSACTIONS, transactions);
    return newTransaction;
  },
  
  delete: (id: string): boolean => {
    const transactions = getFromStorage<OfflineCreditTransaction>(STORAGE_KEYS.CREDIT_TRANSACTIONS);
    const filteredTransactions = transactions.filter(t => t.id !== id);
    if (filteredTransactions.length === transactions.length) return false;
    
    saveToStorage(STORAGE_KEYS.CREDIT_TRANSACTIONS, filteredTransactions);
    return true;
  }
};

// Helper functions for credit management
export const creditHelpers = {
  addCreditSale: (customerId: string, amount: number, saleId: string, description: string) => {
    // Create credit transaction
    offlineCreditTransactionStorage.create({
      customerId,
      type: 'credit_sale',
      amount,
      description,
      date: new Date(),
      saleId
    });
    
    // Update customer credit balance
    const customer = offlineCustomerStorage.getById(customerId);
    if (customer) {
      const newBalance = (customer.creditBalance || 0) + amount;
      offlineCustomerStorage.update(customerId, { creditBalance: newBalance });
    }
  },
  
  addCreditPayment: (customerId: string, amount: number, description: string) => {
    // Create payment transaction
    offlineCreditTransactionStorage.create({
      customerId,
      type: 'payment',
      amount: -amount, // Negative because it reduces the balance
      description,
      date: new Date()
    });
    
    // Update customer credit balance
    const customer = offlineCustomerStorage.getById(customerId);
    if (customer) {
      const newBalance = Math.max(0, (customer.creditBalance || 0) - amount);
      offlineCustomerStorage.update(customerId, { creditBalance: newBalance });
    }
  },
  
  adjustCreditBalance: (customerId: string, amount: number, description: string) => {
    // Create adjustment transaction
    offlineCreditTransactionStorage.create({
      customerId,
      type: 'adjustment',
      amount,
      description,
      date: new Date()
    });
    
    // Update customer credit balance
    const customer = offlineCustomerStorage.getById(customerId);
    if (customer) {
      const newBalance = Math.max(0, (customer.creditBalance || 0) + amount);
      offlineCustomerStorage.update(customerId, { creditBalance: newBalance });
    }
  },
  
  getCustomerCreditInfo: (customerId: string) => {
    const customer = offlineCustomerStorage.getById(customerId);
    const transactions = offlineCreditTransactionStorage.getByCustomerId(customerId);
    
    const currentBalance = customer?.creditBalance || 0;
    
    return {
      currentBalance,
      transactions
    };
  }
};

// Migration function to move existing product stock to primary location
function migrateProductStockToPrimary() {
  const stockLocations = offlineStockLocationStorage.getAll();
  const primaryLocation = stockLocations.find(location => location.isPrimary);
  
  if (!primaryLocation) {
    console.warn('No primary stock location found for migration');
    return;
  }

  const products = offlineProductStorage.getAll();
  const existingProductStocks = offlineProductStockStorage.getAll();

  products.forEach(product => {
    // Check if this product already has stock in the primary location
    const existingStock = existingProductStocks.find(
      stock => stock.productId === product.id && stock.locationId === primaryLocation.id
    );

    // If product has quantity but no stock record in primary location, create it
    if (product.quantity > 0 && !existingStock) {
      offlineProductStockStorage.upsert({
        productId: product.id,
        locationId: primaryLocation.id,
        quantity: product.quantity,
        minStockLevel: product.minStockLevel
      });
      
      console.log(`Migrated ${product.quantity} units of "${product.name}" to primary location`);
    }
  });
}

export function initializeSampleData() {
  // Initialize stock locations first
  if (offlineStockLocationStorage.getAll().length === 0) {
    // Create primary stock location
    offlineStockLocationStorage.create({
      name: 'Main Store',
      description: 'Primary store location',
      address: 'Main Street, City Center',
      isPrimary: true,
      active: true
    });

    // Create additional sample locations
    offlineStockLocationStorage.create({
      name: 'Warehouse',
      description: 'Storage warehouse',
      address: 'Industrial Zone',
      isPrimary: false,
      active: true
    });
  }

  // Migrate existing product stock to primary location
  migrateProductStockToPrimary();

  if (offlineProductStorage.getAll().length === 0) {
    // Create sample categories first
    const electronicsCategory = offlineCategoryStorage.create({
      name: 'Electronics',
      description: 'Electronic devices and accessories',
      color: '#3B82F6',
      active: true
    });

    const booksCategory = offlineCategoryStorage.create({
      name: 'Books',
      description: 'Books and educational materials',
      color: '#10B981',
      active: true
    });

    const categories = [electronicsCategory, booksCategory];

    offlineProductStorage.create({
      name: "Sample Product 1",
      barcode: "123456789",
      description: "A sample product for testing",
      categoryId: categories[0].id,
      costPrice: 50.00,
      sellingPrice: 75.00,
      semiWholesalePrice: 70.00,
      wholesalePrice: 65.00,
      quantity: 50,
      minStockLevel: 10,
      unit: "pieces",
      image: undefined,
      active: true
    });

    offlineProductStorage.create({
      name: "Sample Product 2",
      barcode: "987654321",
      description: "Another sample product",
      categoryId: categories[1].id,
      costPrice: 20.00,
      sellingPrice: 30.00,
      semiWholesalePrice: 28.00,
      wholesalePrice: 25.00,
      quantity: 0,
      minStockLevel: 5,
      unit: "pieces",
      image: undefined,
      active: true
    });
  }
  
  if (offlineCustomerStorage.getAll().length === 0) {
    // Add sample customers
    offlineCustomerStorage.create({
      name: 'Walk-in Customer',
      phone: null,
      email: null,
      address: null,
      creditBalance: 0,
      notes: 'Default customer for walk-in sales'
    });
    
    offlineCustomerStorage.create({
      name: 'John Smith',
      phone: '+1-555-0123',
      email: 'john.smith@email.com',
      address: '123 Main St, City, State',
      creditBalance: 0,
      notes: 'Regular customer with credit account'
    });
    
    offlineCustomerStorage.create({
      name: 'Sarah Johnson',
      phone: '+1-555-0456',
      email: 'sarah.johnson@email.com',
      address: '456 Oak Ave, City, State',
      creditBalance: 150,
      notes: 'Premium customer with existing balance'
    });
  }
  
  // Initialize settings if empty
  if (!offlineSettingsStorage.get()) {
    offlineSettingsStorage.update({
      businessName: 'StockSage Store',
      currency: 'USD',
      taxRate: 0.1,
      language: 'en',
      theme: 'light'
    });
  }
}

// Low stock notification helpers
export const lowStockHelpers = {
  getLowStockProducts: () => {
    const settings = offlineSettingsStorage.get();
    const threshold = settings?.lowStockThreshold || 10;
    const products = offlineProductStorage.getAll();
    
    return products.filter(product => {
      if (!product.active) return false;
      
      // Check stock across all locations
      const productStocks = offlineProductStockStorage.getByProduct(product.id);
      const totalStock = productStocks.reduce((sum, stock) => sum + stock.quantity, 0);
      
      // If no location-specific stock exists, use product's base quantity
      const effectiveStock = totalStock > 0 ? totalStock : product.quantity;
      
      return effectiveStock <= (product.minStockLevel || threshold);
    });
  },
  
  getLowStockCount: () => {
    return lowStockHelpers.getLowStockProducts().length;
  },
  
  isLowStockAlertsEnabled: () => {
    const settings = offlineSettingsStorage.get();
    return settings?.enableLowStockAlerts ?? true;
  }
};

// Stock Location storage operations
export const offlineStockLocationStorage = {
  getAll: (): OfflineStockLocation[] => {
    return getFromStorage<OfflineStockLocation>(STORAGE_KEYS.STOCK_LOCATIONS);
  },

  getById: (id: string): OfflineStockLocation | undefined => {
    const locations = getFromStorage<OfflineStockLocation>(STORAGE_KEYS.STOCK_LOCATIONS);
    return locations.find(location => location.id === id);
  },

  getPrimary: (): OfflineStockLocation | undefined => {
    const locations = getFromStorage<OfflineStockLocation>(STORAGE_KEYS.STOCK_LOCATIONS);
    return locations.find(location => location.isPrimary && location.active);
  },

  create: (locationData: Omit<OfflineStockLocation, 'id' | 'createdAt' | 'updatedAt'>): OfflineStockLocation => {
    const locations = getFromStorage<OfflineStockLocation>(STORAGE_KEYS.STOCK_LOCATIONS);
    
    // If this is set as primary, make sure no other location is primary
    if (locationData.isPrimary) {
      locations.forEach(location => {
        if (location.isPrimary) {
          location.isPrimary = false;
          location.updatedAt = new Date().toISOString();
        }
      });
    }

    const newLocation: OfflineStockLocation = {
      ...locationData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    locations.push(newLocation);
    saveToStorage(STORAGE_KEYS.STOCK_LOCATIONS, locations);
    return newLocation;
  },

  update: (id: string, updates: Partial<Omit<OfflineStockLocation, 'id' | 'createdAt'>>): OfflineStockLocation | null => {
    const locations = getFromStorage<OfflineStockLocation>(STORAGE_KEYS.STOCK_LOCATIONS);
    const index = locations.findIndex(location => location.id === id);
    
    if (index === -1) return null;

    // If this is being set as primary, make sure no other location is primary
    if (updates.isPrimary) {
      locations.forEach(location => {
        if (location.id !== id && location.isPrimary) {
          location.isPrimary = false;
          location.updatedAt = new Date().toISOString();
        }
      });
    }

    locations[index] = {
      ...locations[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    saveToStorage(STORAGE_KEYS.STOCK_LOCATIONS, locations);
    return locations[index];
  },

  delete: (id: string): boolean => {
    const locations = getFromStorage<OfflineStockLocation>(STORAGE_KEYS.STOCK_LOCATIONS);
    const location = locations.find(l => l.id === id);
    
    // Don't allow deleting the primary location
    if (location?.isPrimary) {
      return false;
    }

    const filteredLocations = locations.filter(location => location.id !== id);
    saveToStorage(STORAGE_KEYS.STOCK_LOCATIONS, filteredLocations);
    
    // Also remove all product stocks for this location
    const productStocks = getFromStorage<OfflineProductStock>(STORAGE_KEYS.PRODUCT_STOCK);
    const filteredStocks = productStocks.filter(stock => stock.locationId !== id);
    saveToStorage(STORAGE_KEYS.PRODUCT_STOCK, filteredStocks);
    
    return filteredLocations.length !== locations.length;
  },
};

// Product Stock storage operations
export const offlineProductStockStorage = {
  getAll: (): OfflineProductStock[] => {
    return getFromStorage<OfflineProductStock>(STORAGE_KEYS.PRODUCT_STOCK);
  },

  getByProduct: (productId: string): OfflineProductStock[] => {
    const stocks = getFromStorage<OfflineProductStock>(STORAGE_KEYS.PRODUCT_STOCK);
    return stocks.filter(stock => stock.productId === productId);
  },

  getByLocation: (locationId: string): OfflineProductStock[] => {
    const stocks = getFromStorage<OfflineProductStock>(STORAGE_KEYS.PRODUCT_STOCK);
    return stocks.filter(stock => stock.locationId === locationId);
  },

  getByProductAndLocation: (productId: string, locationId: string): OfflineProductStock | undefined => {
    const stocks = getFromStorage<OfflineProductStock>(STORAGE_KEYS.PRODUCT_STOCK);
    return stocks.find(stock => stock.productId === productId && stock.locationId === locationId);
  },

  upsert: (stockData: Omit<OfflineProductStock, 'updatedAt'>): OfflineProductStock => {
    const stocks = getFromStorage<OfflineProductStock>(STORAGE_KEYS.PRODUCT_STOCK);
    const existingIndex = stocks.findIndex(
      stock => stock.productId === stockData.productId && stock.locationId === stockData.locationId
    );

    const newStock: OfflineProductStock = {
      ...stockData,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      stocks[existingIndex] = newStock;
    } else {
      stocks.push(newStock);
    }

    saveToStorage(STORAGE_KEYS.PRODUCT_STOCK, stocks);
    return newStock;
  },

  updateQuantity: (productId: string, locationId: string, quantity: number, reason?: string, referenceId?: string): OfflineProductStock | null => {
    const stocks = getFromStorage<OfflineProductStock>(STORAGE_KEYS.PRODUCT_STOCK);
    const index = stocks.findIndex(
      stock => stock.productId === productId && stock.locationId === locationId
    );

    if (index === -1) return null;

    const previousQuantity = stocks[index].quantity;
    
    stocks[index] = {
      ...stocks[index],
      quantity,
      updatedAt: new Date().toISOString(),
    };

    // Create stock adjustment record for audit trail
    if (reason && previousQuantity !== quantity) {
      offlineStockAdjustmentStorage.create({
        productId,
        locationId,
        type: reason.includes('inventory_count') ? 'inventory_count' : 'manual_adjustment',
        previousQuantity,
        newQuantity: quantity,
        adjustmentQuantity: quantity - previousQuantity,
        reason: reason || 'Stock quantity update',
        referenceId,
        createdBy: 'current_user',
        notes: `Stock updated from ${previousQuantity} to ${quantity}`
      });
    }

    saveToStorage(STORAGE_KEYS.PRODUCT_STOCK, stocks);
    return stocks[index];
  },

  deleteByProduct: (productId: string): void => {
    const stocks = getFromStorage<OfflineProductStock>(STORAGE_KEYS.PRODUCT_STOCK);
    const filteredStocks = stocks.filter(stock => stock.productId !== productId);
    saveToStorage(STORAGE_KEYS.PRODUCT_STOCK, filteredStocks);
  },

  deleteByLocation: (locationId: string): void => {
    const stocks = getFromStorage<OfflineProductStock>(STORAGE_KEYS.PRODUCT_STOCK);
    const filteredStocks = stocks.filter(stock => stock.locationId !== locationId);
    saveToStorage(STORAGE_KEYS.PRODUCT_STOCK, filteredStocks);
  },

  transferStock: (productId: string, fromLocationId: string, toLocationId: string, quantity: number): { success: boolean; message: string } => {
    const fromStock = offlineProductStockStorage.getByProductAndLocation(productId, fromLocationId);
    
    if (!fromStock || fromStock.quantity < quantity) {
      return { success: false, message: 'Insufficient stock in source location' };
    }

    // Reduce stock from source location
    const newFromQuantity = fromStock.quantity - quantity;
    offlineProductStockStorage.upsert({
      productId,
      locationId: fromLocationId,
      quantity: newFromQuantity,
      minStockLevel: fromStock.minStockLevel
    });

    // Add stock to destination location
    const toStock = offlineProductStockStorage.getByProductAndLocation(productId, toLocationId);
    const newToQuantity = (toStock?.quantity || 0) + quantity;
    
    offlineProductStockStorage.upsert({
      productId,
      locationId: toLocationId,
      quantity: newToQuantity,
      minStockLevel: toStock?.minStockLevel || fromStock.minStockLevel
    });

    return { success: true, message: `Successfully transferred ${quantity} units` };
  },

  addStock: (productId: string, locationId: string, quantity: number, reason?: string): { success: boolean; message: string } => {
    if (quantity <= 0) {
      return { success: false, message: 'Quantity must be greater than 0' };
    }

    const currentStock = offlineProductStockStorage.getByProductAndLocation(productId, locationId);
    const newQuantity = (currentStock?.quantity || 0) + quantity;
    
    offlineProductStockStorage.upsert({
      productId,
      locationId,
      quantity: newQuantity,
      minStockLevel: currentStock?.minStockLevel || 10
    });

    return { success: true, message: `Successfully added ${quantity} units${reason ? ` (${reason})` : ''}` };
  },

  removeStock: (productId: string, locationId: string, quantity: number, reason?: string): { success: boolean; message: string } => {
    if (quantity <= 0) {
      return { success: false, message: 'Quantity must be greater than 0' };
    }

    const currentStock = offlineProductStockStorage.getByProductAndLocation(productId, locationId);
    
    if (!currentStock || currentStock.quantity < quantity) {
      return { success: false, message: 'Insufficient stock available' };
    }

    const newQuantity = currentStock.quantity - quantity;
    
    offlineProductStockStorage.upsert({
      productId,
      locationId,
      quantity: newQuantity,
      minStockLevel: currentStock.minStockLevel
    });

    return { success: true, message: `Successfully removed ${quantity} units${reason ? ` (${reason})` : ''}` };
  }
};

// Stock Adjustment storage operations
export const offlineStockAdjustmentStorage = {
  getAll: (): OfflineStockAdjustment[] => {
    return getFromStorage<OfflineStockAdjustment>(STORAGE_KEYS.STOCK_ADJUSTMENTS);
  },

  getByProduct: (productId: string): OfflineStockAdjustment[] => {
    const adjustments = getFromStorage<OfflineStockAdjustment>(STORAGE_KEYS.STOCK_ADJUSTMENTS);
    return adjustments.filter(adj => adj.productId === productId);
  },

  getByLocation: (locationId: string): OfflineStockAdjustment[] => {
    const adjustments = getFromStorage<OfflineStockAdjustment>(STORAGE_KEYS.STOCK_ADJUSTMENTS);
    return adjustments.filter(adj => adj.locationId === locationId);
  },

  getByReference: (referenceId: string): OfflineStockAdjustment[] => {
    const adjustments = getFromStorage<OfflineStockAdjustment>(STORAGE_KEYS.STOCK_ADJUSTMENTS);
    return adjustments.filter(adj => adj.referenceId === referenceId);
  },

  create: (adjustmentData: Omit<OfflineStockAdjustment, 'id' | 'createdAt'>): OfflineStockAdjustment => {
    const adjustments = getFromStorage<OfflineStockAdjustment>(STORAGE_KEYS.STOCK_ADJUSTMENTS);
    const newAdjustment: OfflineStockAdjustment = {
      ...adjustmentData,
      id: generateId(),
      createdAt: new Date().toISOString()
    };
    
    adjustments.push(newAdjustment);
    saveToStorage(STORAGE_KEYS.STOCK_ADJUSTMENTS, adjustments);
    return newAdjustment;
  },

  deleteByReference: (referenceId: string): void => {
    const adjustments = getFromStorage<OfflineStockAdjustment>(STORAGE_KEYS.STOCK_ADJUSTMENTS);
    const filteredAdjustments = adjustments.filter(adj => adj.referenceId !== referenceId);
    saveToStorage(STORAGE_KEYS.STOCK_ADJUSTMENTS, filteredAdjustments);
  }
};

// Inventory Count storage operations
export const offlineInventoryCountStorage = {
  getAll: (): OfflineInventoryCount[] => {
    return getFromStorage<OfflineInventoryCount>(STORAGE_KEYS.INVENTORY_COUNTS);
  },

  getById: (id: string): OfflineInventoryCount | null => {
    const counts = getFromStorage<OfflineInventoryCount>(STORAGE_KEYS.INVENTORY_COUNTS);
    return counts.find(count => count.id === id) || null;
  },

  create: (countData: Omit<OfflineInventoryCount, 'id' | 'createdAt' | 'countedProducts' | 'totalVariances'>): OfflineInventoryCount => {
    const counts = getFromStorage<OfflineInventoryCount>(STORAGE_KEYS.INVENTORY_COUNTS);
    
    const newCount: OfflineInventoryCount = {
      ...countData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      countedProducts: 0,
      totalVariances: 0
    };

    counts.push(newCount);
    saveToStorage(STORAGE_KEYS.INVENTORY_COUNTS, counts);
    return newCount;
  },

  update: (id: string, updates: Partial<Omit<OfflineInventoryCount, 'id' | 'createdAt'>>): OfflineInventoryCount | null => {
    const counts = getFromStorage<OfflineInventoryCount>(STORAGE_KEYS.INVENTORY_COUNTS);
    const index = counts.findIndex(count => count.id === id);
    
    if (index === -1) return null;

    counts[index] = { ...counts[index], ...updates };
    saveToStorage(STORAGE_KEYS.INVENTORY_COUNTS, counts);
    return counts[index];
  },

  delete: (id: string): boolean => {
    const counts = getFromStorage<OfflineInventoryCount>(STORAGE_KEYS.INVENTORY_COUNTS);
    const filteredCounts = counts.filter(count => count.id !== id);
    
    if (filteredCounts.length === counts.length) return false;
    
    saveToStorage(STORAGE_KEYS.INVENTORY_COUNTS, filteredCounts);
    // Also delete related count items
    offlineInventoryCountItemStorage.deleteByCountId(id);
    return true;
  }
};

// Inventory Count Item storage operations
export const offlineInventoryCountItemStorage = {
  getAll: (): OfflineInventoryCountItem[] => {
    return getFromStorage<OfflineInventoryCountItem>(STORAGE_KEYS.INVENTORY_COUNT_ITEMS);
  },

  getByCountId: (countId: string): OfflineInventoryCountItem[] => {
    const items = getFromStorage<OfflineInventoryCountItem>(STORAGE_KEYS.INVENTORY_COUNT_ITEMS);
    return items.filter(item => item.countId === countId);
  },

  create: (itemData: Omit<OfflineInventoryCountItem, 'id'>): OfflineInventoryCountItem => {
    const items = getFromStorage<OfflineInventoryCountItem>(STORAGE_KEYS.INVENTORY_COUNT_ITEMS);
    
    const newItem: OfflineInventoryCountItem = {
      ...itemData,
      id: generateId()
    };

    items.push(newItem);
    saveToStorage(STORAGE_KEYS.INVENTORY_COUNT_ITEMS, items);
    return newItem;
  },

  update: (id: string, updates: Partial<Omit<OfflineInventoryCountItem, 'id'>>): OfflineInventoryCountItem | null => {
    const items = getFromStorage<OfflineInventoryCountItem>(STORAGE_KEYS.INVENTORY_COUNT_ITEMS);
    const index = items.findIndex(item => item.id === id);
    
    if (index === -1) return null;

    items[index] = { ...items[index], ...updates };
    saveToStorage(STORAGE_KEYS.INVENTORY_COUNT_ITEMS, items);
    return items[index];
  },

  delete: (id: string): boolean => {
    const items = getFromStorage<OfflineInventoryCountItem>(STORAGE_KEYS.INVENTORY_COUNT_ITEMS);
    const filteredItems = items.filter(item => item.id !== id);
    
    if (filteredItems.length === items.length) {
      return false; // Item not found
    }
    
    saveToStorage(STORAGE_KEYS.INVENTORY_COUNT_ITEMS, filteredItems);
    return true;
  },

  deleteByCountId: (countId: string): void => {
    const items = getFromStorage<OfflineInventoryCountItem>(STORAGE_KEYS.INVENTORY_COUNT_ITEMS);
    const filteredItems = items.filter(item => item.countId !== countId);
    saveToStorage(STORAGE_KEYS.INVENTORY_COUNT_ITEMS, filteredItems);
  },

  bulkUpdate: (updates: { id: string; updates: Partial<Omit<OfflineInventoryCountItem, 'id'>> }[]): void => {
    const items = getFromStorage<OfflineInventoryCountItem>(STORAGE_KEYS.INVENTORY_COUNT_ITEMS);
    
    updates.forEach(({ id, updates: itemUpdates }) => {
      const index = items.findIndex(item => item.id === id);
      if (index !== -1) {
        items[index] = { ...items[index], ...itemUpdates };
      }
    });
    
    saveToStorage(STORAGE_KEYS.INVENTORY_COUNT_ITEMS, items);
  }
};

// Sales Period storage operations
export const offlineSalesPeriodStorage = {
  getAll: (): OfflineSalesPeriod[] => {
    return getFromStorage<OfflineSalesPeriod>(STORAGE_KEYS.SALES_PERIODS);
  },
  
  getCurrentPeriod: (): OfflineSalesPeriod | null => {
    const periods = getFromStorage<OfflineSalesPeriod>(STORAGE_KEYS.SALES_PERIODS);
    return periods.find(p => p.status === 'open') || null;
  },
  
  getTodaysPeriod: (): OfflineSalesPeriod | null => {
    const today = new Date().toISOString().split('T')[0];
    const periods = getFromStorage<OfflineSalesPeriod>(STORAGE_KEYS.SALES_PERIODS);
    return periods.find(p => p.date === today) || null;
  },
  
  create: (period: Omit<OfflineSalesPeriod, 'id'>): OfflineSalesPeriod => {
    const periods = getFromStorage<OfflineSalesPeriod>(STORAGE_KEYS.SALES_PERIODS);
    const newPeriod: OfflineSalesPeriod = { ...period, id: generateId() };
    periods.push(newPeriod);
    saveToStorage(STORAGE_KEYS.SALES_PERIODS, periods);
    return newPeriod;
  },
  
  update: (id: string, updates: Partial<OfflineSalesPeriod>): OfflineSalesPeriod | null => {
    const periods = getFromStorage<OfflineSalesPeriod>(STORAGE_KEYS.SALES_PERIODS);
    const index = periods.findIndex(p => p.id === id);
    if (index === -1) return null;
    
    periods[index] = { ...periods[index], ...updates };
    saveToStorage(STORAGE_KEYS.SALES_PERIODS, periods);
    return periods[index];
  }
};

// Sales Period helpers
export const salesPeriodHelpers = {
  openSalesPeriod: (openingBalance: number = 0, notes: string | null = null): OfflineSalesPeriod => {
    const today = new Date().toISOString().split('T')[0];
    
    // Close any existing open period
    const currentPeriod = offlineSalesPeriodStorage.getCurrentPeriod();
    if (currentPeriod) {
      salesPeriodHelpers.closeSalesPeriod(currentPeriod.id);
    }
    
    return offlineSalesPeriodStorage.create({
      date: today,
      openedAt: new Date(),
      closedAt: null,
      openingBalance,
      closingBalance: null,
      totalSales: 0,
      totalTransactions: 0,
      status: 'open',
      notes
    });
  },
  
  closeSalesPeriod: (periodId: string, closingBalance?: number, notes?: string): OfflineSalesPeriod | null => {
    const period = offlineSalesPeriodStorage.getAll().find(p => p.id === periodId);
    if (!period || period.status === 'closed') return null;
    
    // Calculate total sales for the period
    const sales = offlineSaleStorage.getAll();
    const periodStart = new Date(period.openedAt);
    const periodEnd = new Date();
    
    const periodSales = sales.filter(sale => {
      const saleDate = new Date(sale.date);
      return saleDate >= periodStart && saleDate <= periodEnd;
    });
    
    const totalSales = periodSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalTransactions = periodSales.length;
    
    return offlineSalesPeriodStorage.update(periodId, {
      closedAt: new Date(),
      closingBalance: closingBalance || (period.openingBalance + totalSales),
      totalSales,
      totalTransactions,
      status: 'closed',
      notes: notes || period.notes
    });
  },
  
  getTodaysSalesData: () => {
    const today = new Date().toISOString().split('T')[0];
    const sales = offlineSaleStorage.getAll();
    const todaysSales = sales.filter(sale => {
      const saleDate = new Date(sale.date).toISOString().split('T')[0];
      return saleDate === today;
    });
    
    const totalSales = todaysSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalTransactions = todaysSales.length;
    const averageTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0;
    
    return {
      totalSales,
      totalTransactions,
      averageTransaction,
      sales: todaysSales
    };
  },
  
  updatePeriodStats: (periodId: string) => {
    const period = offlineSalesPeriodStorage.getAll().find(p => p.id === periodId);
    if (!period || period.status === 'closed') return;
    
    const sales = offlineSaleStorage.getAll();
    const periodStart = new Date(period.openedAt);
    const now = new Date();
    
    const periodSales = sales.filter(sale => {
      const saleDate = new Date(sale.date);
      return saleDate >= periodStart && saleDate <= now;
    });
    
    const totalSales = periodSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalTransactions = periodSales.length;
    
    offlineSalesPeriodStorage.update(periodId, {
      totalSales,
      totalTransactions
    });
  }
};

// Purchase Orders Storage
export const offlinePurchaseOrderStorage = {
  getAll: (): OfflinePurchaseOrder[] => {
    const data = localStorage.getItem('offline_purchase_orders');
    return data ? JSON.parse(data) : [];
  },

  getById: (id: string): OfflinePurchaseOrder | null => {
    const orders = offlinePurchaseOrderStorage.getAll();
    return orders.find(order => order.id === id) || null;
  },

  create: (order: Omit<OfflinePurchaseOrder, 'id' | 'createdAt' | 'updatedAt'>): OfflinePurchaseOrder => {
    const orders = offlinePurchaseOrderStorage.getAll();
    const newOrder: OfflinePurchaseOrder = {
      ...order,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    orders.push(newOrder);
    localStorage.setItem('offline_purchase_orders', JSON.stringify(orders));
    return newOrder;
  },

  update: (id: string, updates: Partial<OfflinePurchaseOrder>): OfflinePurchaseOrder | null => {
    const orders = offlinePurchaseOrderStorage.getAll();
    const index = orders.findIndex(order => order.id === id);
    if (index === -1) return null;
    
    orders[index] = { ...orders[index], ...updates, updatedAt: new Date().toISOString() };
    localStorage.setItem('offline_purchase_orders', JSON.stringify(orders));
    return orders[index];
  },

  delete: (id: string): boolean => {
    const orders = offlinePurchaseOrderStorage.getAll();
    const filteredOrders = orders.filter(order => order.id !== id);
    if (filteredOrders.length === orders.length) return false;
    localStorage.setItem('offline_purchase_orders', JSON.stringify(filteredOrders));
    return true;
  }
};

// Purchase Order Items Storage
export const offlinePurchaseOrderItemStorage = {
  getAll: (): OfflinePurchaseOrderItem[] => {
    const data = localStorage.getItem('offline_purchase_order_items');
    return data ? JSON.parse(data) : [];
  },

  getByOrderId: (orderId: string): OfflinePurchaseOrderItem[] => {
    const items = offlinePurchaseOrderItemStorage.getAll();
    return items.filter(item => item.orderId === orderId);
  },

  create: (item: Omit<OfflinePurchaseOrderItem, 'id' | 'createdAt' | 'updatedAt'>): OfflinePurchaseOrderItem => {
    const items = offlinePurchaseOrderItemStorage.getAll();
    const newItem: OfflinePurchaseOrderItem = {
      ...item,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    items.push(newItem);
    localStorage.setItem('offline_purchase_order_items', JSON.stringify(items));
    return newItem;
  },

  update: (id: string, updates: Partial<OfflinePurchaseOrderItem>): OfflinePurchaseOrderItem | null => {
    const items = offlinePurchaseOrderItemStorage.getAll();
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return null;
    
    items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
    localStorage.setItem('offline_purchase_order_items', JSON.stringify(items));
    return items[index];
  },

  delete: (id: string): boolean => {
    const items = offlinePurchaseOrderItemStorage.getAll();
    const filteredItems = items.filter(item => item.id !== id);
    if (filteredItems.length === items.length) return false;
    localStorage.setItem('offline_purchase_order_items', JSON.stringify(filteredItems));
    return true;
  },

  deleteByOrderId: (orderId: string): boolean => {
    const items = offlinePurchaseOrderItemStorage.getAll();
    const filteredItems = items.filter(item => item.orderId !== orderId);
    localStorage.setItem('offline_purchase_order_items', JSON.stringify(filteredItems));
    return true;
  }
};

// Export utility functions
export { generateId };
