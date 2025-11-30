import net from 'net';

// Send ESC/POS commands to network printer
export function printToNetwork(ipAddress, port, escPosBuffer) {
  return new Promise((resolve, reject) => {
    const client = net.connect(port, ipAddress, () => {
      client.write(escPosBuffer);
      client.end();
    });
    
    client.on('end', () => resolve());
    client.on('error', (err) => reject(err));
    
    setTimeout(() => {
      client.destroy();
      reject(new Error('Print timeout'));
    }, 5000);
  });
}
