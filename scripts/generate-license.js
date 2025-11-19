#!/usr/bin/env node

/**
 * License Key Generator for Igoodar
 * 
 * Usage:
 *   node scripts/generate-license.js "Customer Name" "Machine ID"
 *   node scripts/generate-license.js "Customer Name" "Machine ID" "2026-12-31"
 * 
 * Example:
 *   node scripts/generate-license.js "Restaurant ABC" "a1b2c3d4e5f6g7h8"
 */

import crypto from 'crypto';

const SECRET = 'IGOODAR-2025-PROTECT-YOUR-BUSINESS'; // Must match server/license.js

function generateLicenseKey(customerName, machineId, expiryDate = null) {
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

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('\n========================================');
  console.log('   Igoodar License Key Generator');
  console.log('========================================\n');
  console.log('Usage:');
  console.log('  node scripts/generate-license.js "Customer Name" "Machine ID" [expiry-date]\n');
  console.log('Examples:');
  console.log('  node scripts/generate-license.js "Restaurant ABC" "a1b2c3d4e5f6g7h8"');
  console.log('  node scripts/generate-license.js "Restaurant ABC" "a1b2c3d4e5f6g7h8" "2026-12-31"\n');
  console.log('Note: Customer must provide their Machine ID from the activation screen\n');
  process.exit(1);
}

const customerName = args[0];
const machineId = args[1];
const expiryDate = args[2] || null;

// Generate license key
const licenseKey = generateLicenseKey(customerName, machineId, expiryDate);

// Display result
console.log('\n========================================');
console.log('   License Key Generated Successfully');
console.log('========================================\n');
console.log('Customer:   ', customerName);
console.log('Machine ID: ', machineId);
console.log('Issued:     ', new Date().toISOString().split('T')[0]);
console.log('Expiry:     ', expiryDate || 'Perpetual (Never expires)');
console.log('\n========================================');
console.log('   LICENSE KEY');
console.log('========================================\n');
console.log(licenseKey);
console.log('\n========================================\n');
console.log('Send this license key to your customer.');
console.log('They will enter it in the activation screen.\n');
