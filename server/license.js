/**
 * Igoodar License System
 * One-time use: 1 license = 1 PC only
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import { execSync } from 'child_process';
import { getLicenseKeyPath, getMachineIdPath } from './user-data-path.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use safe user data paths (persist across updates)
const LICENSE_FILE = getLicenseKeyPath();
const MACHINE_ID_FILE = getMachineIdPath();
const SECRET = 'IGOODAR-2025-PROTECT-YOUR-BUSINESS'; // Change this to your own secret!

// Cached machine ID to ensure consistency
let cachedMachineId = null;

/**
 * Get MAC addresses using Windows getmac command (works even when offline)
 * This is more reliable than registry for getting permanent MAC addresses
 */
function getWindowsPermanentMacs() {
  try {
    // Use getmac command which shows physical addresses even when offline
    const output = execSync('getmac /v /fo csv', { 
      encoding: 'utf8', 
      stdio: ['pipe', 'pipe', 'ignore'] 
    });
    
    const macs = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Skip header and empty lines
      if (!line || line.startsWith('Connection') || line.startsWith('"Connection')) {
        continue;
      }
      
      // Parse CSV: "Connection Name","Network Adapter","Physical Address","Transport Name"
      const match = line.match(/"([^"]+)","([^"]+)","([0-9A-Fa-f-]+)"/);
      if (match) {
        const connectionName = match[1];
        const adapterName = match[2];
        const macWithDashes = match[3];
        
        // Skip if no MAC or disabled/disconnected
        if (!macWithDashes || macWithDashes === 'N/A' || macWithDashes.includes('Disabled')) {
          continue;
        }
        
        // Skip virtual adapters
        const isVirtual = 
          adapterName.toLowerCase().includes('virtual') ||
          adapterName.toLowerCase().includes('vmware') ||
          adapterName.toLowerCase().includes('virtualbox') ||
          adapterName.toLowerCase().includes('hyper-v') ||
          connectionName.toLowerCase().includes('virtual');
        
        if (isVirtual) {
          continue;
        }
        
        // Convert to standard format (XX:XX:XX:XX:XX:XX)
        const mac = macWithDashes.replace(/-/g, ':').toLowerCase();
        macs.push(mac);
      }
    }
    
    return macs;
  } catch (error) {
    // getmac command failed, return empty array
    return [];
  }
}

/**
 * Generate a new machine ID from hardware
 */
function generateMachineIdFromHardware() {
  const permanentMacs = [];
  
  // On Windows, use getmac command (works offline)
  if (process.platform === 'win32') {
    const windowsMacs = getWindowsPermanentMacs();
    if (windowsMacs.length > 0) {
      permanentMacs.push(...windowsMacs);
    }
  }
  
  // Also check current network interfaces (works when online)
  const networkInterfaces = os.networkInterfaces();
  
  for (const [name, interfaces] of Object.entries(networkInterfaces)) {
    const nameLower = name.toLowerCase();
    
    // Skip ALL virtual/temporary adapters
    const isVirtualOrTemporary = 
      nameLower.includes('vethernet') || 
      nameLower.includes('vmware') || 
      nameLower.includes('virtualbox') ||
      nameLower.includes('vboxnet') ||
      nameLower.includes('docker') ||
      nameLower.includes('utun') ||      // Tunnel interfaces
      nameLower.includes('awdl') ||      // Apple Wireless Direct Link
      nameLower.includes('llw') ||       // Low Latency WLAN
      nameLower.includes('bridge') ||    // Network bridges
      nameLower.includes('tap') ||       // TAP interfaces
      nameLower.includes('tun') ||       // TUN interfaces
      nameLower.startsWith('lo');        // Loopback
    
    if (isVirtualOrTemporary) {
      continue;
    }
    
    // Only accept permanent physical adapters (Ethernet, WiFi)
    const isPermanentPhysical = 
      nameLower.includes('ethernet') ||
      nameLower.includes('eth') ||
      nameLower.includes('en') ||        // macOS: en0, en1
      nameLower.includes('wi-fi') ||
      nameLower.includes('wifi') ||
      nameLower.includes('wlan');
    
    if (!isPermanentPhysical) {
      continue;
    }
    
    for (const net of interfaces) {
      // Only use valid, non-internal MACs
      if (net.mac && net.mac !== '00:00:00:00:00:00' && !net.internal) {
        permanentMacs.push(net.mac);
      }
    }
  }
  
  // Remove duplicates and sort
  const uniqueMacs = [...new Set(permanentMacs)].sort();
  const macString = uniqueMacs.join('-') || 'no-mac-found';
  
  // Use permanent MACs + hostname for unique ID
  const uniqueString = macString + os.hostname();
  return crypto.createHash('sha256').update(uniqueString).digest('hex').substring(0, 16);
}

