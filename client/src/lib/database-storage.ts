// Database-only storage layer for StockSage
// All operations go through API endpoints to SQLite database

const API_BASE = 'http://localhost:5003/api/offline';

// Generic API helper
async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// Type definitions for database entities
export interface OfflineProduct {
  id: string;
  name: string;
  description?: string;
  barcode?: string;
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
export interface OfflineCustomer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  creditLimit?: number;
  creditBalance?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineSupplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineSale {
  id: string;
  invoiceNumber: string;
  date: string;
  customerId?: number | null;
  totalAmount: number;
  discountAmount?: number;
  taxAmount?: number;
  paidAmount: number;
  changeAmount?: number;
  paymentMethod: string;
  status: string;
  notes?: string;
  items: any[];
  createdAt: string;
  updatedAt: string;
}

export interface OfflineSaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineSettings {
  id: string;
  businessName: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  taxRate?: number;
  currency: string;
  receiptFooter?: string;
  createdAt: string;
  updatedAt: string;
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

export interface OfflineStockLocation {
  id: string;
  name: string;
  description?: string;
  isPrimary?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineInventoryCount {
  id: string;
  name: string;
  locationId: string;
  status: string;
  startDate: string;
  endDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
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

export interface OfflineStockTransaction {
  id: string;
  productId: string;
  warehouseId: string;
  type: 'entry' | 'exit' | 'adjustment' | 'transfer';
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  reference?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineSupplierPayment {
  id: string;
  supplierId: string;
  amount: number;
  paymentMethod: string;
  reference?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreditTransaction {
  id: string;
  customerId: string;
  type: 'credit_sale' | 'payment' | 'adjustment';
  amount: number;
  description: string;
  saleId?: string;
  balanceAfter: number;
  date: string;
  createdAt: string;
}

// Database Product Storage
export const databaseProductStorage = {
  async getAll(): Promise<OfflineProduct[]> {
    const products = await apiCall<any[]>('/products');
    return products.map(p => ({
      id: p.id.toString(),
      name: p.name,
      description: p.description || undefined,
      barcode: p.barcode || undefined,
      categoryId: p.category || undefined, // Map category to categoryId
      costPrice: p.costPrice || 0,
      sellingPrice: p.sellingPrice || 0,
      semiWholesalePrice: p.semiWholesalePrice || undefined,
      wholesalePrice: p.wholesalePrice || undefined,
      quantity: p.quantity || 0,
      minStockLevel: p.minStockLevel || undefined,
      unit: p.unit || undefined,
      image: p.image || undefined,
      active: p.active !== false,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt
    }));
  },

  async getById(id: string): Promise<OfflineProduct | null> {
    try {
      const product = await apiCall<any>(`/products/${id}`);
      return {
        id: product.id.toString(),
        name: product.name,
        description: product.description || undefined,
        barcode: product.barcode || undefined,
        categoryId: product.category || undefined, // Map category to categoryId
        costPrice: product.costPrice || 0,
        sellingPrice: product.sellingPrice || 0,
        semiWholesalePrice: product.semiWholesalePrice || undefined,
        wholesalePrice: product.wholesalePrice || undefined,
        quantity: product.quantity || 0,
        minStockLevel: product.minStockLevel || undefined,
        unit: product.unit || undefined,
        image: product.image || undefined,
        active: product.active !== false,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
      };
    } catch (error) {
      return null;
    }
  },

  async create(product: Omit<OfflineProduct, 'id' | 'createdAt' | 'updatedAt'>): Promise<OfflineProduct> {
    const created = await apiCall<any>('/products', {
      method: 'POST',
      body: JSON.stringify({
        name: product.name,
        description: product.description,
        barcode: product.barcode,
        categoryId: product.categoryId,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        semiWholesalePrice: product.semiWholesalePrice,
        wholesalePrice: product.wholesalePrice,
        quantity: product.quantity,
        minStockLevel: product.minStockLevel,
        unit: product.unit,
        image: product.image,
        active: product.active !== false
      })
    });

    return {
      id: created.id.toString(),
      name: created.name,
      description: created.description || undefined,
      barcode: created.barcode || undefined,
      categoryId: created.category || undefined, // Map category back to categoryId
      costPrice: created.costPrice || 0,
      sellingPrice: created.sellingPrice || 0,
      semiWholesalePrice: created.semiWholesalePrice || undefined,
      wholesalePrice: created.wholesalePrice || undefined,
      quantity: created.quantity || 0,
      minStockLevel: created.minStockLevel || undefined,
      unit: created.unit || undefined,
      image: created.image || undefined,
      active: created.active !== false,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt
    };
  },

  async update(id: string, updates: Partial<OfflineProduct>): Promise<OfflineProduct> {
    const updated = await apiCall<any>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: updates.name,
        description: updates.description,
        barcode: updates.barcode,
        categoryId: updates.categoryId,
        costPrice: updates.costPrice,
        sellingPrice: updates.sellingPrice,
        semiWholesalePrice: updates.semiWholesalePrice,
        wholesalePrice: updates.wholesalePrice,
        quantity: updates.quantity,
        minStockLevel: updates.minStockLevel,
        unit: updates.unit,
        image: updates.image,
        active: updates.active
      })
    });

    return {
      id: updated.id.toString(),
      name: updated.name,
      description: updated.description || undefined,
      barcode: updated.barcode || undefined,
      categoryId: updated.category || undefined, // Map category back to categoryId
      costPrice: updated.costPrice || 0,
      sellingPrice: updated.sellingPrice || 0,
      semiWholesalePrice: updated.semiWholesalePrice || undefined,
      wholesalePrice: updated.wholesalePrice || undefined,
      quantity: updated.quantity || 0,
      minStockLevel: updated.minStockLevel || undefined,
      unit: updated.unit || undefined,
      image: updated.image || undefined,
      active: updated.active !== false,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    };
  },

