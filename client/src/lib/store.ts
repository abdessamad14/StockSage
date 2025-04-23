import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  User, 
  Product, 
  Customer, 
  Supplier, 
  Sale, 
  Order, 
  InventoryAdjustment, 
  Settings,
  ProductWithStockStatus,
  SaleWithItems,
  OrderWithItems
} from '@shared/schema';

interface StoreState {
  // Local app state
  offlineMode: boolean;
  drawerOpen: boolean;
  scannerOpen: boolean;
  deviceId: string;
  lastSyncTime: Date | null;
  
  // Entities for offline storage
  products: ProductWithStockStatus[];
  customers: Customer[];
  suppliers: Supplier[];
  pendingSales: SaleWithItems[];
  pendingOrders: OrderWithItems[];
  pendingAdjustments: InventoryAdjustment[];
  settings: Settings | null;
  
  // Cart for POS
  cart: {
    items: Array<{
      product: Product;
      quantity: number;
      price: number;
      discount: number;
    }>;
    customer: Customer | null;
    discountAmount: number;
    paymentMethod: string;
  };
  
  // Actions
  setOfflineMode: (offlineMode: boolean) => void;
  setDrawerOpen: (open: boolean) => void;
  setScannerOpen: (open: boolean) => void;
  setLastSyncTime: (time: Date) => void;
  
  setProducts: (products: ProductWithStockStatus[]) => void;
  addProduct: (product: ProductWithStockStatus) => void;
  updateProduct: (product: ProductWithStockStatus) => void;
  removeProduct: (id: number) => void;
  
  setCustomers: (customers: Customer[]) => void;
  addCustomer: (customer: Customer) => void;
  updateCustomer: (customer: Customer) => void;
  removeCustomer: (id: number) => void;
  
  setSuppliers: (suppliers: Supplier[]) => void;
  addSupplier: (supplier: Supplier) => void;
  updateSupplier: (supplier: Supplier) => void;
  removeSupplier: (id: number) => void;
  
  setPendingSales: (sales: SaleWithItems[]) => void;
  addPendingSale: (sale: SaleWithItems) => void;
  removePendingSale: (id: number) => void;
  
  setPendingOrders: (orders: OrderWithItems[]) => void;
  addPendingOrder: (order: OrderWithItems) => void;
  removePendingOrder: (id: number) => void;
  
  setSettings: (settings: Settings) => void;
  
  // Cart actions
  addToCart: (product: Product, quantity: number) => void;
  updateCartItem: (productId: number, quantity: number) => void;
  removeFromCart: (productId: number) => void;
  setCartCustomer: (customer: Customer | null) => void;
  setCartDiscountAmount: (amount: number) => void;
  setCartPaymentMethod: (method: string) => void;
  clearCart: () => void;
}

