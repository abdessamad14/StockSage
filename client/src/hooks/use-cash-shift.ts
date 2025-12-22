import { useState, useEffect } from 'react';
import { databaseCashShiftStorage, OfflineCashShift } from '@/lib/database-storage';

export function useCashShift() {
  const [currentShift, setCurrentShift] = useState<OfflineCashShift | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOpenShift = async () => {
    setLoading(true);
    try {
      const shift = await databaseCashShiftStorage.getOpenShift();
      setCurrentShift(shift);
    } catch (error) {
      console.error('Error loading open shift:', error);
      setCurrentShift(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOpenShift();
  }, []);

  const openShift = async (userId: string, userName: string, startingCash: number) => {
    try {
      const newShift = await databaseCashShiftStorage.create({
        userId,
        userName,
        startingCash,
        totalCashSales: 0,
        totalCardSales: 0,
        totalCreditSales: 0,
        totalSales: 0,
        transactionsCount: 0,
        openedAt: new Date().toISOString(),
        status: 'open'
      });
      setCurrentShift(newShift);
      return newShift;
    } catch (error) {
      console.error('Error opening shift:', error);
      throw error;
    }
  };

  const closeShift = async (actualTotal: number, notes?: string) => {
    if (!currentShift) throw new Error('No open shift');
    
    try {
      const closedShift = await databaseCashShiftStorage.close(
        currentShift.id,
        actualTotal,
        notes
      );
      setCurrentShift(null);
      return closedShift;
    } catch (error) {
      console.error('Error closing shift:', error);
      throw error;
    }
  };

  return {
    currentShift,
    loading,
    openShift,
    closeShift,
    refreshShift: loadOpenShift
  };
}

