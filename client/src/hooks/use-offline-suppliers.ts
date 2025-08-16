import { useState, useEffect } from 'react';
import { offlineSupplierStorage, OfflineSupplier } from '@/lib/offline-storage';

export function useOfflineSuppliers() {
  const [suppliers, setSuppliers] = useState<OfflineSupplier[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSuppliers = () => {
    setLoading(true);
    const allSuppliers = offlineSupplierStorage.getAll();
    setSuppliers(allSuppliers);
    setLoading(false);
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const createSupplier = (supplierData: Omit<OfflineSupplier, 'id'>) => {
    const newSupplier = offlineSupplierStorage.create(supplierData);
    loadSuppliers();
    return newSupplier;
  };

  const updateSupplier = (id: string, updates: Partial<OfflineSupplier>) => {
    const updatedSupplier = offlineSupplierStorage.update(id, updates);
    loadSuppliers();
    return updatedSupplier;
  };

  const deleteSupplier = (id: string) => {
    offlineSupplierStorage.delete(id);
    loadSuppliers();
  };

  return {
    suppliers,
    loading,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    refetch: loadSuppliers
  };
}

export function useOfflineSupplier(id: string) {
  const [supplier, setSupplier] = useState<OfflineSupplier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const foundSupplier = offlineSupplierStorage.getById(id);
    setSupplier(foundSupplier || null);
    setLoading(false);
  }, [id]);

  return { supplier, loading };
}
