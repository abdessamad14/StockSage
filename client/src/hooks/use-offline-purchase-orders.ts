import { useState, useEffect } from 'react';
import { 
  offlinePurchaseOrderStorage, 
  offlinePurchaseOrderItemStorage,
  offlineProductStockStorage 
} from '@/lib/offline-storage';
import type { 
  OfflinePurchaseOrder, 
  OfflinePurchaseOrderItem,
  OfflinePurchaseOrderWithItems 
} from '../../../shared/schema';

export function useOfflinePurchaseOrders() {
  const [orders, setOrders] = useState<OfflinePurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = () => {
    try {
      const orderData = offlinePurchaseOrderStorage.getAll();
      setOrders(orderData);
    } catch (error) {
      console.error('Error loading purchase orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const createOrder = (orderData: Omit<OfflinePurchaseOrder, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newOrder = offlinePurchaseOrderStorage.create(orderData);
    setOrders(prev => [...prev, newOrder]);
    return newOrder;
  };

  const updateOrder = (id: string, updates: Partial<OfflinePurchaseOrder>) => {
    const updatedOrder = offlinePurchaseOrderStorage.update(id, updates);
    if (updatedOrder) {
      setOrders(prev => prev.map(order => order.id === id ? updatedOrder : order));
    }
    return updatedOrder;
  };

  const deleteOrder = (id: string) => {
    const success = offlinePurchaseOrderStorage.delete(id);
    if (success) {
      // Also delete all order items
      offlinePurchaseOrderItemStorage.deleteByOrderId(id);
      setOrders(prev => prev.filter(order => order.id !== id));
    }
    return success;
  };

  const getOrderWithItems = (orderId: string): OfflinePurchaseOrderWithItems | null => {
    const order = offlinePurchaseOrderStorage.getById(orderId);
    if (!order) return null;

    const items = offlinePurchaseOrderItemStorage.getByOrderId(orderId);
    return {
      ...order,
      items: items.map(item => ({ ...item, product: undefined })) // Products will be populated by the component
    };
  };

  const receiveOrder = (orderId: string, receivedItems: { itemId: string; receivedQuantity: number }[]) => {
    const order = offlinePurchaseOrderStorage.getById(orderId);
    if (!order) return false;

    // Update order items with received quantities
    receivedItems.forEach(({ itemId, receivedQuantity }) => {
      offlinePurchaseOrderItemStorage.update(itemId, { receivedQuantity });
    });

    // Update stock quantities in the warehouse
    const items = offlinePurchaseOrderItemStorage.getByOrderId(orderId);
    items.forEach(item => {
      const receivedItem = receivedItems.find(ri => ri.itemId === item.id);
      if (receivedItem && receivedItem.receivedQuantity > 0) {
        // Update or create stock entry for this product in the warehouse
        offlineProductStockStorage.upsert({
          productId: item.productId,
          locationId: order.warehouseId,
          quantity: receivedItem.receivedQuantity,
          minStockLevel: 0
        });
      }
    });

    // Update order status to received
    updateOrder(orderId, { 
      status: 'received', 
      receivedDate: new Date().toISOString() 
    });

    return true;
  };

  const generateOrderNumber = (): string => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const orderCount = orders.length + 1;
    return `PO${year}${month}${day}-${orderCount.toString().padStart(3, '0')}`;
  };

  return {
    orders,
    loading,
    createOrder,
    updateOrder,
    deleteOrder,
    getOrderWithItems,
    receiveOrder,
    generateOrderNumber,
    refresh: loadOrders
  };
}

export function useOfflinePurchaseOrderItems() {
  const [items, setItems] = useState<OfflinePurchaseOrderItem[]>([]);

  const loadItems = (orderId: string) => {
    const orderItems = offlinePurchaseOrderItemStorage.getByOrderId(orderId);
    setItems(orderItems);
  };

  const createItem = (itemData: Omit<OfflinePurchaseOrderItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newItem = offlinePurchaseOrderItemStorage.create(itemData);
    setItems(prev => [...prev, newItem]);
    return newItem;
  };

  const updateItem = (id: string, updates: Partial<OfflinePurchaseOrderItem>) => {
    const updatedItem = offlinePurchaseOrderItemStorage.update(id, updates);
    if (updatedItem) {
      setItems(prev => prev.map(item => item.id === id ? updatedItem : item));
    }
    return updatedItem;
  };

  const deleteItem = (id: string) => {
    const success = offlinePurchaseOrderItemStorage.delete(id);
    if (success) {
      setItems(prev => prev.filter(item => item.id !== id));
    }
    return success;
  };

  return {
    items,
    loadItems,
    createItem,
    updateItem,
    deleteItem
  };
}