/**
 * Get unique machine ID (hardware fingerprint)
 * IMPORTANT: Once generated, the machine ID is cached to file to ensure
 * it stays the same even when network conditions change (online/offline)
 */
function getMachineId() {
  // Return cached ID if available
  if (cachedMachineId) {
    return cachedMachineId;
  }
  
  // Try to load from file first (ensures consistency across restarts)
  try {
    if (fs.existsSync(MACHINE_ID_FILE)) {
      const savedId = fs.readFileSync(MACHINE_ID_FILE, 'utf8').trim();
      if (savedId && savedId.length === 16) {
        cachedMachineId = savedId;
        console.log('📋 Machine ID loaded from cache:', cachedMachineId);
        return cachedMachineId;
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not read cached machine ID:', error.message);
  }
  
  // Generate new machine ID from hardware
  cachedMachineId = generateMachineIdFromHardware();
  
  // Save to file for future consistency
  try {
    const dataDir = path.dirname(MACHINE_ID_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(MACHINE_ID_FILE, cachedMachineId, 'utf8');
    console.log('💾 Machine ID saved to cache:', cachedMachineId);
  } catch (error) {
    console.warn('⚠️ Could not save machine ID to cache:', error.message);
  }
  
  return cachedMachineId;
}

/**
 * Generate a license key for a customer
 * Run this on YOUR machine to generate keys
 */
export function generateLicenseKey(customerName, machineId, expiryDate = null) {
  const data = {
    customer: customerName,
    machine: machineId,
    issued: new Date().toISOString().split('T')[0],
    expiry: expiryDate || 'perpetual',
    version: '1.0'
  };
  
  const payload = Buffer.from(JSON.stringify(data)).toString('base64');
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(payload)
    .digest('hex')
    .substring(0, 16);
  
  return `IGOODAR-${payload}-${signature}`;
}

/**
 * Validate a license key
 */
export function validateLicenseKey(licenseKey) {
  try {
    // Check format
    if (!licenseKey.startsWith('IGOODAR-')) {
      return { valid: false, error: 'Invalid license format' };
    }
    
    const parts = licenseKey.replace('IGOODAR-', '').split('-');
    if (parts.length !== 2) {
      return { valid: false, error: 'Invalid license format' };
    }
    
    const [payload, signature] = parts;
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', SECRET)
      .update(payload)
      .digest('hex')
      .substring(0, 16);
    
    if (signature !== expectedSignature) {
      return { valid: false, error: 'Invalid license key - signature mismatch' };
    }
    
    // Decode payload
    const data = JSON.parse(Buffer.from(payload, 'base64').toString());
    
    // Check if license is for this machine
    const currentMachineId = getMachineId();
    if (data.machine !== currentMachineId) {
      return { 
        valid: false, 
        error: 'This license is registered to another computer',
        details: 'This license has already been activated on a different PC. Please contact your vendor for a new license.'
      };
    }
    
    // Check expiry
    if (data.expiry !== 'perpetual') {
      const expiryDate = new Date(data.expiry);
      if (expiryDate < new Date()) {
        return { 
          valid: false, 
          error: 'License expired',
          expiredOn: data.expiry
        };
      }
    }
    
    return { valid: true, data };
  } catch (error) {
    return { valid: false, error: 'Invalid license format' };
  }
}

/**
 * Save license key to file
 */
export function saveLicenseKey(licenseKey) {
  const dir = path.dirname(LICENSE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(LICENSE_FILE, licenseKey, 'utf8');
}

/**
 * Load license key from file
 */
export function loadLicenseKey() {
  try {
    if (fs.existsSync(LICENSE_FILE)) {
      return fs.readFileSync(LICENSE_FILE, 'utf8').trim();
    }
  } catch (error) {
    console.error('Error loading license:', error);
  }
  return null;
}

/**
 * Check if application is licensed
 */
export function checkLicense() {
  const licenseKey = loadLicenseKey();
  
  if (!licenseKey) {
    return {
      licensed: false,
      message: 'No license key found',
      machineId: getMachineId()
    };
  }
  
  const validation = validateLicenseKey(licenseKey);
  
  if (!validation.valid) {
    return {
      licensed: false,
      message: validation.error,
      details: validation.details,
      machineId: getMachineId()
    };
  }
  
  return {
    licensed: true,
    customer: validation.data.customer,
    issued: validation.data.issued,
    expiry: validation.data.expiry,
    message: `Licensed to: ${validation.data.customer}`
  };
}

/**
 * Get machine ID for license generation
 */
export function getThisMachineId() {
  return getMachineId();
}