// Generate a random device ID if not already set
const generateDeviceId = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      // Local app state
      offlineMode: false,
      drawerOpen: false,
      scannerOpen: false,
      deviceId: generateDeviceId(),
      lastSyncTime: null,
      
      // Entities
      products: [],
      customers: [],
      suppliers: [],
      pendingSales: [],
      pendingOrders: [],
      pendingAdjustments: [],
      settings: null,
      
      // Cart
      cart: {
        items: [],
        customer: null,
        discountAmount: 0,
        paymentMethod: 'cash'
      },
      
      // Actions
      setOfflineMode: (offlineMode: boolean) => set({ offlineMode }),
      setDrawerOpen: (open: boolean) => set({ drawerOpen: open }),
      setScannerOpen: (open: boolean) => set({ scannerOpen: open }),
      setLastSyncTime: (time: Date) => set({ lastSyncTime: time }),
      
      // Product actions
      setProducts: (products: ProductWithStockStatus[]) => set({ products }),
      addProduct: (product: ProductWithStockStatus) => 
        set((state) => ({ products: [...state.products, product] })),
      updateProduct: (product: ProductWithStockStatus) => 
        set((state) => ({ 
          products: state.products.map(p => p.id === product.id ? product : p) 
        })),
      removeProduct: (id: number) => 
        set((state) => ({ 
          products: state.products.filter(p => p.id !== id) 
        })),
      
      // Customer actions
      setCustomers: (customers: Customer[]) => set({ customers }),
      addCustomer: (customer: Customer) => 
        set((state) => ({ customers: [...state.customers, customer] })),
      updateCustomer: (customer: Customer) => 
        set((state) => ({ 
          customers: state.customers.map(c => c.id === customer.id ? customer : c) 
        })),
      removeCustomer: (id: number) => 
        set((state) => ({ 
          customers: state.customers.filter(c => c.id !== id) 
        })),
      
      // Supplier actions
      setSuppliers: (suppliers: Supplier[]) => set({ suppliers }),
      addSupplier: (supplier: Supplier) => 
        set((state) => ({ suppliers: [...state.suppliers, supplier] })),
      updateSupplier: (supplier: Supplier) => 
        set((state) => ({ 
          suppliers: state.suppliers.map(s => s.id === supplier.id ? supplier : s) 
        })),
      removeSupplier: (id: number) => 
        set((state) => ({ 
          suppliers: state.suppliers.filter(s => s.id !== id) 
        })),
      
      // Pending sales actions
      setPendingSales: (sales: SaleWithItems[]) => set({ pendingSales: sales }),
      addPendingSale: (sale: SaleWithItems) => 
        set((state) => ({ pendingSales: [...state.pendingSales, sale] })),
      removePendingSale: (id: number) => 
        set((state) => ({ 
          pendingSales: state.pendingSales.filter(s => s.id !== id) 
        })),
      
      // Pending orders actions
      setPendingOrders: (orders: OrderWithItems[]) => set({ pendingOrders: orders }),
      addPendingOrder: (order: OrderWithItems) => 
        set((state) => ({ pendingOrders: [...state.pendingOrders, order] })),
      removePendingOrder: (id: number) => 
        set((state) => ({ 
          pendingOrders: state.pendingOrders.filter(o => o.id !== id) 
        })),
      
      // Settings actions
      setSettings: (settings: Settings) => set({ settings }),
      
      // Cart actions
      addToCart: (product: Product, quantity: number) => 
        set((state) => {
          const existingItem = state.cart.items.find(item => item.product.id === product.id);
          
          if (existingItem) {
            return {
              cart: {
                ...state.cart,
                items: state.cart.items.map(item =>
                  item.product.id === product.id
                    ? { ...item, quantity: item.quantity + quantity }
                    : item
                )
              }
            };
          } else {
            return {
              cart: {
                ...state.cart,
                items: [
                  ...state.cart.items,
                  {
                    product,
                    quantity,
                    price: product.sellingPrice,
                    discount: 0
                  }
                ]
              }
            };
          }
        }),
      
      updateCartItem: (productId: number, quantity: number) => 
        set((state) => ({
          cart: {
            ...state.cart,
            items: state.cart.items.map(item =>
              item.product.id === productId
                ? { ...item, quantity }
                : item
            ).filter(item => item.quantity > 0)
          }
        })),
      
      removeFromCart: (productId: number) => 
        set((state) => ({
          cart: {
            ...state.cart,
            items: state.cart.items.filter(item => item.product.id !== productId)
          }
        })),
      
      setCartCustomer: (customer: Customer | null) => 
        set((state) => ({
          cart: {
            ...state.cart,
            customer
          }
        })),
      
      setCartDiscountAmount: (amount: number) => 
        set((state) => ({
          cart: {
            ...state.cart,
            discountAmount: amount
          }
        })),
      
      setCartPaymentMethod: (method: string) => 
        set((state) => ({
          cart: {
            ...state.cart,
            paymentMethod: method
          }
        })),
      
      clearCart: () => 
        set((state) => ({
          cart: {
            items: [],
            customer: null,
            discountAmount: 0,
            paymentMethod: 'cash'
          }
        }))
    }),
    {
      name: 'igoodar-store',
      partialize: (state) => ({
        deviceId: state.deviceId,
        products: state.products,
        customers: state.customers,
        suppliers: state.suppliers,
        pendingSales: state.pendingSales,
        pendingOrders: state.pendingOrders,
        pendingAdjustments: state.pendingAdjustments,
        settings: state.settings,
        lastSyncTime: state.lastSyncTime,
      }),
    }
  )
);
