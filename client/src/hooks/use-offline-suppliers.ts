import { useState, useEffect } from 'react';
import { offlineSupplierStorage } from '@/lib/hybrid-storage';

interface OfflineSupplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export function useOfflineSuppliers() {
  const [suppliers, setSuppliers] = useState<OfflineSupplier[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const allSuppliers = await offlineSupplierStorage.getAll();
      setSuppliers(allSuppliers);
    } catch (error) {
      console.error('Error loading suppliers:', error);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const createSupplier = async (supplier: Omit<OfflineSupplier, 'id'>) => {
    try {
      const newSupplier = await offlineSupplierStorage.create(supplier);
      await loadSuppliers();
      return newSupplier;
    } catch (error) {
      console.error('Error creating supplier:', error);
      throw error;
    }
  };

  const updateSupplier = async (id: string, updates: Partial<OfflineSupplier>) => {
    try {
      const updatedSupplier = await offlineSupplierStorage.update(id, updates);
      if (updatedSupplier) {
        await loadSuppliers();
      }
      return updatedSupplier;
    } catch (error) {
      console.error('Error updating supplier:', error);
      throw error;
    }
  };

  const deleteSupplier = async (id: string) => {
    try {
      const success = await offlineSupplierStorage.delete(id);
      if (success) {
        await loadSuppliers();
      }
      return success;
    } catch (error) {
      console.error('Error deleting supplier:', error);
      throw error;
    }
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
    const loadSupplier = async () => {
      setLoading(true);
      try {
        const foundSupplier = await offlineSupplierStorage.getById(id);
        setSupplier(foundSupplier || null);
      } catch (error) {
        console.error('Error loading supplier:', error);
        setSupplier(null);
      } finally {
        setLoading(false);
      }
    };
    loadSupplier();
  }, [id]);

  return { supplier, loading };
}
