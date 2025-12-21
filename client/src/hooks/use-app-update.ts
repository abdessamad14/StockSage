/**
 * App Update Checker Hook
 * 
 * Checks for new versions of the desktop app from the server
 * Shows notification when update is available
 */

import { useState, useEffect } from 'react';

interface VersionInfo {
  version: string;
  releaseDate: string;
  downloadUrl: string;
  changelog: string[];
  minVersion: string;
  critical: boolean;
}

interface UpdateStatus {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  versionInfo: VersionInfo | null;
  checking: boolean;
  error: string | null;
}

// Current app version (should match package.json)
const CURRENT_VERSION = '1.0.0';

// Version checking configuration
// Check version from igoodar.com/updates/
const VERSION_CHECK_URL = 'https://igoodar.com/updates/version.json';
const CHECK_INTERVAL = 1000 * 60 * 30; // Check every 30 minutes
const DISMISSED_KEY = 'igoodar_update_dismissed';

/**
 * Compare version strings (e.g., "1.0.0" vs "1.1.0")
 */
function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  
  return 0;
}

/**
 * Check if update was recently dismissed
 */
function wasRecentlyDismissed(version: string): boolean {
  const dismissed = localStorage.getItem(DISMISSED_KEY);
  if (!dismissed) return false;
  
  try {
    const data = JSON.parse(dismissed);
    const dismissedVersion = data.version;
    const dismissedTime = data.timestamp;
    
    // If dismissed version is same as current latest, and dismissed within last 24 hours
    if (dismissedVersion === version) {
      const hoursSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60);
      return hoursSinceDismissed < 24;
    }
  } catch (error) {
    // Invalid data, clear it
    localStorage.removeItem(DISMISSED_KEY);
  }
  
  return false;
}

/**
 * Mark update as dismissed
 */
export function dismissUpdate(version: string) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify({
    version,
    timestamp: Date.now()
  }));
}

/**
 * Check for app updates
 */
export function useAppUpdate() {
  const [status, setStatus] = useState<UpdateStatus>({
    hasUpdate: false,
    currentVersion: CURRENT_VERSION,
    latestVersion: CURRENT_VERSION,
    versionInfo: null,
    checking: false,
    error: null,
  });

  /**
   * Check for updates from server
   */
  const checkForUpdates = async () => {
    // Don't check in development mode
    if (import.meta.env.DEV) {
      console.log('[Update] Skipping update check in development mode');
      return;
    }

    setStatus(prev => ({ ...prev, checking: true, error: null }));

    try {
      // Fetch version info from server
      const response = await fetch(VERSION_CHECK_URL, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const versionInfo: VersionInfo = await response.json();
      const latestVersion = versionInfo.version;

      // Compare versions
      const comparison = compareVersions(latestVersion, CURRENT_VERSION);
      const hasUpdate = comparison > 0;

      // Check if was recently dismissed (unless critical)
      const recentlyDismissed = !versionInfo.critical && wasRecentlyDismissed(latestVersion);

      setStatus({
        hasUpdate: hasUpdate && !recentlyDismissed,
        currentVersion: CURRENT_VERSION,
        latestVersion,
        versionInfo: hasUpdate ? versionInfo : null,
        checking: false,
        error: null,
      });

      if (hasUpdate && !recentlyDismissed) {
        console.log(`[Update] New version available: ${latestVersion} (current: ${CURRENT_VERSION})`);
      } else if (hasUpdate && recentlyDismissed) {
        console.log(`[Update] Update available but recently dismissed`);
      } else {
        console.log('[Update] App is up to date');
      }

    } catch (error: any) {
      console.error('[Update] Failed to check for updates:', error);
      setStatus(prev => ({
        ...prev,
        checking: false,
        error: error.message || 'Failed to check for updates'
      }));
    }
  };

  /**
   * Dismiss current update notification
   */
  const dismiss = () => {
    if (status.latestVersion) {
      dismissUpdate(status.latestVersion);
      setStatus(prev => ({ ...prev, hasUpdate: false }));
    }
  };

  /**
   * Download the latest version
   */
  const downloadUpdate = () => {
    if (status.versionInfo?.downloadUrl) {
      window.open(status.versionInfo.downloadUrl, '_blank');
    }
  };

  // Check for updates on mount and periodically
  useEffect(() => {
    // Initial check after 10 seconds (give app time to load)
    const initialTimeout = setTimeout(() => {
      checkForUpdates();
    }, 10000);

    // Periodic checks
    const interval = setInterval(() => {
      checkForUpdates();
    }, CHECK_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  return {
    ...status,
    checkForUpdates,
    dismiss,
    downloadUpdate,
  };
}