  async delete(id: string): Promise<boolean> {
    try {
      await apiCall(`/products/${id}`, { method: 'DELETE' });
      return true;
    } catch (error) {
      console.error('Error deleting product:', error);
      return false;
    }
  },

  async search(query: string): Promise<OfflineProduct[]> {
    const products = await this.getAll();
    const searchTerm = query.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(searchTerm) ||
      (p.barcode && p.barcode.toLowerCase().includes(searchTerm)) ||
      (p.description && p.description.toLowerCase().includes(searchTerm))
    );
  }
};

// Database Customer Storage
export const databaseCustomerStorage = {
  async getAll(): Promise<OfflineCustomer[]> {
    const customers = await apiCall<any[]>('/customers');
    return customers.map(c => ({
      id: c.id.toString(),
      name: c.name,
      phone: c.phone || undefined,
      email: c.email || undefined,
      address: c.address || undefined,
      creditLimit: c.creditLimit || 0,
      creditBalance: c.creditBalance || 0,
      notes: c.notes || undefined,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    }));
  },

  async getById(id: string): Promise<OfflineCustomer | null> {
    try {
      console.log('Fetching customer by ID:', id);
      
      // Try individual customer endpoint first
      try {
        const customer = await apiCall<any>(`/customers/${id}`);
        console.log('Customer API response:', customer);
        
        if (customer) {
          const mappedCustomer = {
            id: customer.id.toString(),
            name: customer.name,
            phone: customer.phone || undefined,
            email: customer.email || undefined,
            address: customer.address || undefined,
            creditLimit: customer.creditLimit || 0,
            creditBalance: customer.creditBalance || 0,
            notes: customer.notes || undefined,
            createdAt: customer.createdAt,
            updatedAt: customer.updatedAt
          };
          
          console.log('Mapped customer:', mappedCustomer);
          return mappedCustomer;
        }
      } catch (singleError) {
        console.warn('Single customer endpoint failed, falling back to getAll:', singleError);
      }
      
      // Fallback: get all customers and find the one we need
      console.log('Falling back to getAll customers and filtering by ID');
      const allCustomers = await this.getAll();
      const foundCustomer = allCustomers.find(c => c.id === id);
      
      if (foundCustomer) {
        console.log('Found customer via getAll fallback:', foundCustomer);
        return foundCustomer;
      }
      
      console.log('Customer not found in getAll results');
      return null;
    } catch (error) {
      console.error('Error fetching customer by ID:', error);
      return null;
    }
  },

  async create(customer: Omit<OfflineCustomer, 'id' | 'createdAt' | 'updatedAt'>): Promise<OfflineCustomer> {
    const created = await apiCall<any>('/customers', {
      method: 'POST',
      body: JSON.stringify(customer)
    });

    return {
      id: created.id.toString(),
      name: created.name,
      phone: created.phone || undefined,
      email: created.email || undefined,
      address: created.address || undefined,
      creditLimit: created.creditLimit || 0,
      creditBalance: created.creditBalance || 0,
      notes: created.notes || undefined,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt
    };
  },

  async update(id: string, updates: Partial<OfflineCustomer>): Promise<OfflineCustomer> {
    const updated = await apiCall<any>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });

    return {
      id: updated.id.toString(),
      name: updated.name,
      phone: updated.phone || undefined,
      email: updated.email || undefined,
      address: updated.address || undefined,
      creditLimit: updated.creditLimit || 0,
      creditBalance: updated.creditBalance || 0,
      notes: updated.notes || undefined,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    };
  },

  async delete(id: string): Promise<void> {
    await apiCall(`/customers/${id}`, { method: 'DELETE' });
  }
};

// Database Supplier Storage
export const databaseSupplierStorage = {
  async getAll(): Promise<OfflineSupplier[]> {
    const suppliers = await apiCall<any[]>('/suppliers');
    return suppliers.map(s => ({
      id: s.id.toString(),
      name: s.name,
      contactPerson: s.contactPerson || undefined,
      phone: s.phone || undefined,
      email: s.email || undefined,
      address: s.address || undefined,
      notes: s.notes || undefined,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    }));
  },

  async getById(id: string): Promise<OfflineSupplier | null> {
    try {
      const supplier = await apiCall<any>(`/suppliers/${id}`);
      return {
        id: supplier.id.toString(),
        name: supplier.name,
        contactPerson: supplier.contactPerson || undefined,
        phone: supplier.phone || undefined,
        email: supplier.email || undefined,
        address: supplier.address || undefined,
        notes: supplier.notes || undefined,
        createdAt: supplier.createdAt,
        updatedAt: supplier.updatedAt
      };
    } catch (error) {
      return null;
    }
  },

  async create(supplier: Omit<OfflineSupplier, 'id' | 'createdAt' | 'updatedAt'>): Promise<OfflineSupplier> {
    const created = await apiCall<any>('/suppliers', {
      method: 'POST',
      body: JSON.stringify(supplier)
    });

    return {
      id: created.id.toString(),
      name: created.name,
      contactPerson: created.contactPerson || undefined,
      phone: created.phone || undefined,
      email: created.email || undefined,
      address: created.address || undefined,
      notes: created.notes || undefined,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt
    };
  },

  async update(id: string, updates: Partial<OfflineSupplier>): Promise<OfflineSupplier> {
    const updated = await apiCall<any>(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });

    return {
      id: updated.id.toString(),
      name: updated.name,
      contactPerson: updated.contactPerson || undefined,
      phone: updated.phone || undefined,
      email: updated.email || undefined,
      address: updated.address || undefined,
      notes: updated.notes || undefined,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    };
  },

  async delete(id: string): Promise<void> {
    await apiCall(`/suppliers/${id}`, { method: 'DELETE' });
  }
};

