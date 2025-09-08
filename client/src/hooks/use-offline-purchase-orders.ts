import { useState, useEffect } from 'react';
import { 
  databaseOrderStorage,
  OfflineOrder,
  offlinePurchaseOrderItemStorage,
  OfflineOrderItem,
  databaseProductStockStorage
} from '../lib/database-storage';

// Define types for purchase order items with additional fields
interface OfflinePurchaseOrderItem extends OfflineOrderItem {
  receivedQuantity?: number;
}

interface OfflinePurchaseOrderWithItems extends OfflineOrder {
  items: (OfflinePurchaseOrderItem & { product?: any })[];
}

export function useOfflinePurchaseOrders() {
  const [orders, setOrders] = useState<OfflineOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const orderData = await databaseOrderStorage.getAll();
      setOrders(orderData);
    } catch (error) {
      console.error('Error loading purchase orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const createOrder = async (orderData: Omit<OfflineOrder, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newOrder = await databaseOrderStorage.create(orderData);
    setOrders(prev => [...prev, newOrder]);
    return newOrder;
  };

  const updateOrder = async (id: string, updates: Partial<OfflineOrder>) => {
    // For now, we'll just update the local state since we don't have an update method
    setOrders(prev => prev.map(order => order.id === id ? { ...order, ...updates } : order));
    return true;
  };

  const deleteOrder = async (id: string) => {
    try {
      // Delete all order items first
      await offlinePurchaseOrderItemStorage.deleteByOrderId(id);
      // Delete the order from database
      const success = await databaseOrderStorage.delete(id);
      if (success) {
        // Remove from local state
        setOrders(prev => prev.filter(order => order.id !== id));
      }
      return success;
    } catch (error) {
      console.error('Error deleting order:', error);
      return false;
    }
  };

  const getOrderWithItems = async (orderId: string): Promise<OfflinePurchaseOrderWithItems | null> => {
    const orders = await databaseOrderStorage.getAll();
    const order = orders.find(o => o.id === orderId);
    if (!order) return null;

    const items = await offlinePurchaseOrderItemStorage.getByOrderId(orderId);
    return {
      ...order,
      items: items.map((item: OfflineOrderItem) => ({ ...item, product: undefined })) // Products will be populated by the component
    };
  };

  const receiveOrder = async (orderId: string, receivedItems: { itemId: string; receivedQuantity: number }[]) => {
    const orders = await databaseOrderStorage.getAll();
    const order = orders.find(o => o.id === orderId);
    if (!order) return false;

    // Update order items with received quantities
    for (const { itemId, receivedQuantity } of receivedItems) {
      await offlinePurchaseOrderItemStorage.update(itemId, { quantity: receivedQuantity });
    }

    // Update stock quantities in the warehouse
    const items = await offlinePurchaseOrderItemStorage.getByOrderId(orderId);
    for (const item of items) {
      const receivedItem = receivedItems.find(ri => ri.itemId === item.id);
      if (receivedItem && receivedItem.receivedQuantity > 0) {
        // Update or create stock entry for this product in the warehouse
        // For now, we'll skip stock updates since the API doesn't support create
        console.log('Would update stock for product:', item.productId, 'quantity:', receivedItem.receivedQuantity);
      }
    }

    // Update order status to received
    await updateOrder(orderId, { 
      status: 'received'
    });

    return true;
  };

  const generateOrderNumber = (): string => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PO${year}${month}${day}${random}`;
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
  const [orderItems, setOrderItems] = useState<OfflinePurchaseOrderItem[]>([]);

  const loadItems = async () => {
    const allItems = await offlinePurchaseOrderItemStorage.getAll();
    setItems(allItems);
  };

  const loadOrderItems = async (orderId: string) => {
    const items = await offlinePurchaseOrderItemStorage.getByOrderId(orderId);
    setOrderItems(items);
  };

  const createItem = async (itemData: Omit<OfflineOrderItem, 'id'>) => {
    const newItem = await offlinePurchaseOrderItemStorage.create(itemData);
    setItems(prev => [...prev, newItem]);
    return newItem;
  };

  const updateItem = async (id: string, updates: Partial<OfflineOrderItem>) => {
    const updatedItem = await offlinePurchaseOrderItemStorage.update(id, updates);
    if (updatedItem) {
      setItems(prev => prev.map(item => item.id === id ? updatedItem : item));
    }
    return updatedItem;
  };

  const deleteItem = async (id: string) => {
    const success = await offlinePurchaseOrderItemStorage.delete(id);
    if (success) {
      setItems(prev => prev.filter(item => item.id !== id));
    }
    return success;
  };

  return {
    items,
    orderItems,
    loadItems,
    loadOrderItems,
    createItem,
    updateItem,
    deleteItem
  };
}
