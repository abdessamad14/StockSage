import { useState, useEffect } from 'react';
import { offlineSaleStorage, OfflineSale, generateId } from '@/lib/offline-storage';

export function useOfflineSales() {
  const [sales, setSales] = useState<OfflineSale[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSales = () => {
    setLoading(true);
    const allSales = offlineSaleStorage.getAll();
    setSales(allSales);
    setLoading(false);
  };

  useEffect(() => {
    loadSales();
  }, []);

  const createSale = (saleData: Omit<OfflineSale, 'id' | 'date' | 'invoiceNumber'>, items: Omit<OfflineSale['items'][0], 'id'>[]) => {
    const invoiceNumber = `INV-${Date.now()}`;
    const sale: Omit<OfflineSale, 'id'> = {
      ...saleData,
      invoiceNumber,
      date: new Date(),
      items: items.map(item => ({ ...item, id: generateId() }))
    };
    
    const newSale = offlineSaleStorage.create(sale);
    loadSales();
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
    const foundSale = offlineSaleStorage.getById(id);
    setSale(foundSale || null);
    setLoading(false);
  }, [id]);

  return { sale, loading };
}
