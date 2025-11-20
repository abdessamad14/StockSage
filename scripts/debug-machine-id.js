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

// Try Windows getmac command (works offline)
let windowsMacs = [];
if (process.platform === 'win32') {
  console.log('\n🪟 Windows getmac Command:\n');
  try {
    const output = execSync('getmac /v /fo csv', { 
      encoding: 'utf8', 
      stdio: ['pipe', 'pipe', 'ignore'] 
    });
    
    const lines = output.split('\n');
    for (const line of lines) {
      if (!line || line.startsWith('Connection') || line.startsWith('"Connection')) {
        continue;
      }
      
      const match = line.match(/"([^"]+)","([^"]+)","([0-9A-Fa-f-]+)"/);
      if (match) {
        const connectionName = match[1];
        const adapterName = match[2];
        const macWithDashes = match[3];
        
        if (!macWithDashes || macWithDashes === 'N/A' || macWithDashes.includes('Disabled')) {
          continue;
        }
        
        const isVirtual = 
          adapterName.toLowerCase().includes('virtual') ||
          adapterName.toLowerCase().includes('vmware') ||
          adapterName.toLowerCase().includes('virtualbox') ||
          adapterName.toLowerCase().includes('hyper-v') ||
          connectionName.toLowerCase().includes('virtual');
        
        if (isVirtual) {
          console.log(`  ⊘ Skipped virtual: ${adapterName} (${macWithDashes})`);
          continue;
        }
        
        const mac = macWithDashes.replace(/-/g, ':').toLowerCase();
        windowsMacs.push(mac);
        console.log(`  ✓ Found permanent MAC: ${mac} (${adapterName})`);
      }
    }
    
    if (windowsMacs.length === 0) {
      console.log('  ⚠️ No physical MACs found via getmac');
    }
  } catch (error) {
    console.log('  ❌ getmac command failed:', error.message);
  }
}

console.log('\n📡 Current Network Interfaces:\n');

const networkInterfaces = os.networkInterfaces();
const permanentMacs = [...windowsMacs]; // Start with Windows getmac MACs

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
