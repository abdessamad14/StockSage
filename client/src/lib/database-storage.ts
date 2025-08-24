// Database-only storage layer for StockSage
import { OfflineProduct, OfflineOrder } from './offline-storage';

// Define types based on SQLite schema
interface OfflineCustomer {
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

interface OfflineSupplier {
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

interface OfflineSale {
  id: string;
  invoiceNumber: string;
  date: string;
  customerId?: string;
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

interface OfflineSaleItem {
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

interface OfflineSettings {
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

// Database Product Storage
export const databaseProductStorage = {
  async getAll(): Promise<OfflineProduct[]> {
    const products = await apiCall<any[]>('/products');
    return products.map(p => ({
      id: p.id.toString(),
      name: p.name,
      description: p.description || undefined,
      barcode: p.barcode || undefined,
      categoryId: p.categoryId || undefined,
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
        categoryId: product.categoryId || undefined,
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
      categoryId: created.categoryId || undefined,
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
      categoryId: updated.categoryId || undefined,
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
      const customer = await apiCall<any>(`/customers/${id}`);
      return {
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
    } catch (error) {
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

// Mock storage for categories (not implemented in backend yet)
export const offlineCategoryStorage = {
  async getAll(): Promise<OfflineCategory[]> {
    return [];
  }
};

// Mock storage for stock locations
export const offlineStockLocationStorage = {
  async getAll(): Promise<any[]> {
    return [{ id: 'main', name: 'Main Warehouse' }];
  }
};

// Mock storage for sales periods
export const offlineSalesPeriodStorage = {
  async getAll(): Promise<OfflineSalesPeriod[]> {
    return [];
  }
};

// Helper functions
export const creditHelpers = {
  calculateCreditBalance: (customer: OfflineCustomer): number => {
    return customer.creditBalance || 0;
  }
};

export const salesPeriodHelpers = {
  getCurrentPeriod: (): OfflineSalesPeriod | null => {
    return null;
  }
};

// Export types
export type { OfflineCustomer, OfflineSupplier, OfflineSale, OfflineSaleItem, OfflineSettings };

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
