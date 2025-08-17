// Types for offline storage - simplified and self-contained
export interface OfflineCategory {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  active: boolean;
  createdAt: Date;
}

export interface OfflineProduct {
  id: string;
  name: string;
  barcode: string | null;
  description: string | null;
  categoryId: string | null;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  minStockLevel: number | null;
  unit: string | null;
  image: string | null;
  active: boolean;
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
  CATEGORIES: 'stocksage_categories',
  SETTINGS: 'stocksage_settings',
  CREDIT_TRANSACTIONS: 'stocksage_credit_transactions',
  LAST_SYNC: 'stocksage_last_sync',
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
  
  create: (product: Omit<OfflineProduct, 'id'>): OfflineProduct => {
    const products = getFromStorage<OfflineProduct>(STORAGE_KEYS.PRODUCTS);
    const newProduct: OfflineProduct = { ...product, id: generateId() };
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

// Initialize with sample data if empty
export function initializeSampleData() {
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

    offlineProductStorage.create({
      name: 'Sample Product 1',
      barcode: '123456789',
      description: 'A sample product for testing',
      categoryId: electronicsCategory.id,
      costPrice: 50,
      sellingPrice: 75,
      quantity: 100,
      minStockLevel: 10,
      unit: 'pcs',
      image: null,
      active: true
    });

    offlineProductStorage.create({
      name: 'Sample Product 2',
      barcode: '987654321',
      description: 'Another sample product',
      categoryId: booksCategory.id,
      costPrice: 20,
      sellingPrice: 30,
      quantity: 50,
      minStockLevel: 5,
      unit: 'pcs',
      image: null,
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
    
    return products.filter(product => 
      product.active && 
      product.quantity <= threshold
    );
  },
  
  getLowStockCount: () => {
    return lowStockHelpers.getLowStockProducts().length;
  },
  
  isLowStockAlertsEnabled: () => {
    const settings = offlineSettingsStorage.get();
    return settings?.enableLowStockAlerts ?? true;
  }
};

// Export utility functions
export { generateId };
