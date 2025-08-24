import { useState, useEffect } from 'react';
import { offlineSalesStorage, OfflineSale } from '../lib/database-storage';

export function useOfflineSales() {
  const [sales, setSales] = useState<OfflineSale[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSales = async () => {
    setLoading(true);
    try {
      // Load from database storage
      const allSales = await offlineSalesStorage.getAll();
      setSales(allSales);
    } catch (error) {
      console.error('Error loading sales:', error);
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  const createSale = async (saleData: Omit<OfflineSale, 'id' | 'date' | 'invoiceNumber'>, items: any[]) => {
    const invoiceNumber = `INV-${Date.now()}`;
    const sale: Omit<OfflineSale, 'id' | 'createdAt' | 'updatedAt'> = {
      ...saleData,
      invoiceNumber,
      date: new Date().toISOString(),
      items: items.map(item => ({ ...item, id: Date.now().toString() + Math.random().toString(36).substr(2, 9) }))
    };
    
    const newSale = await offlineSalesStorage.create(sale);
    await loadSales();
    return newSale;
  };

  return {
    sales,
    loading,
    createSale,
    refetch: loadSales
  };
}

export function useOfflineSale(id: string) {
  const [sale, setSale] = useState<OfflineSale | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSale = async () => {
      setLoading(true);
      try {
        const foundSale = await offlineSalesStorage.getById(id);
        setSale(foundSale || null);
      } catch (error) {
        console.error('Error loading sale:', error);
        setSale(null);
      } finally {
        setLoading(false);
      }
    };
    
    loadSale();
  }, [id]);

  return { sale, loading };
}
