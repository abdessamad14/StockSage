import axios from 'axios';
import { config } from '../config/config';

// Create a base axios instance
export const api = axios.create({
  // Use the API URL from the configuration
  baseURL: config.API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add interceptor to debug API calls in development
if (config.ENV === 'development') {
  api.interceptors.request.use(request => {
    console.log('API Request:', request.method?.toUpperCase(), request.url);
    return request;
  });
  
  api.interceptors.response.use(
    response => {
      console.log('API Response:', response.status, response.config.url);
      return response;
    },
    error => {
      console.error('API Error:', error.response?.status, error.response?.data, error.config?.url);
      return Promise.reject(error);
    }
  );
}

// Types for API responses
export interface OrderItem {
  productId: number;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product?: {
    id: number;
    name: string;
    barcode?: string;
    description?: string;
    category?: string;
  };
}

export interface Order {
  id: number;
  orderNumber: string;
  date: string;
  supplierId: number;
  totalAmount: number;
  status: 'pending' | 'in_transit' | 'received' | 'cancelled';
  notes?: string;
  items?: OrderItem[];
  supplier?: {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  barcode?: string;
  category?: string;
  price: number;
  cost: number;
  quantity: number;
  minStockLevel?: number;
  image?: string;
  lowStock?: boolean;
}

export interface Supplier {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  notes?: string;
}

// API functions for orders
export const ordersApi = {
  getOrders: async () => {
    const response = await api.get<Order[]>('/api/orders');
    return response.data;
  },
  
  getOrder: async (id: number) => {
    const response = await api.get<Order>(`/api/orders/${id}`);
    return response.data;
  },
  
  createOrder: async (orderData: { order: any, items: any[] }) => {
    const response = await api.post<Order>('/api/orders', orderData);
    return response.data;
  },
  
  updateOrderStatus: async (id: number, status: string) => {
    const response = await api.put<Order>(`/api/orders/${id}/status`, { status });
    return response.data;
  }
};

// API functions for products
export const productsApi = {
  getProducts: async (search?: string, category?: string) => {
    const params = { search, category };
    const response = await api.get<Product[]>('/api/products', { params });
    return response.data;
  },
  
  getProduct: async (id: number) => {
    const response = await api.get<Product>(`/api/products/${id}`);
    return response.data;
  }
};

// API functions for suppliers
export const suppliersApi = {
  getSuppliers: async (search?: string) => {
    const params = { search };
    const response = await api.get<Supplier[]>('/api/suppliers', { params });
    return response.data;
  },
  
  getSupplier: async (id: number) => {
    const response = await api.get<Supplier>(`/api/suppliers/${id}`);
    return response.data;
  }
};