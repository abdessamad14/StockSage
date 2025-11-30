import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOfflineSettings } from '@/hooks/use-offline-settings';
import { useToast } from '@/hooks/use-toast';

export default function NetworkPrinterTest() {
  const { settings, updateSettings } = useOfflineSettings();
  const { toast } = useToast();
  const [ip, setIp] = useState('192.168.1.100');
  const [port, setPort] = useState('9100');
  const [status, setStatus] = useState('');

  // Load saved printer address on mount
  useEffect(() => {
    if (settings?.printerAddress) {
      const parts = settings.printerAddress.split(':');
      if (parts.length === 2) {
        setIp(parts[0]);
        setPort(parts[1]);
      } else {
        setIp(settings.printerAddress);
      }
    }
  }, [settings]);

  const saveSettings = async () => {
    try {
      const printerAddress = `${ip}:${port}`;
      await updateSettings({
        printerType: 'network',
        printerAddress
      });
      toast({
        title: 'Saved',
        description: 'Network printer settings saved successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: `Failed to save settings: ${error.message}`,
        variant: 'destructive'
      });
    }
  };

  const testPrint = async () => {
    try {
      setStatus('Printing...');
      // Simple ESC/POS test receipt
      const commands = [
        0x1B, 0x40, // Init
        ...Array.from(new TextEncoder().encode('TEST RECEIPT\n')),
        ...Array.from(new TextEncoder().encode('Network Printer\n')),
        ...Array.from(new TextEncoder().encode(`${new Date().toLocaleString()}\n`)),
        0x1D, 0x56, 0x00 // Cut
      ];
      
      const res = await fetch('/api/offline/print-network', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ipAddress: ip, port: parseInt(port), escPosData: commands })
      });
      
      if (!res.ok) throw new Error('Print failed');
      setStatus('✅ Sent to printer!');
    } catch (error: any) {
      setStatus(`❌ Error: ${error.message}`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Network Printer (ESC/POS)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>IP Address</Label>
          <Input value={ip} onChange={e => setIp(e.target.value)} placeholder="192.168.1.100" />
        </div>
        <div>
          <Label>Port</Label>
          <Input value={port} onChange={e => setPort(e.target.value)} placeholder="9100" />
        </div>
        <div className="flex gap-2">
          <Button onClick={saveSettings} variant="outline" className="flex-1">Save Settings</Button>
          <Button onClick={testPrint} className="flex-1">Test Print</Button>
        </div>
        {status && <p className="text-sm">{status}</p>}
      </CardContent>
    </Card>
  );
}
