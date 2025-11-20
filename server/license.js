/**
 * Igoodar License System
 * One-time use: 1 license = 1 PC only
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LICENSE_FILE = path.join(__dirname, '..', 'data', 'license.key');
const SECRET = 'IGOODAR-2025-PROTECT-YOUR-BUSINESS'; // Change this to your own secret!

/**
 * Get unique machine ID (hardware fingerprint)
 * Uses only physical network adapters for stability
 */
function getMachineId() {
  const networkInterfaces = os.networkInterfaces();
  const macs = [];
  
  // Get all MAC addresses from physical interfaces (skip virtual adapters)
  for (const name of Object.keys(networkInterfaces)) {
    // Skip virtual/temporary adapters
    if (name.includes('vEthernet') || name.includes('VMware') || name.includes('VirtualBox')) {
      continue;
    }
    
    for (const net of networkInterfaces[name]) {
      if (net.mac && net.mac !== '00:00:00:00:00:00' && !net.internal) {
        macs.push(net.mac);
      }
    }
  }
  
  // Sort and use only the first MAC (most stable physical adapter)
  macs.sort();
  const primaryMac = macs[0] || 'no-mac-found';
  
  // Use primary MAC + hostname for unique ID
  const uniqueString = primaryMac + os.hostname();
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
