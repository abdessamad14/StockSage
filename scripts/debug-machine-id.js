/**
 * Debug tool to see what network interfaces are being used for machine ID
 * Run: node scripts/debug-machine-id.js
 */

import os from 'os';
import crypto from 'crypto';

console.log('\n🔍 Network Interfaces Debug\n');
console.log('Hostname:', os.hostname());
console.log('\n📡 All Network Interfaces:\n');

const networkInterfaces = os.networkInterfaces();
const physicalMacs = [];

for (const [name, interfaces] of Object.entries(networkInterfaces)) {
  console.log(`Interface: ${name}`);
  
  const isVirtual = name.toLowerCase().includes('vethernet') || 
                    name.toLowerCase().includes('vmware') || 
                    name.toLowerCase().includes('virtualbox') ||
                    name.toLowerCase().includes('vboxnet') ||
                    name.toLowerCase().includes('docker');
  
  for (const net of interfaces) {
    const status = net.internal ? '(internal)' : 
                   net.mac === '00:00:00:00:00:00' ? '(null MAC)' : 
                   isVirtual ? '(virtual - SKIPPED)' : 
                   '(physical - USED ✓)';
    
    console.log(`  - MAC: ${net.mac} ${status}`);
    console.log(`    Family: ${net.family}, Address: ${net.address}`);
    
    if (!isVirtual && net.mac && net.mac !== '00:00:00:00:00:00') {
      physicalMacs.push(net.mac);
    }
  }
  console.log('');
}

// Calculate machine ID
physicalMacs.sort();
const allMacs = physicalMacs.join('-') || 'no-mac-found';
const uniqueString = allMacs + os.hostname();
const machineId = crypto.createHash('sha256').update(uniqueString).digest('hex').substring(0, 16);

console.log('📋 Machine ID Calculation:');
console.log('  Physical MACs used:', physicalMacs.join(', '));
console.log('  Combined string:', uniqueString);
console.log('  \n✅ Machine ID:', machineId);
console.log('\n💡 This ID should be the same whether online or offline!\n');
