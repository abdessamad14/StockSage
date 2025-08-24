import { useState, useEffect } from 'react';
import { offlineCustomerStorage } from '../lib/database-storage';

interface OfflineCustomer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  creditLimit?: number;
  creditBalance?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export function useOfflineCustomers() {
  const [customers, setCustomers] = useState<OfflineCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const allCustomers = await offlineCustomerStorage.getAll();
      setCustomers(allCustomers);
    } catch (error) {
      console.error('Error loading customers:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const createCustomer = async (customer: Omit<OfflineCustomer, 'id'>) => {
    try {
      const newCustomer = await offlineCustomerStorage.create(customer);
      await loadCustomers();
      return newCustomer;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  };

  const updateCustomer = async (id: string, updates: Partial<OfflineCustomer>) => {
    try {
      const updatedCustomer = await offlineCustomerStorage.update(id, updates);
      if (updatedCustomer) {
        await loadCustomers();
      }
      return updatedCustomer;
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      const success = await offlineCustomerStorage.delete(id);
      if (success) {
        await loadCustomers();
      }
      return success;
    } catch (error) {
      console.error('Error deleting customer:', error);
      throw error;
    }
  };

  return {
    customers,
    loading,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    refetch: loadCustomers
  };
}

export function useOfflineCustomer(id: string) {
  const [customer, setCustomer] = useState<OfflineCustomer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCustomer = async () => {
      setLoading(true);
      try {
        const foundCustomer = await offlineCustomerStorage.getById(id);
        setCustomer(foundCustomer || null);
      } catch (error) {
        console.error('Error loading customer:', error);
        setCustomer(null);
      } finally {
        setLoading(false);
      }
    };
    loadCustomer();
  }, [id]);

  return { customer, loading };
}
