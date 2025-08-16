import { useState, useEffect } from 'react';
import { offlineCustomerStorage, OfflineCustomer } from '@/lib/offline-storage';

export function useOfflineCustomers() {
  const [customers, setCustomers] = useState<OfflineCustomer[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCustomers = () => {
    setLoading(true);
    const allCustomers = offlineCustomerStorage.getAll();
    setCustomers(allCustomers);
    setLoading(false);
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const createCustomer = (customer: Omit<OfflineCustomer, 'id'>) => {
    const newCustomer = offlineCustomerStorage.create(customer);
    loadCustomers();
    return newCustomer;
  };

  const updateCustomer = (id: string, updates: Partial<OfflineCustomer>) => {
    const updatedCustomer = offlineCustomerStorage.update(id, updates);
    if (updatedCustomer) {
      loadCustomers();
    }
    return updatedCustomer;
  };

  const deleteCustomer = (id: string) => {
    const success = offlineCustomerStorage.delete(id);
    if (success) {
      loadCustomers();
    }
    return success;
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
    const foundCustomer = offlineCustomerStorage.getById(id);
    setCustomer(foundCustomer || null);
    setLoading(false);
  }, [id]);

  return { customer, loading };
}
