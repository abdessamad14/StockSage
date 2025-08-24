import { useState, useEffect } from 'react';
import { offlineSalesStorage } from '@/lib/hybrid-storage';
import { offlineSaleStorage } from '@/lib/offline-storage';

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

export function useOfflineSales() {
  const [sales, setSales] = useState<OfflineSale[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSales = async () => {
    setLoading(true);
    try {
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

  const createSale = (saleData: Omit<OfflineSale, 'id' | 'date' | 'invoiceNumber'>, items: any[]) => {
    const invoiceNumber = `INV-${Date.now()}`;
    const sale: Omit<OfflineSale, 'id'> = {
      ...saleData,
      invoiceNumber,
      date: new Date().toISOString(),
      items: items.map(item => ({ ...item, id: Date.now().toString() + Math.random().toString(36).substr(2, 9) })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
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
