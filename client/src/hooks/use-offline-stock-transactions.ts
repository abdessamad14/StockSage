import { useState, useEffect } from "react";
import { offlineStockTransactionStorage } from "@/lib/offline-storage";
import { OfflineStockTransaction } from "../../../shared/schema";

export function useOfflineStockTransactions() {
  const [transactions, setTransactions] = useState<OfflineStockTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTransactions = () => {
    try {
      const data = offlineStockTransactionStorage.getAll();
      setTransactions(data);
    } catch (error) {
      console.error("Failed to load stock transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const createTransaction = (transaction: Omit<OfflineStockTransaction, 'id' | 'createdAt'>) => {
    try {
      const newTransaction = offlineStockTransactionStorage.create(transaction);
      setTransactions(prev => [newTransaction, ...prev]);
      return newTransaction;
    } catch (error) {
      console.error("Failed to create stock transaction:", error);
      throw error;
    }
  };

  const getProductTransactions = (productId: string) => {
    return offlineStockTransactionStorage.getByProduct(productId);
  };

  const getWarehouseTransactions = (warehouseId: string) => {
    return offlineStockTransactionStorage.getByWarehouse(warehouseId);
  };

  const deleteTransaction = (id: string) => {
    try {
      const success = offlineStockTransactionStorage.delete(id);
      if (success) {
        setTransactions(prev => prev.filter(t => t.id !== id));
      }
      return success;
    } catch (error) {
      console.error("Failed to delete stock transaction:", error);
      throw error;
    }
  };

  return {
    transactions,
    loading,
    createTransaction,
    getProductTransactions,
    getWarehouseTransactions,
    deleteTransaction,
    refresh: loadTransactions
  };
}
