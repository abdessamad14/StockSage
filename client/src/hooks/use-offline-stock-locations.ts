import { useState, useEffect } from 'react';
import { offlineStockLocationStorage } from '../lib/database-storage';

export function useOfflineStockLocations() {
  const [stockLocations, setStockLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStockLocations = async () => {
    setLoading(true);
    try {
      const locations = await offlineStockLocationStorage.getAll();
      setStockLocations(locations);
    } catch (error) {
      console.error('Error loading stock locations:', error);
      setStockLocations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStockLocations();
  }, []);

  // Note: Stock location CRUD operations not implemented in database storage yet
  const createStockLocation = (locationData: any) => {
    console.warn('Stock location creation not implemented in database storage');
    return null;
  };

  const updateStockLocation = (id: string, updates: any) => {
    console.warn('Stock location update not implemented in database storage');
    return null;
  };

  const deleteStockLocation = (id: string) => {
    console.warn('Stock location deletion not implemented in database storage');
    return false;
  };

  return {
    stockLocations,
    loading,
    createStockLocation,
    updateStockLocation,
    deleteStockLocation,
    refresh: loadStockLocations
  };
}
