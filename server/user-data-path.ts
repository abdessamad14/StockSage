/**
 * User Data Path Manager
 * 
 * Determines the safe location for user data (database, license, etc.)
 * Uses OS-specific app data directories to protect data during updates
 * 
 * Windows: %APPDATA%/iGoodar
 * macOS: ~/Library/Application Support/iGoodar
 * Linux: ~/.local/share/igoodar
 */

import { join } from 'path';
import { homedir, platform } from 'os';
import { existsSync, mkdirSync } from 'fs';

/**
 * Get the safe user data directory for the application
 * This directory persists across app updates
 */
export function getUserDataPath(): string {
  const appName = 'iGoodar';
  let userDataPath: string;

  switch (platform()) {
    case 'win32':
      // Windows: %APPDATA%/iGoodar
      userDataPath = join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), appName);
      break;
    
    case 'darwin':
      // macOS: ~/Library/Application Support/iGoodar
      userDataPath = join(homedir(), 'Library', 'Application Support', appName);
      break;
    
    default:
      // Linux: ~/.local/share/igoodar
      userDataPath = join(homedir(), '.local', 'share', appName.toLowerCase());
      break;
  }

  // Ensure the directory exists
  if (!existsSync(userDataPath)) {
    mkdirSync(userDataPath, { recursive: true });
    console.log(`✅ Created user data directory: ${userDataPath}`);
  }

  return userDataPath;
}

/**
 * Get the old (legacy) data directory path
 * This is where data used to be stored (inside app installation)
 */
export function getLegacyDataPath(): string {
  return join(process.cwd(), 'data');
}

/**
 * Get the database file path in the safe user data directory
 */
export function getDatabasePath(): string {
  return join(getUserDataPath(), 'stocksage.db');
}

/**
 * Get the license key file path in the safe user data directory
 */
export function getLicenseKeyPath(): string {
  return join(getUserDataPath(), 'license.key');
}

/**
 * Get the machine ID file path in the safe user data directory
 */
export function getMachineIdPath(): string {
  return join(getUserDataPath(), 'machine.id');
}

/**
 * Get all critical files that need to be migrated
 */
export function getCriticalFiles(): Array<{ name: string; oldPath: string; newPath: string }> {
  const legacyDataPath = getLegacyDataPath();
  const userDataPath = getUserDataPath();

  return [
    {
      name: 'Database',
      oldPath: join(legacyDataPath, 'stocksage.db'),
      newPath: join(userDataPath, 'stocksage.db')
    },
    {
      name: 'Database WAL',
      oldPath: join(legacyDataPath, 'stocksage.db-wal'),
      newPath: join(userDataPath, 'stocksage.db-wal')
    },
    {
      name: 'Database SHM',
      oldPath: join(legacyDataPath, 'stocksage.db-shm'),
      newPath: join(userDataPath, 'stocksage.db-shm')
    },
    {
      name: 'License Key',
      oldPath: join(legacyDataPath, 'license.key'),
      newPath: join(userDataPath, 'license.key')
    },
    {
      name: 'Machine ID',
      oldPath: join(legacyDataPath, 'machine.id'),
      newPath: join(userDataPath, 'machine.id')
    },
    {
      name: 'Credit Transactions',
      oldPath: join(legacyDataPath, 'credit-transactions.json'),
      newPath: join(userDataPath, 'credit-transactions.json')
    }
  ];
}