// Database Sales Storage
export const databaseSalesStorage = {
  async getAll(): Promise<OfflineSale[]> {
    const sales = await apiCall<any[]>('/sales');
    return sales.map(s => ({
      id: s.id.toString(),
      invoiceNumber: s.invoiceNumber,
      date: s.date,
      customerId: s.customerId?.toString(),
      totalAmount: s.totalAmount,
      discountAmount: s.discountAmount || 0,
      taxAmount: s.taxAmount || 0,
      paidAmount: s.paidAmount,
      changeAmount: s.changeAmount || 0,
      paymentMethod: s.paymentMethod,
      status: s.status,
      notes: s.notes || undefined,
      items: s.items || [],
      createdAt: s.createdAt,
      updatedAt: s.updatedAt
    }));
  },

  async getById(id: string): Promise<OfflineSale | null> {
    try {
      const sale = await apiCall<any>(`/sales/${id}`);
      return {
        id: sale.id.toString(),
        invoiceNumber: sale.invoiceNumber,
        date: sale.date,
        customerId: sale.customerId?.toString(),
        totalAmount: sale.totalAmount,
        discountAmount: sale.discountAmount || 0,
        taxAmount: sale.taxAmount || 0,
        paidAmount: sale.paidAmount,
        changeAmount: sale.changeAmount || 0,
        paymentMethod: sale.paymentMethod,
        status: sale.status,
        notes: sale.notes || undefined,
        items: sale.items || [],
        createdAt: sale.createdAt,
        updatedAt: sale.updatedAt
      };
    } catch (error) {
      return null;
    }
  },

  async create(sale: Omit<OfflineSale, 'id' | 'createdAt' | 'updatedAt'>): Promise<OfflineSale> {
    const created = await apiCall<any>('/sales', {
      method: 'POST',
      body: JSON.stringify(sale)
    });

    return {
      id: created.id.toString(),
      invoiceNumber: created.invoiceNumber,
      date: created.date,
      customerId: created.customerId?.toString(),
      totalAmount: created.totalAmount,
      discountAmount: created.discountAmount || 0,
      taxAmount: created.taxAmount || 0,
      paidAmount: created.paidAmount,
      changeAmount: created.changeAmount || 0,
      paymentMethod: created.paymentMethod,
      status: created.status,
      notes: created.notes || undefined,
      items: created.items || [],
      createdAt: created.createdAt,
      updatedAt: created.updatedAt
    };
  }
};

// Database Product Stock Storage
export const databaseProductStockStorage = {
  async getAll(): Promise<OfflineProductStock[]> {
    const stocks = await apiCall<any[]>('/product-stock');
    return stocks.map(s => ({
      id: s.id.toString(),
      productId: s.productId.toString(),
      locationId: s.locationId,
      quantity: s.quantity,
      minStockLevel: s.minStockLevel || 0,
      updatedAt: s.updatedAt
    }));
  },

  async getByProductAndLocation(productId: string, locationId: string): Promise<OfflineProductStock | null> {
    try {
      const stock = await apiCall<any>(`/product-stock/${productId}/${locationId}`);
      if (!stock) return null;
      
      return {
        id: stock.id.toString(),
        productId: stock.productId.toString(),
        locationId: stock.locationId,
        quantity: stock.quantity,
        minStockLevel: stock.minStockLevel || 0,
        updatedAt: stock.updatedAt
      };
    } catch (error) {
      return null;
    }
  },

  async upsert(stockData: Omit<OfflineProductStock, 'id' | 'updatedAt'>): Promise<OfflineProductStock> {
    const upserted = await apiCall<any>('/product-stock/upsert', {
      method: 'PUT',
      body: JSON.stringify({
        productId: stockData.productId,
        locationId: stockData.locationId,
        quantity: stockData.quantity,
        minStockLevel: stockData.minStockLevel
      })
    });
    
    return {
      id: upserted.id.toString(),
      productId: upserted.productId.toString(),
      locationId: upserted.locationId,
      quantity: upserted.quantity,
      minStockLevel: upserted.minStockLevel || 0,
      updatedAt: upserted.updatedAt
    };
  },

  async updateQuantity(productId: string, locationId: string, quantity: number): Promise<OfflineProductStock | null> {
    const existing = await this.getByProductAndLocation(productId, locationId);
    return await this.upsert({
      productId,
      locationId,
      quantity,
      minStockLevel: existing?.minStockLevel || 0
    });
  },

  async getByProduct(productId: string): Promise<OfflineProductStock[]> {
    const stocks = await this.getAll();
    return stocks.filter(s => s.productId === productId);
  },

  async getByLocation(locationId: string): Promise<OfflineProductStock[]> {
    const stocks = await this.getAll();
    return stocks.filter(s => s.locationId === locationId);
  },

  async getTotalQuantity(productId: string): Promise<number> {
    const stocks = await this.getByProduct(productId);
    return stocks.reduce((total, stock) => total + stock.quantity, 0);
  }
};

