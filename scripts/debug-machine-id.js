/**
 * Debug tool to see what network interfaces are being used for machine ID
 * Run: node scripts/debug-machine-id.js
 */

import os from 'os';
import crypto from 'crypto';
import { execSync } from 'child_process';

console.log('\n🔍 Network Interfaces Debug\n');
console.log('Platform:', process.platform);
console.log('Hostname:', os.hostname());

// Try Windows registry first (works offline)
let registryMacs = [];
if (process.platform === 'win32') {
  console.log('\n🪟 Windows Registry Check:\n');
  try {
    const output = execSync(
      'reg query "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e972-e325-11ce-bfc1-08002be10318}" /s /v NetworkAddress',
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
    );
    
    const lines = output.split('\n');
    for (const line of lines) {
      if (line.includes('NetworkAddress') && line.includes('REG_SZ')) {
        const match = line.match(/REG_SZ\s+([0-9A-Fa-f]{12})/);
        if (match) {
          const mac = match[1].match(/.{1,2}/g).join(':').toLowerCase();
          registryMacs.push(mac);
          console.log(`  ✓ Found permanent MAC in registry: ${mac}`);
        }
      }
    }
    
    if (registryMacs.length === 0) {
      console.log('  ⚠️ No MACs found in registry');
    }
  } catch (error) {
    console.log('  ❌ Registry query failed:', error.message);
  }
}

console.log('\n📡 Current Network Interfaces:\n');

const networkInterfaces = os.networkInterfaces();
const permanentMacs = [...registryMacs]; // Start with registry MACs

for (const [name, interfaces] of Object.entries(networkInterfaces)) {
  const nameLower = name.toLowerCase();
  
  // Check if virtual/temporary
  const isVirtualOrTemporary = 
    nameLower.includes('vethernet') || 
    nameLower.includes('vmware') || 
    nameLower.includes('virtualbox') ||
    nameLower.includes('vboxnet') ||
    nameLower.includes('docker') ||
    nameLower.includes('utun') ||
    nameLower.includes('awdl') ||
    nameLower.includes('llw') ||
    nameLower.includes('bridge') ||
    nameLower.includes('tap') ||
    nameLower.includes('tun') ||
    nameLower.startsWith('lo');
  
  // Check if permanent physical
  const isPermanentPhysical = 
    nameLower.includes('ethernet') ||
    nameLower.includes('eth') ||
    nameLower.includes('en') ||
    nameLower.includes('wi-fi') ||
    nameLower.includes('wifi') ||
    nameLower.includes('wlan');
  
  console.log(`Interface: ${name}`);
  
  for (const net of interfaces) {
    let status;
    if (net.internal) {
      status = '(internal - SKIPPED)';
    } else if (net.mac === '00:00:00:00:00:00') {
      status = '(null MAC - SKIPPED)';
    } else if (isVirtualOrTemporary) {
      status = '(virtual/temporary - SKIPPED)';
    } else if (!isPermanentPhysical) {
      status = '(not permanent physical - SKIPPED)';
    } else {
      status = '(permanent physical - USED ✓)';
      permanentMacs.push(net.mac);
    }
    
    console.log(`  - MAC: ${net.mac} ${status}`);
    console.log(`    Family: ${net.family}, Address: ${net.address}`);
  }
  console.log('');
}

// Calculate machine ID
const uniqueMacs = [...new Set(permanentMacs)].sort();
const macString = uniqueMacs.join('-') || 'no-mac-found';
const uniqueString = macString + os.hostname();
const machineId = crypto.createHash('sha256').update(uniqueString).digest('hex').substring(0, 16);

console.log('📋 Machine ID Calculation:');
console.log('  Permanent Physical MACs used:', uniqueMacs.join(', '));
console.log('  Combined string:', uniqueString);
console.log('  \n✅ Machine ID:', machineId);
console.log('\n💡 This ID should be STABLE whether online or offline!');
console.log('💡 Only uses permanent Ethernet/WiFi adapters (no VPN, tunnels, etc.)\n');
