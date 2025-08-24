// Hybrid storage layer: localStorage cache + SQLite database persistence
import { OfflineProduct } from './offline-storage';

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

interface OfflineCategory {
  id: string;
  name: string;
  description?: string;
  color?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const API_BASE = '/api/offline';

// Configuration: Use database or localStorage
const USE_DATABASE = true; // Set to false to use only localStorage

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
    throw new Error(`API call failed: ${response.statusText}`);
  }
  
  return response.json();
}

// Hybrid Product Storage
export const hybridProductStorage = {
  async getAll(): Promise<OfflineProduct[]> {
    if (!USE_DATABASE) {
      // Fallback to localStorage
      const data = localStorage.getItem('offline_products');
      return data ? JSON.parse(data) : [];
    }
    
    try {
      const products = await apiCall<any[]>('/products');
      
      // Convert database format to OfflineProduct format
      return products.map(p => ({
        id: p.id.toString(),
        name: p.name,
        barcode: p.barcode,
        description: p.description,
        categoryId: p.category,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        quantity: p.quantity,
        minStockLevel: p.minStockLevel,
        unit: p.unit,
        image: p.image,
        active: p.active,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Database error, falling back to localStorage:', error);
      const data = localStorage.getItem('offline_products');
      return data ? JSON.parse(data) : [];
    }
  },

  async create(product: Omit<OfflineProduct, 'id'>): Promise<OfflineProduct> {
    if (!USE_DATABASE) {
      // Fallback to localStorage
      const products = await this.getAll();
      const newProduct = {
        ...product,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      products.push(newProduct);
      localStorage.setItem('offline_products', JSON.stringify(products));
      return newProduct;
    }
    
    try {
      // Convert to database format
      const dbProduct = {
        name: product.name,
        barcode: product.barcode,
        description: product.description,
        category: product.categoryId,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        quantity: product.quantity,
        minStockLevel: product.minStockLevel,
        unit: product.unit,
        image: product.image,
        active: product.active
      };
      
      const created = await apiCall<any>('/products', {
        method: 'POST',
        body: JSON.stringify(dbProduct)
      });
      
      // Convert back to OfflineProduct format
      return {
        id: created.id.toString(),
        name: created.name,
        barcode: created.barcode,
        description: created.description,
        categoryId: created.category,
        costPrice: created.costPrice,
        sellingPrice: created.sellingPrice,
        quantity: created.quantity,
        minStockLevel: created.minStockLevel,
        unit: created.unit,
        image: created.image,
        active: created.active,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Database error, falling back to localStorage:', error);
      // Fallback to localStorage without recursion
      const products = JSON.parse(localStorage.getItem('offline_products') || '[]');
      const newProduct = {
        ...product,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      products.push(newProduct);
      localStorage.setItem('offline_products', JSON.stringify(products));
      return newProduct;
    }
  },

  async update(id: string, updates: Partial<OfflineProduct>): Promise<OfflineProduct | null> {
    if (!USE_DATABASE) {
      // Fallback to localStorage
      const products = await this.getAll();
      const index = products.findIndex(p => p.id === id);
      if (index === -1) return null;
      
      products[index] = { ...products[index], ...updates, updatedAt: new Date().toISOString() };
      localStorage.setItem('offline_products', JSON.stringify(products));
      return products[index];
    }
    
    try {
      // Convert to database format
      const dbUpdates: any = {};
      if (updates.name) dbUpdates.name = updates.name;
      if (updates.barcode) dbUpdates.barcode = updates.barcode;
      if (updates.description) dbUpdates.description = updates.description;
      if (updates.categoryId) dbUpdates.category = updates.categoryId;
      if (updates.costPrice !== undefined) dbUpdates.costPrice = updates.costPrice;
      if (updates.sellingPrice !== undefined) dbUpdates.sellingPrice = updates.sellingPrice;
      if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
      if (updates.minStockLevel !== undefined) dbUpdates.minStockLevel = updates.minStockLevel;
      if (updates.unit) dbUpdates.unit = updates.unit;
      if (updates.image) dbUpdates.image = updates.image;
      if (updates.active !== undefined) dbUpdates.active = updates.active;
      
      const updated = await apiCall<any>(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(dbUpdates)
      });
      
      // Convert back to OfflineProduct format
      return {
        id: updated.id.toString(),
        name: updated.name,
        barcode: updated.barcode,
        description: updated.description,
        categoryId: updated.category,
        costPrice: updated.costPrice,
        sellingPrice: updated.sellingPrice,
        quantity: updated.quantity,
        minStockLevel: updated.minStockLevel,
        unit: updated.unit,
        image: updated.image,
        active: updated.active,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Database error, falling back to localStorage:', error);
      // Fallback to localStorage without recursion
      const products = JSON.parse(localStorage.getItem('offline_products') || '[]');
      const index = products.findIndex((p: any) => p.id === id);
      if (index === -1) return null;
      
      products[index] = { ...products[index], ...updates, updatedAt: new Date().toISOString() };
      localStorage.setItem('offline_products', JSON.stringify(products));
      return products[index];
    }
  },

  async delete(id: string): Promise<boolean> {
    if (!USE_DATABASE) {
      // Fallback to localStorage
      const products = await this.getAll();
      const filtered = products.filter(p => p.id !== id);
      if (filtered.length === products.length) return false;
      
      localStorage.setItem('offline_products', JSON.stringify(filtered));
      return true;
    }
    
    try {
      await apiCall(`/products/${id}`, { method: 'DELETE' });
      return true;
    } catch (error) {
      console.error('Database error, falling back to localStorage:', error);
      // Fallback to localStorage without recursion
      const products = JSON.parse(localStorage.getItem('offline_products') || '[]');
      const filtered = products.filter((p: any) => p.id !== id);
      if (filtered.length === products.length) return false;
      
      localStorage.setItem('offline_products', JSON.stringify(filtered));
      return true;
    }
  },

  async getById(id: string): Promise<OfflineProduct | null> {
    const products = await this.getAll();
    return products.find(p => p.id === id) || null;
  },

  async search(query: string): Promise<OfflineProduct[]> {
    const products = await this.getAll();
    const lowercaseQuery = query.toLowerCase();
    return products.filter(product =>
      product.name.toLowerCase().includes(lowercaseQuery) ||
      product.barcode?.toLowerCase().includes(lowercaseQuery) ||
      product.description?.toLowerCase().includes(lowercaseQuery)
    );
  }
};

// Hybrid Customer Storage
export const hybridCustomerStorage = {
  async getAll(): Promise<OfflineCustomer[]> {
    if (!USE_DATABASE) {
      const data = localStorage.getItem('offline_customers');
      return data ? JSON.parse(data) : [];
    }
    
    try {
      const customers = await apiCall<any[]>('/customers');
      return customers.map(c => ({
        id: c.id.toString(),
        name: c.name,
        email: c.email,
        phone: c.phone,
        address: c.address,
        creditLimit: c.creditLimit || 0,
        creditBalance: c.creditBalance || 0,
        notes: c.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Database error, falling back to localStorage:', error);
      const data = localStorage.getItem('offline_customers');
      return data ? JSON.parse(data) : [];
    }
  },

  async create(customer: Omit<OfflineCustomer, 'id'>): Promise<OfflineCustomer> {
    if (!USE_DATABASE) {
      const customers = await this.getAll();
      const newCustomer = { ...customer, id: Date.now().toString() };
      customers.push(newCustomer);
      localStorage.setItem('offline_customers', JSON.stringify(customers));
      return newCustomer;
    }

    try {
      const created = await apiCall<any>('/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          creditLimit: customer.creditLimit,
          creditBalance: customer.creditBalance,
          notes: customer.notes
        })
      });
      return { ...customer, id: created.id.toString() };
    } catch (error) {
      console.error('Database error, falling back to localStorage:', error);
      const customers = await this.getAll();
      const newCustomer = { ...customer, id: Date.now().toString() };
      customers.push(newCustomer);
      localStorage.setItem('offline_customers', JSON.stringify(customers));
      return newCustomer;
    }
  },

  async update(id: string, updates: Partial<OfflineCustomer>): Promise<OfflineCustomer | null> {
    if (!USE_DATABASE) {
      const customers = await this.getAll();
      const index = customers.findIndex(c => c.id === id);
      if (index === -1) return null;
      
      customers[index] = { ...customers[index], ...updates };
      localStorage.setItem('offline_customers', JSON.stringify(customers));
      return customers[index];
    }

    try {
      await apiCall(`/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      return { ...updates, id } as OfflineCustomer;
    } catch (error) {
      console.error('Database error, falling back to localStorage:', error);
      const customers = await this.getAll();
      const index = customers.findIndex(c => c.id === id);
      if (index === -1) return null;
      
      customers[index] = { ...customers[index], ...updates };
      localStorage.setItem('offline_customers', JSON.stringify(customers));
      return customers[index];
    }
  },

  async delete(id: string): Promise<boolean> {
    if (!USE_DATABASE) {
      const customers = await this.getAll();
      const filtered = customers.filter(c => c.id !== id);
      localStorage.setItem('offline_customers', JSON.stringify(filtered));
      return true;
    }

    try {
      await apiCall(`/customers/${id}`, { method: 'DELETE' });
      return true;
    } catch (error) {
      console.error('Database error, falling back to localStorage:', error);
      const customers = await this.getAll();
      const filtered = customers.filter(c => c.id !== id);
      localStorage.setItem('offline_customers', JSON.stringify(filtered));
      return true;
    }
  },

  async getById(id: string): Promise<OfflineCustomer | null> {
    const customers = await this.getAll();
    return customers.find(c => c.id === id) || null;
  }
};

// Hybrid Supplier Storage
export const hybridSupplierStorage = {
  async getAll(): Promise<OfflineSupplier[]> {
    if (!USE_DATABASE) {
      const data = localStorage.getItem('offline_suppliers');
      return data ? JSON.parse(data) : [];
    }
    
    try {
      const suppliers = await apiCall<any[]>('/suppliers');
      return suppliers.map(s => ({
        id: s.id.toString(),
        name: s.name,
        email: s.email,
        phone: s.phone,
        address: s.address,
        contactPerson: s.contactPerson,
        notes: s.notes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Database error, falling back to localStorage:', error);
      const data = localStorage.getItem('offline_suppliers');
      return data ? JSON.parse(data) : [];
    }
  },

  async create(supplier: Omit<OfflineSupplier, 'id'>): Promise<OfflineSupplier> {
    if (!USE_DATABASE) {
      const suppliers = await this.getAll();
      const newSupplier = { ...supplier, id: Date.now().toString() };
      suppliers.push(newSupplier);
      localStorage.setItem('offline_suppliers', JSON.stringify(suppliers));
      return newSupplier;
    }

    try {
      const created = await apiCall<any>('/suppliers', {
        method: 'POST',
        body: JSON.stringify({
          name: supplier.name,
          email: supplier.email,
          phone: supplier.phone,
          address: supplier.address,
          contactPerson: supplier.contactPerson,
          notes: supplier.notes
        })
      });
      return { ...supplier, id: created.id.toString() };
    } catch (error) {
      console.error('Database error, falling back to localStorage:', error);
      const suppliers = await this.getAll();
      const newSupplier = { ...supplier, id: Date.now().toString() };
      suppliers.push(newSupplier);
      localStorage.setItem('offline_suppliers', JSON.stringify(suppliers));
      return newSupplier;
    }
  },

  async update(id: string, updates: Partial<OfflineSupplier>): Promise<OfflineSupplier | null> {
    if (!USE_DATABASE) {
      const suppliers = await this.getAll();
      const index = suppliers.findIndex(s => s.id === id);
      if (index === -1) return null;
      
      suppliers[index] = { ...suppliers[index], ...updates };
      localStorage.setItem('offline_suppliers', JSON.stringify(suppliers));
      return suppliers[index];
    }

    try {
      await apiCall(`/suppliers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      return { ...updates, id } as OfflineSupplier;
    } catch (error) {
      console.error('Database error, falling back to localStorage:', error);
      const suppliers = await this.getAll();
      const index = suppliers.findIndex(s => s.id === id);
      if (index === -1) return null;
      
      suppliers[index] = { ...suppliers[index], ...updates };
      localStorage.setItem('offline_suppliers', JSON.stringify(suppliers));
      return suppliers[index];
    }
  },

  async delete(id: string): Promise<boolean> {
    if (!USE_DATABASE) {
      const suppliers = await this.getAll();
      const filtered = suppliers.filter(s => s.id !== id);
      localStorage.setItem('offline_suppliers', JSON.stringify(filtered));
      return true;
    }

    try {
      await apiCall(`/suppliers/${id}`, { method: 'DELETE' });
      return true;
    } catch (error) {
      console.error('Database error, falling back to localStorage:', error);
      const suppliers = await this.getAll();
      const filtered = suppliers.filter(s => s.id !== id);
      localStorage.setItem('offline_suppliers', JSON.stringify(filtered));
      return true;
    }
  },

  async getById(id: string): Promise<OfflineSupplier | null> {
    const suppliers = await this.getAll();
    return suppliers.find(s => s.id === id) || null;
  }
};

// Hybrid Sales Storage
export const hybridSalesStorage = {
  async getAll(): Promise<OfflineSale[]> {
    if (!USE_DATABASE) {
      const data = localStorage.getItem('offline_sales');
      return data ? JSON.parse(data) : [];
    }
    
    try {
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
        notes: s.notes,
        items: s.items || [],
        createdAt: s.createdAt || new Date().toISOString(),
        updatedAt: s.updatedAt || new Date().toISOString()
      }));
    } catch (error) {
      console.error('Database error, falling back to localStorage:', error);
      const data = localStorage.getItem('offline_sales');
      return data ? JSON.parse(data) : [];
    }
  },

  async create(sale: Omit<OfflineSale, 'id'>): Promise<OfflineSale> {
    if (!USE_DATABASE) {
      const sales = await this.getAll();
      const newSale = { ...sale, id: Date.now().toString() };
      sales.push(newSale);
      localStorage.setItem('offline_sales', JSON.stringify(sales));
      return newSale;
    }

    try {
      const created = await apiCall<any>('/sales', {
        method: 'POST',
        body: JSON.stringify({
          invoiceNumber: sale.invoiceNumber,
          date: sale.date,
          customerId: sale.customerId ? parseInt(sale.customerId) : null,
          totalAmount: sale.totalAmount,
          discountAmount: sale.discountAmount,
          taxAmount: sale.taxAmount,
          paidAmount: sale.paidAmount,
          changeAmount: sale.changeAmount,
          paymentMethod: sale.paymentMethod,
          status: sale.status,
          notes: sale.notes
        })
      });
      return { ...sale, id: created.id.toString() };
    } catch (error) {
      console.error('Database error, falling back to localStorage:', error);
      const sales = await this.getAll();
      const newSale = { ...sale, id: Date.now().toString() };
      sales.push(newSale);
      localStorage.setItem('offline_sales', JSON.stringify(sales));
      return newSale;
    }
  },

  async update(id: string, updates: Partial<OfflineSale>): Promise<OfflineSale | null> {
    if (!USE_DATABASE) {
      const sales = await this.getAll();
      const index = sales.findIndex(s => s.id === id);
      if (index === -1) return null;
      
      sales[index] = { ...sales[index], ...updates };
      localStorage.setItem('offline_sales', JSON.stringify(sales));
      return sales[index];
    }

    try {
      await apiCall(`/sales/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      return { ...updates, id } as OfflineSale;
    } catch (error) {
      console.error('Database error, falling back to localStorage:', error);
      const sales = await this.getAll();
      const index = sales.findIndex(s => s.id === id);
      if (index === -1) return null;
      
      sales[index] = { ...sales[index], ...updates };
      localStorage.setItem('offline_sales', JSON.stringify(sales));
      return sales[index];
    }
  },

  async delete(id: string): Promise<boolean> {
    if (!USE_DATABASE) {
      const sales = await this.getAll();
      const filtered = sales.filter(s => s.id !== id);
      localStorage.setItem('offline_sales', JSON.stringify(filtered));
      return true;
    }

    try {
      await apiCall(`/sales/${id}`, { method: 'DELETE' });
      return true;
    } catch (error) {
      console.error('Database error, falling back to localStorage:', error);
      const sales = await this.getAll();
      const filtered = sales.filter(s => s.id !== id);
      localStorage.setItem('offline_sales', JSON.stringify(filtered));
      return true;
    }
  },

  async getById(id: string): Promise<OfflineSale | null> {
    const sales = await this.getAll();
    return sales.find(s => s.id === id) || null;
  }
};

// Export the hybrid storage as the main offline storage
export { 
  hybridProductStorage as offlineProductStorage,
  hybridCustomerStorage as offlineCustomerStorage,
  hybridSupplierStorage as offlineSupplierStorage,
  hybridSalesStorage as offlineSalesStorage
};