// Database Order Storage
export const databaseOrderStorage = {
  async getAll(): Promise<OfflineOrder[]> {
    const orders = await apiCall<any[]>('/orders');
    return orders.map(o => ({
      id: o.id.toString(),
      orderNumber: o.orderNumber,
      date: new Date(o.orderDate || o.date),
      supplierId: o.supplierId?.toString() || null,
      totalAmount: o.totalAmount || o.total || 0,
      status: o.status || 'pending',
      notes: o.notes || null,
      items: []
    }));
  },

  async create(order: Omit<OfflineOrder, 'id'>): Promise<OfflineOrder> {
    const created = await apiCall<any>('/orders', {
      method: 'POST',
      body: JSON.stringify({
        orderNumber: order.orderNumber,
        date: order.date,
        supplierId: order.supplierId,
        totalAmount: order.totalAmount,
        status: order.status,
        notes: order.notes
      })
    });

    return {
      id: created.id.toString(),
      orderNumber: created.orderNumber,
      date: new Date(created.date),
      supplierId: created.supplierId?.toString() || null,
      totalAmount: created.totalAmount || 0,
      status: created.status || 'pending',
      notes: created.notes || null,
      items: []
    };
  }
};

// Database Settings Storage
export const databaseSettingsStorage = {
  async get(): Promise<OfflineSettings | null> {
    try {
      const settings = await apiCall<any[]>('/settings');
      if (!settings || settings.length === 0) return null;
      
      const s = settings[0];
      return {
        id: s.id.toString(),
        businessName: s.businessName,
        businessAddress: s.businessAddress,
        businessPhone: s.businessPhone,
        businessEmail: s.businessEmail,
        taxRate: s.taxRate,
        currency: s.currency,
        receiptFooter: s.receiptFooter,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt
      };
    } catch (error) {
      return null;
    }
  },

  async update(settings: Partial<OfflineSettings>): Promise<OfflineSettings> {
    const updated = await apiCall<any>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });

    return {
      id: updated.id.toString(),
      businessName: updated.businessName,
      businessAddress: updated.businessAddress,
      businessPhone: updated.businessPhone,
      businessEmail: updated.businessEmail,
      taxRate: updated.taxRate,
      currency: updated.currency,
      receiptFooter: updated.receiptFooter,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt
    };
  }
};

