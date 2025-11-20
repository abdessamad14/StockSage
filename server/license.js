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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LICENSE_FILE = path.join(__dirname, '..', 'data', 'license.key');
const SECRET = 'IGOODAR-2025-PROTECT-YOUR-BUSINESS'; // Change this to your own secret!

/**
 * Get MAC addresses from Windows registry (works even when offline)
 * Windows stores permanent MAC addresses in registry
 */
function getWindowsRegistryMacs() {
  try {
    // Query Windows registry for network adapters
    const output = execSync(
      'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e972-e325-11ce-bfc1-08002be10318}" /s /v NetworkAddress',
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
    );
    
    const macs = [];
    const lines = output.split('\n');
    
    for (const line of lines) {
      // Look for NetworkAddress registry value (permanent MAC)
      if (line.includes('NetworkAddress') && line.includes('REG_SZ')) {
        const match = line.match(/REG_SZ\s+([0-9A-Fa-f]{12})/);
        if (match) {
          // Convert to standard MAC format (XX:XX:XX:XX:XX:XX)
          const mac = match[1].match(/.{1,2}/g).join(':').toLowerCase();
          macs.push(mac);
        }
      }
    }
    
    return macs;
  } catch (error) {
    // Registry query failed, return empty array
    return [];
  }
}

/**
 * Get unique machine ID (hardware fingerprint)
 * Uses permanent physical adapters - works online and offline
 */
function getMachineId() {
  const permanentMacs = [];
  
  // On Windows, try registry first (works offline)
  if (process.platform === 'win32') {
    const registryMacs = getWindowsRegistryMacs();
    if (registryMacs.length > 0) {
      permanentMacs.push(...registryMacs);
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
