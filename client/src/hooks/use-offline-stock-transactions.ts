import { useState, useEffect } from "react";
import { offlineStockTransactionStorage, OfflineStockTransaction } from "../lib/database-storage";

export function useOfflineStockTransactions() {
  const [transactions, setTransactions] = useState<OfflineStockTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await offlineStockTransactionStorage.getAll();
      setTransactions(data);
    } catch (error) {
      console.error("Failed to load stock transactions:", error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const createTransaction = async (transaction: Omit<OfflineStockTransaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newTransaction = await offlineStockTransactionStorage.create(transaction);
      setTransactions(prev => [...prev, newTransaction]);
      return newTransaction;
    } catch (error) {
      console.error("Failed to create stock transaction:", error);
      throw error;
    }
  };

  const getTransactionsByProduct = async (productId: string) => {
    try {
      return await offlineStockTransactionStorage.getByProductId(productId);
    } catch (error) {
      console.error("Failed to get transactions by product:", error);
      return [];
    }
  };

  const getTransactionsByWarehouse = async (warehouseId: string) => {
    console.warn("getTransactionsByWarehouse not implemented in database storage");
    return [];
  };

  const deleteTransaction = async (id: string) => {
    console.warn("deleteTransaction not implemented in database storage");
    // For now, just remove from local state
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  return {
    transactions,
    loading,
    createTransaction,
    getTransactionsByProduct,
    getTransactionsByWarehouse,
    deleteTransaction,
    refresh: loadTransactions
  };
}