// Database Sale Items Storage
export const databaseSaleItemsStorage = {
  async getBySaleId(saleId: string): Promise<OfflineSaleItem[]> {
    const items = await apiCall<any[]>(`/sale-items/sale/${saleId}`);
    return items.map(i => ({
      id: i.id.toString(),
      saleId: i.saleId.toString(),
      productId: i.productId.toString(),
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      totalPrice: i.totalPrice,
      createdAt: i.createdAt,
      updatedAt: i.updatedAt
    }));
  },

  async create(saleItem: Omit<OfflineSaleItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<OfflineSaleItem> {
    const created = await apiCall<any>('/sale-items', {
      method: 'POST',
      body: JSON.stringify(saleItem)
    });

    return {
      id: created.id.toString(),
      saleId: created.saleId.toString(),
      productId: created.productId.toString(),
      productName: created.productName,
      quantity: created.quantity,
      unitPrice: created.unitPrice,
      totalPrice: created.totalPrice,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt
    };
  }
};

// Additional interfaces and helpers needed by POS page
export interface OfflineCategory {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineSalesPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OfflineProductStock {
  id?: string;
  productId: string;
  locationId: string;
  quantity: number;
  minStockLevel: number;
  updatedAt: string;
}

// Real database storage for categories
export const offlineCategoryStorage = {
  async getAll(): Promise<OfflineCategory[]> {
    try {
      const categories = await apiCall<any[]>('/categories');
      return categories.map(c => ({
        id: c.id.toString(),
        name: c.name,
        description: c.description,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      }));
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  },

  async create(category: Omit<OfflineCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<OfflineCategory> {
    try {
      const newCategory = await apiCall<any>('/categories', {
        method: 'POST',
        body: JSON.stringify(category)
      });
      return {
        id: newCategory.id.toString(),
        name: newCategory.name,
        description: newCategory.description,
        createdAt: newCategory.createdAt,
        updatedAt: newCategory.updatedAt
      };
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  },

  async update(id: string, category: Partial<Omit<OfflineCategory, 'id' | 'createdAt' | 'updatedAt'>>): Promise<OfflineCategory> {
    try {
      const updatedCategory = await apiCall<any>(`/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(category)
      });
      return {
        id: updatedCategory.id.toString(),
        name: updatedCategory.name,
        description: updatedCategory.description,
        createdAt: updatedCategory.createdAt,
        updatedAt: updatedCategory.updatedAt
      };
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await apiCall(`/categories/${id}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }
};

// Real database storage for stock locations
export const offlineStockLocationStorage = {
  async getAll(): Promise<OfflineStockLocation[]> {
    try {
      const locations = await apiCall<any[]>('/stock-locations');
      return locations.map(l => ({
        id: l.id.toString(),
        name: l.name,
        description: l.description,
        isPrimary: l.isPrimary || false,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt
      }));
    } catch (error) {
      console.error('Error fetching stock locations:', error);
      return [];
    }
  },

  async create(location: Omit<OfflineStockLocation, 'id' | 'createdAt' | 'updatedAt'>): Promise<OfflineStockLocation> {
    try {
      const newLocation = await apiCall<any>('/stock-locations', {
        method: 'POST',
        body: JSON.stringify(location)
      });
      return {
        id: newLocation.id.toString(),
        name: newLocation.name,
        description: newLocation.description,
        isPrimary: newLocation.isPrimary || false,
        createdAt: newLocation.createdAt,
        updatedAt: newLocation.updatedAt
      };
    } catch (error) {
      console.error('Error creating stock location:', error);
      throw error;
    }
  },

  async update(id: string, updates: Partial<OfflineStockLocation>): Promise<OfflineStockLocation> {
    try {
      const updatedLocation = await apiCall<any>(`/stock-locations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      return {
        id: updatedLocation.id.toString(),
        name: updatedLocation.name,
        description: updatedLocation.description,
        isPrimary: updatedLocation.isPrimary || false,
        createdAt: updatedLocation.createdAt,
        updatedAt: updatedLocation.updatedAt
      };
    } catch (error) {
      console.error('Error updating stock location:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await apiCall(`/stock-locations/${id}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error deleting stock location:', error);
      throw error;
    }
  }
};

// Mock storage for sales periods
export const offlineSalesPeriodStorage = {
  async getAll(): Promise<OfflineSalesPeriod[]> {
    return [];
  },
  
  getCurrentPeriod(): OfflineSalesPeriod | null {
    // Return a default current period for POS functionality
    return {
      id: 'current',
      name: 'Current Period',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
};

// Real database storage for inventory count items
export const offlineInventoryCountItemStorage = {
  async getAll(): Promise<OfflineInventoryCountItem[]> {
    try {
      const items = await apiCall<any[]>('/inventory-count-items');
      return items.map(i => ({
        id: i.id.toString(),
        countId: i.countId.toString(),
        productId: i.productId.toString(),
        expectedQuantity: i.expectedQuantity,
        actualQuantity: i.actualQuantity,
        variance: i.variance,
        notes: i.notes,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt
      }));
    } catch (error) {
      console.error('Error fetching inventory count items:', error);
      return [];
    }
  },
  
  async getByCountId(countId: string): Promise<OfflineInventoryCountItem[]> {
    try {
      const items = await apiCall<any[]>(`/inventory-count-items/count/${countId}`);
      return items.map(i => ({
        id: i.id.toString(),
        countId: i.countId.toString(),
        productId: i.productId.toString(),
        expectedQuantity: i.expectedQuantity,
        actualQuantity: i.actualQuantity,
        variance: i.variance,
        notes: i.notes,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt
      }));
    } catch (error) {
      console.error('Error fetching inventory count items:', error);
      return [];
    }
  },
  
  async create(item: Omit<OfflineInventoryCountItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<OfflineInventoryCountItem> {
    try {
      const newItem = await apiCall<any>('/inventory-count-items', {
        method: 'POST',
        body: JSON.stringify({
          countId: parseInt(item.countId),
          productId: parseInt(item.productId),
          expectedQuantity: item.expectedQuantity,
          actualQuantity: item.actualQuantity,
          variance: item.variance,
          notes: item.notes
        })
      });
      return {
        id: newItem.id.toString(),
        countId: newItem.countId.toString(),
        productId: newItem.productId.toString(),
        expectedQuantity: newItem.expectedQuantity,
        actualQuantity: newItem.actualQuantity,
        variance: newItem.variance,
        notes: newItem.notes,
        createdAt: newItem.createdAt,
        updatedAt: newItem.updatedAt
      };
    } catch (error) {
      console.error('Error creating inventory count item:', error);
      throw error;
    }
  },
  
  async update(id: string, updates: Partial<OfflineInventoryCountItem>): Promise<OfflineInventoryCountItem | null> {
    try {
      const updated = await apiCall<any>(`/inventory-count-items/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      return {
        id: updated.id.toString(),
        countId: updated.countId.toString(),
        productId: updated.productId.toString(),
        expectedQuantity: updated.expectedQuantity,
        actualQuantity: updated.actualQuantity,
        variance: updated.variance,
        notes: updated.notes,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt
      };
    } catch (error) {
      console.error('Error updating inventory count item:', error);
      return null;
    }
  },
  
  async delete(id: string): Promise<void> {
    try {
      await apiCall(`/inventory-count-items/${id}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error deleting inventory count item:', error);
      throw error;
    }
  }
};

// Real database storage for stock transactions
export const offlineStockTransactionStorage = {
  async getAll(): Promise<OfflineStockTransaction[]> {
    try {
      const transactions = await apiCall<any[]>('/stock-transactions');
      return transactions.map(t => ({
        id: t.id.toString(),
        productId: t.productId.toString(),
        warehouseId: t.warehouseId,
        type: t.type,
        quantity: t.quantity,
        previousQuantity: t.previousQuantity,
        newQuantity: t.newQuantity,
        reason: t.reason,
        reference: t.reference,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt || t.createdAt
      }));
    } catch (error) {
      console.error('Error fetching stock transactions:', error);
      return [];
    }
  },
  
  async getByProductId(productId: string): Promise<OfflineStockTransaction[]> {
    try {
      const transactions = await apiCall<any[]>(`/stock-transactions/product/${productId}`);
      return transactions.map(t => ({
        id: t.id.toString(),
        productId: t.productId.toString(),
        warehouseId: t.warehouseId,
        type: t.type,
        quantity: t.quantity,
        previousQuantity: t.previousQuantity,
        newQuantity: t.newQuantity,
        reason: t.reason,
        reference: t.reference,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt || t.createdAt
      }));
    } catch (error) {
      console.error('Error fetching product stock transactions:', error);
      return [];
    }
  },
  
  async create(transaction: Omit<OfflineStockTransaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<OfflineStockTransaction> {
    try {
      const newTransaction = await apiCall<any>('/stock-transactions', {
        method: 'POST',
        body: JSON.stringify({
          productId: parseInt(transaction.productId),
          warehouseId: transaction.warehouseId,
          type: transaction.type,
          quantity: transaction.quantity,
          previousQuantity: transaction.previousQuantity,
          newQuantity: transaction.newQuantity,
          reason: transaction.reason,
          reference: transaction.reference
        })
      });
      return {
        id: newTransaction.id.toString(),
        productId: newTransaction.productId.toString(),
        warehouseId: newTransaction.warehouseId,
        type: newTransaction.type,
        quantity: newTransaction.quantity,
        previousQuantity: newTransaction.previousQuantity,
        newQuantity: newTransaction.newQuantity,
        reason: newTransaction.reason,
        reference: newTransaction.reference,
        createdAt: newTransaction.createdAt,
        updatedAt: newTransaction.updatedAt || newTransaction.createdAt
      };
    } catch (error) {
      console.error('Error creating stock transaction:', error);
      throw error;
    }
  }
};

// Real database storage for inventory counts
export const offlineInventoryCountStorage = {
  async getAll(): Promise<OfflineInventoryCount[]> {
    try {
      const counts = await apiCall<any[]>('/inventory-counts');
      return counts.map(c => ({
        id: c.id.toString(),
        name: c.name,
        locationId: c.locationId,
        status: c.status,
        startDate: c.startDate,
        endDate: c.endDate,
        notes: c.notes,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt
      }));
    } catch (error) {
      console.error('Error fetching inventory counts:', error);
      return [];
    }
  },
  
  async getById(id: string): Promise<OfflineInventoryCount | null> {
    try {
      const count = await apiCall<any>(`/inventory-counts/${id}`);
      return {
        id: count.id.toString(),
        name: count.name,
        locationId: count.locationId,
        status: count.status,
        startDate: count.startDate,
        endDate: count.endDate,
        notes: count.notes,
        createdAt: count.createdAt,
        updatedAt: count.updatedAt
      };
    } catch (error) {
      console.error('Error fetching inventory count:', error);
      return null;
    }
  },
  
  async create(count: Omit<OfflineInventoryCount, 'id' | 'createdAt' | 'updatedAt'>): Promise<OfflineInventoryCount> {
    try {
      const newCount = await apiCall<any>('/inventory-counts', {
        method: 'POST',
        body: JSON.stringify(count)
      });
      return {
        id: newCount.id.toString(),
        name: newCount.name,
        locationId: newCount.locationId,
        status: newCount.status,
        startDate: newCount.startDate,
        endDate: newCount.endDate,
        notes: newCount.notes,
        createdAt: newCount.createdAt,
        updatedAt: newCount.updatedAt
      };
    } catch (error) {
      console.error('Error creating inventory count:', error);
      throw error;
    }
  },
  
  async update(id: string, updates: Partial<OfflineInventoryCount>): Promise<OfflineInventoryCount | null> {
    try {
      const updated = await apiCall<any>(`/inventory-counts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      return {
        id: updated.id.toString(),
        name: updated.name,
        locationId: updated.locationId,
        status: updated.status,
        startDate: updated.startDate,
        endDate: updated.endDate,
        notes: updated.notes,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt
      };
    } catch (error) {
      console.error('Error updating inventory count:', error);
      return null;
    }
  },
  
  async delete(id: string): Promise<void> {
    try {
      await apiCall(`/inventory-counts/${id}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error('Error deleting inventory count:', error);
      throw error;
    }
  }
};

// Real database storage for purchase order items (using existing order items table)
export const offlinePurchaseOrderItemStorage = {
  async getAll(): Promise<OfflineOrderItem[]> {
    try {
      const items = await apiCall<any[]>('/order-items');
      return items.map(i => ({
        id: i.id.toString(),
        productId: i.productId.toString(),
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice
      }));
    } catch (error) {
      console.error('Error fetching order items:', error);
      return [];
    }
  },
  
  async getByOrderId(orderId: string): Promise<OfflineOrderItem[]> {
    try {
      const items = await apiCall<any[]>(`/order-items/order/${orderId}`);
      return items.map(i => ({
        id: i.id.toString(),
        productId: i.productId.toString(),
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice
      }));
    } catch (error) {
      console.error('Error fetching order items:', error);
      return [];
    }
  },
  
  async create(item: Omit<OfflineOrderItem, 'id'>): Promise<OfflineOrderItem> {
    try {
      const newItem = await apiCall<any>('/order-items', {
        method: 'POST',
        body: JSON.stringify({
          productId: parseInt(item.productId),
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        })
      });
      return {
        id: newItem.id.toString(),
        productId: newItem.productId.toString(),
        quantity: newItem.quantity,
        unitPrice: newItem.unitPrice,
        totalPrice: newItem.totalPrice
      };
    } catch (error) {
      console.error('Error creating order item:', error);
      throw error;
    }
  }
};

// Real database storage for supplier payments
export const offlineSupplierPaymentStorage = {
  async getAll(): Promise<OfflineSupplierPayment[]> {
    try {
      const payments = await apiCall<any[]>('/supplier-payments');
      return payments.map(p => ({
        id: p.id.toString(),
        supplierId: p.supplierId.toString(),
        amount: p.amount,
        paymentMethod: p.paymentMethod,
        reference: p.reference,
        notes: p.notes,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      }));
    } catch (error) {
      console.error('Error fetching supplier payments:', error);
      return [];
    }
  },
  
  async getBySupplierId(supplierId: string): Promise<OfflineSupplierPayment[]> {
    try {
      const payments = await apiCall<any[]>(`/supplier-payments/supplier/${supplierId}`);
      return payments.map(p => ({
        id: p.id.toString(),
        supplierId: p.supplierId.toString(),
        amount: p.amount,
        paymentMethod: p.paymentMethod,
        reference: p.reference,
        notes: p.notes,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      }));
    } catch (error) {
      console.error('Error fetching supplier payments:', error);
      return [];
    }
  },
  
  async create(payment: Omit<OfflineSupplierPayment, 'id' | 'createdAt' | 'updatedAt'>): Promise<OfflineSupplierPayment> {
    try {
      const newPayment = await apiCall<any>('/supplier-payments', {
        method: 'POST',
        body: JSON.stringify({
          supplierId: parseInt(payment.supplierId),
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
          reference: payment.reference,
          notes: payment.notes
        })
      });
      return {
        id: newPayment.id.toString(),
        supplierId: newPayment.supplierId.toString(),
        amount: newPayment.amount,
        paymentMethod: newPayment.paymentMethod,
        reference: newPayment.reference,
        notes: newPayment.notes,
        createdAt: newPayment.createdAt,
        updatedAt: newPayment.updatedAt
      };
    } catch (error) {
      console.error('Error creating supplier payment:', error);
      throw error;
    }
  }
};

// Credit Transaction Interface
export interface CreditTransaction {
  id: string;
  customerId: string;
  type: 'credit_sale' | 'payment' | 'adjustment';
  amount: number;
  description: string;
  saleId?: string;
  balanceAfter: number;
  date: string;
  createdAt: string;
}

// In-memory credit transaction storage (with localStorage persistence)
const CREDIT_TRANSACTIONS_KEY = 'stocksage_credit_transactions';

const creditTransactionStorage = {
  getAll: (): CreditTransaction[] => {
    try {
      const stored = localStorage.getItem(CREDIT_TRANSACTIONS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading credit transactions:', error);
      return [];
    }
  },

  save: (transactions: CreditTransaction[]) => {
    try {
      localStorage.setItem(CREDIT_TRANSACTIONS_KEY, JSON.stringify(transactions));
    } catch (error) {
      console.error('Error saving credit transactions:', error);
    }
  },

  getByCustomerId: (customerId: string): CreditTransaction[] => {
    const allTransactions = creditTransactionStorage.getAll();
    return allTransactions.filter(t => t.customerId === customerId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  create: (transaction: Omit<CreditTransaction, 'id' | 'createdAt'>): CreditTransaction => {
    const newTransaction: CreditTransaction = {
      ...transaction,
      id: `credit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString()
    };
    
    const transactions = creditTransactionStorage.getAll();
    transactions.push(newTransaction);
    creditTransactionStorage.save(transactions);
    
    return newTransaction;
  }
};

// Helper functions
export const creditHelpers = {
  calculateCreditBalance: (customer: OfflineCustomer): number => {
    return customer.creditBalance || 0;
  },

  addCreditSale: async (customerId: string, amount: number, saleId: string) => {
    try {
      console.log('Adding credit sale:', { customerId, amount, saleId });
      
      // Get current customer to calculate balance after
      const customer = await databaseCustomerStorage.getById(customerId);
      const currentBalance = customer?.creditBalance || 0;
      const balanceAfter = currentBalance + amount;
      
      // Create credit transaction record
      const transaction = creditTransactionStorage.create({
        customerId,
        type: 'credit_sale',
        amount,
        description: `Credit sale - Invoice #${saleId}`,
        saleId,
        balanceAfter,
        date: new Date().toISOString()
      });
      
      console.log('Credit sale transaction created:', transaction);
      
      // Try to save to API as well (optional, for future database persistence)
      try {
        await apiCall('/customer-credits', {
          method: 'POST',
          body: JSON.stringify({
            customerId: parseInt(customerId),
            amount,
            saleId,
            type: 'credit_sale',
            description: transaction.description,
            balanceAfter,
            date: new Date().toISOString()
          })
        });
        console.log('Credit transaction also saved to database');
      } catch (apiError) {
        console.warn('Failed to save credit transaction to database, but localStorage saved:', apiError);
      }
      
      return transaction;
    } catch (error) {
      console.error('Error adding credit sale:', error);
      throw error;
    }
  },

  addCreditPayment: async (customerId: string, amount: number, note: string) => {
    try {
      console.log('=== STARTING CREDIT PAYMENT ===');
      console.log('Adding credit payment:', { customerId, amount, note });
      
      // Update customer credit balance
      const customer = await databaseCustomerStorage.getById(customerId);
      console.log('Found customer:', customer);
      
      if (!customer) {
        throw new Error(`Customer with ID ${customerId} not found`);
      }
      
      const currentBalance = customer.creditBalance || 0;
      const newBalance = Math.max(0, currentBalance - amount);
      const balanceAfter = newBalance;
      
      console.log('Balance calculation:', { currentBalance, amount, newBalance });
      
      // Update customer balance in database
      const updatedCustomer = await databaseCustomerStorage.update(customerId, {
        creditBalance: newBalance
      });
      console.log('Customer updated in database:', updatedCustomer);
      
      // Create credit transaction record
      const transaction = creditTransactionStorage.create({
        customerId,
        type: 'payment',
        amount: -amount, // Negative for payment
        description: note || `Credit payment - ${new Date().toLocaleDateString()}`,
        balanceAfter,
        date: new Date().toISOString()
      });
      
      console.log('Credit payment transaction created:', transaction);
      
      // Verify transaction was saved to localStorage
      const allTransactions = creditTransactionStorage.getByCustomerId(customerId);
      console.log('All transactions for customer after payment:', allTransactions);
      
      // Try to save to API as well (optional)
      try {
        await apiCall('/customer-credits', {
          method: 'POST',
          body: JSON.stringify({
            customerId: parseInt(customerId),
            amount: -amount,
            type: 'payment',
            description: transaction.description,
            balanceAfter,
            date: new Date().toISOString()
          })
        });
        console.log('Credit payment also saved to database');
      } catch (apiError) {
        console.warn('Failed to save credit payment to database, but localStorage saved:', apiError);
      }
      
      console.log('=== CREDIT PAYMENT COMPLETED ===');
      return transaction;
    } catch (error) {
      console.error('Error adding credit payment:', error);
      throw error;
    }
  },

  getCustomerCreditInfo: async (customerIdOrCustomer: string | OfflineCustomer) => {
    try {
      let customer: OfflineCustomer;
      
      if (typeof customerIdOrCustomer === 'string') {
        // If it's a customer ID, fetch the customer data
        const fetchedCustomer = await databaseCustomerStorage.getById(customerIdOrCustomer);
        if (!fetchedCustomer) {
          return {
            currentBalance: 0,
            creditLimit: 0,
            availableCredit: 0,
            transactions: []
          };
        }
        customer = fetchedCustomer;
      } else {
        // If it's already a customer object
        customer = customerIdOrCustomer;
      }

      // Get credit transactions from localStorage
      const transactions = creditTransactionStorage.getByCustomerId(customer.id);
      
      console.log('Credit info loaded:', {
        currentBalance: customer.creditBalance || 0,
        creditLimit: customer.creditLimit || 0,
        availableCredit: (customer.creditLimit || 0) - (customer.creditBalance || 0),
        transactions: transactions
      });
      
      return {
        currentBalance: customer.creditBalance || 0,
        creditLimit: customer.creditLimit || 0,
        availableCredit: (customer.creditLimit || 0) - (customer.creditBalance || 0),
        transactions: transactions
      };
    } catch (error) {
      console.error('Error getting customer credit info:', error);
      return {
        currentBalance: 0,
        creditLimit: 0,
        availableCredit: 0,
        transactions: []
      };
    }
  }
};

export const salesPeriodHelpers = {
  getCurrentPeriod: async (): Promise<OfflineSalesPeriod | null> => {
    try {
      const periods = await offlineSalesPeriodStorage.getAll();
      return periods.find((p: OfflineSalesPeriod) => p.isActive) || null;
    } catch (error) {
      console.error('Error getting current period:', error);
      return null;
    }
  },
  
  getTodaysSalesData: async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const sales = await databaseSalesStorage.getAll();
      const todaysSales = sales.filter((sale: OfflineSale) => 
        sale.date && sale.date.startsWith(today)
      );
      
      const totalSales = todaysSales.reduce((sum: number, sale: OfflineSale) => sum + (sale.totalAmount || 0), 0);
      const totalTransactions = todaysSales.length;
      
      return {
        totalSales,
        totalTransactions,
        sales: todaysSales
      };
    } catch (error) {
      console.error('Error getting today\'s sales data:', error);
      return {
        totalSales: 0,
        totalTransactions: 0,
        sales: []
      };
    }
  },

  updatePeriodStats: async (periodId: string, stats: any) => {
    try {
      await apiCall(`/sales-periods/${periodId}`, {
        method: 'PUT',
        body: JSON.stringify(stats)
      });
    } catch (error) {
      console.error('Error updating period stats:', error);
    }
  },

  openSalesPeriod: async (name: string, openingBalance: number) => {
    try {
      const period = await apiCall('/sales-periods', {
        method: 'POST',
        body: JSON.stringify({
          name,
          startDate: new Date().toISOString(),
          endDate: new Date().toISOString(),
          isActive: true,
          openingBalance
        })
      });
      return period;
    } catch (error) {
      console.error('Error opening sales period:', error);
      throw error;
    }
  },

  closeSalesPeriod: async (periodId: string) => {
    try {
      await apiCall(`/sales-periods/${periodId}`, {
        method: 'PUT',
        body: JSON.stringify({
          isActive: false,
          endDate: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Error closing sales period:', error);
      throw error;
    }
  }
};

// Low stock helpers
export const lowStockHelpers = {
  isLowStockAlertsEnabled: (): boolean => {
    // For now, always return true - this could be configurable via settings
    return true;
  },

  getLowStockProducts: async (): Promise<OfflineProduct[]> => {
    try {
      const products = await databaseProductStorage.getAll();
      return products.filter((product: OfflineProduct) => 
        product.minStockLevel && 
        product.quantity <= product.minStockLevel
      );
    } catch (error) {
      console.error('Error getting low stock products:', error);
      return [];
    }
  }
};

// Types are already exported above

// Export the database storage as the main offline storage
export { 
  databaseProductStorage as offlineProductStorage,
  databaseCustomerStorage as offlineCustomerStorage,
  databaseSupplierStorage as offlineSupplierStorage,
  databaseSalesStorage as offlineSalesStorage,
  databaseOrderStorage as offlineOrderStorage,
  databaseSettingsStorage as offlineSettingsStorage,
  databaseSaleItemsStorage as offlineSaleItemsStorage,
  databaseProductStockStorage as offlineProductStockStorage
};
