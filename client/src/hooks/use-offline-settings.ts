import { useState, useEffect } from 'react';
import { offlineSettingsStorage, OfflineSettings } from '../lib/database-storage';

export function useOfflineSettings() {
  const [settings, setSettings] = useState<OfflineSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const currentSettings = await offlineSettingsStorage.get();
      setSettings(currentSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
      setSettings(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateSettings = async (updates: Partial<OfflineSettings>) => {
    try {
      const updatedSettings = await offlineSettingsStorage.update(updates);
      setSettings(updatedSettings);
      return updatedSettings;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  };

  return {
    settings,
    loading,
    updateSettings,
    refetch: loadSettings
  };
}
