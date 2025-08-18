import { useState, useEffect } from 'react';
import { offlineStockLocationStorage } from '@/lib/offline-storage';
import type { OfflineStockLocation } from '@/lib/offline-storage';

export function useOfflineStockLocations() {
  const [stockLocations, setStockLocations] = useState<OfflineStockLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStockLocations = () => {
    try {
      const locations = offlineStockLocationStorage.getAll();
      setStockLocations(locations);
    } catch (error) {
      console.error('Error loading stock locations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStockLocations();
  }, []);

  const createStockLocation = (locationData: Omit<OfflineStockLocation, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newLocation = offlineStockLocationStorage.create(locationData);
    setStockLocations(prev => [...prev, newLocation]);
    return newLocation;
  };

  const updateStockLocation = (id: string, updates: Partial<OfflineStockLocation>) => {
    const updatedLocation = offlineStockLocationStorage.update(id, updates);
    if (updatedLocation) {
      setStockLocations(prev => prev.map(location => location.id === id ? updatedLocation : location));
    }
    return updatedLocation;
  };

  const deleteStockLocation = (id: string) => {
    const success = offlineStockLocationStorage.delete(id);
    if (success) {
      setStockLocations(prev => prev.filter(location => location.id !== id));
    }
    return success;
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
