import { useState, useEffect } from 'react';
import { offlineSettingsStorage, OfflineSettings } from '@/lib/offline-storage';

export function useOfflineSettings() {
  const [settings, setSettings] = useState<OfflineSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSettings = () => {
    setLoading(true);
    const currentSettings = offlineSettingsStorage.get();
    setSettings(currentSettings);
    setLoading(false);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateSettings = (updates: Partial<OfflineSettings>) => {
    const updatedSettings = offlineSettingsStorage.update(updates);
    setSettings(updatedSettings);
    return updatedSettings;
  };

  return {
    settings,
    loading,
    updateSettings,
    refetch: loadSettings
  };
}
