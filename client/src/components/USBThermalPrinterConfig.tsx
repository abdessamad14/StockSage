import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Printer, Settings, Usb, Zap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useOfflineSettings } from '@/hooks/use-offline-settings';
import NetworkPrinterTest from './NetworkPrinterTest';

interface USBDevice {
  vendorId: number;
  productId: number;
  productName?: string;
  manufacturerName?: string;
}

interface PrinterSettings {
  printerType: string;
  paperSize: string;
  encoding: string;
  autoConnect: boolean;
  autoPrint: boolean;
  cashDrawer: boolean;
  buzzer: boolean;
  receiptHeader: string;
  receiptFooter: string;
}

export default function USBThermalPrinterConfig() {
  const { settings: globalSettings, updateSettings } = useOfflineSettings();
  const [availableDevices, setAvailableDevices] = useState<USBDevice[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionDialog, setConnectionDialog] = useState(false);
  const [error, setError] = useState<string>('');
  const [connectionType, setConnectionType] = useState<'usb' | 'network'>('usb');

  // Load saved printer type on mount
  useEffect(() => {
    if (globalSettings?.printerType === 'network') {
      setConnectionType('network');
    } else {
      setConnectionType('usb');
    }
  }, [globalSettings?.printerType]);

  // Get printer settings from global settings
  const isConnected = globalSettings?.printerConnected || false;
  const selectedDevice = globalSettings?.printerVendorId ? {
    vendorId: globalSettings.printerVendorId,
    productId: globalSettings.printerProductId || 0,
    productName: globalSettings.printerProductName || 'Unknown Printer',
    manufacturerName: globalSettings.printerManufacturerName || 'Unknown'
  } : null;

  const settings = {
    printerType: globalSettings?.printerType || 'USB Thermal Printer',
    paperSize: globalSettings?.printerPaperSize || '80mm',
    encoding: globalSettings?.printerEncoding || 'UTF-8',
    autoConnect: globalSettings?.printerAutoConnect || true,
    autoPrint: globalSettings?.printerAutoPrint || false,
    cashDrawer: globalSettings?.printerCashDrawer || false,
    buzzer: globalSettings?.printerBuzzer || false,
    receiptHeader: globalSettings?.receiptHeader || 'Thank you for your business!',
    receiptFooter: globalSettings?.receiptFooter || 'Visit us again soon!'
  };

  // Check WebUSB support
  const isWebUSBSupported = 'usb' in navigator;

  // Request USB device access
  const requestUSBDevice = async () => {
    if (!isWebUSBSupported) {
      setError('WebUSB is not supported in this browser');
      return;
    }

    try {
      setIsConnecting(true);
      setError('');
      
      // Request access to USB devices - include many thermal printer vendors
      const device = await navigator.usb.requestDevice({
        filters: [
          // BIXOLON printers
          { vendorId: 0x0419 },
          // Epson printers
          { vendorId: 0x04b8 },
          // Star printers
          { vendorId: 0x0519 },
          // Citizen printers
          { vendorId: 0x1D90 },
          // Zebra printers
          { vendorId: 0x0A5F },
          // TSC printers
          { vendorId: 0x1203 },
          // Xprinter / Generic Chinese printers
          { vendorId: 0x0483 },
          { vendorId: 0x0416 },
          { vendorId: 0x0493 },
          { vendorId: 0x0456 },
          { vendorId: 0x154F },
          { vendorId: 0x0FE6 },
          { vendorId: 0x0525 },
          { vendorId: 0x28E9 },
          { vendorId: 0x4B43 },
          // Rongta printers
          { vendorId: 0x0DD4 },
          // HPRT printers
          { vendorId: 0x0485 },
          // POS-X printers
          { vendorId: 0x0FE6 },
          // Generic thermal printers (printer class)
          { classCode: 7 }
        ]
      });

      // Update global settings with device info
      updateSettings({
        printerVendorId: device.vendorId,
        printerProductId: device.productId,
        printerProductName: device.productName || 'Unknown Printer',
        printerManufacturerName: device.manufacturerName || 'Unknown',
        printerConnected: true
      });

      // Simulate connection process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setConnectionDialog(false);
      
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        setError('No device selected');
      } else {
        setError(`Connection failed: ${error.message}`);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect printer
  const disconnectPrinter = () => {
    updateSettings({
      printerConnected: false,
      printerVendorId: null,
      printerProductId: null,
      printerProductName: null,
      printerManufacturerName: null
    });
    setError('');
  };

  // Test print with real USB communication
  const testPrint = async () => {
    if (!isConnected || !selectedDevice) {
      setError('Printer not connected');
      return;
    }

    try {
      setError('');
      console.log('Sending test print to USB thermal printer...');
      
      // Get the actual USB device
      const devices = await navigator.usb.getDevices();
      const device = devices.find(d => 
        d.vendorId === selectedDevice.vendorId && 
        d.productId === selectedDevice.productId
      );
      
      if (!device) {
        throw new Error('USB device not found');
      }

      // Open device connection - may require re-authorization
      if (!device.opened) {
        try {
          await device.open();
        } catch (openError: any) {
          // If access denied, try to request the device again
          if (openError.name === 'SecurityError' || openError.message.includes('Access denied') || openError.message.includes('denied')) {
            // Try to re-request the device
            try {
              const newDevice = await navigator.usb.requestDevice({
                filters: [{ vendorId: selectedDevice.vendorId, productId: selectedDevice.productId }]
              });
              await newDevice.open();
              // Update the device reference
              Object.assign(device, newDevice);
            } catch (reAuthError) {
              throw new Error('USB access denied. The printer may be in use by another application. Try: 1) Unplug and replug the printer, 2) Close other applications using the printer, 3) Click "Connect Printer" again.');
            }
          } else {
            throw openError;
          }
        }
      }

      // Select configuration (usually configuration 1)
      try {
        if (device.configuration === null) {
          await device.selectConfiguration(1);
        }
      } catch (configError: any) {
        console.warn('Could not select configuration:', configError);
        // Some printers don't need explicit configuration selection
      }

      // Find the bulk OUT endpoint for sending data
      const interface_ = device.configuration?.interfaces[0];
      if (!interface_) {
        throw new Error('No interface found. The printer may not be compatible with WebUSB.');
      }

      // Try to claim interface, handle if already claimed
      try {
        await device.claimInterface(interface_.interfaceNumber);
      } catch (claimError: any) {
        if (claimError.message.includes('claimed') || claimError.message.includes('in use')) {
          throw new Error('Printer is in use by another application. Please close other printing software and try again.');
        }
        throw claimError;
      }

      // Generate ESC/POS test receipt
      const escPos = generateTestReceipt();
      
      // Find the OUT endpoint
      const endpoint = interface_.alternate.endpoints.find(
        ep => ep.direction === 'out' && ep.type === 'bulk'
      );
      
      if (!endpoint) {
        throw new Error('No bulk OUT endpoint found');
      }

      // Send data to printer
      await device.transferOut(endpoint.endpointNumber, escPos);
      
      // Release interface
      await device.releaseInterface(interface_.interfaceNumber);
      
      console.log('Test print sent successfully to USB device');
      alert('Test print sent to printer!');
      
    } catch (error: any) {
      console.error('Test print error:', error);
      setError(`Test print failed: ${error.message}`);
    }
  };

  // Generate ESC/POS commands for test receipt
  const generateTestReceipt = (): Uint8Array => {
    const commands: number[] = [];
    
    // ESC/POS Commands
    const ESC = 0x1B;
    const GS = 0x1D;
    
    // Initialize printer
    commands.push(ESC, 0x40);
    
    // Set alignment to center
    commands.push(ESC, 0x61, 0x01);
    
    // Print header
    const header = settings.receiptHeader || 'TEST RECEIPT';
    commands.push(...Array.from(new TextEncoder().encode(header)));
    commands.push(0x0A, 0x0A); // Line feeds
    
    // Set alignment to left
    commands.push(ESC, 0x61, 0x00);
    
    // Print test content
    const testContent = [
      'Date: ' + new Date().toLocaleDateString(),
      'Time: ' + new Date().toLocaleTimeString(),
      '--------------------------------',
      'Test Item 1          $10.00',
      'Test Item 2           $5.50',
      '--------------------------------',
      'Total:               $15.50',
      '--------------------------------'
    ];
    
    testContent.forEach(line => {
      commands.push(...Array.from(new TextEncoder().encode(line)));
      commands.push(0x0A); // Line feed
    });
    
    // Print footer
    commands.push(0x0A);
    commands.push(ESC, 0x61, 0x01); // Center align
    const footer = settings.receiptFooter || 'Thank you!';
    commands.push(...Array.from(new TextEncoder().encode(footer)));
    commands.push(0x0A, 0x0A);
    
    // Cut paper (if supported)
    commands.push(GS, 0x56, 0x00);
    
    // Cash drawer (if enabled)
    if (settings.cashDrawer) {
      commands.push(ESC, 0x70, 0x00, 0x19, 0x19);
    }
    
    // Buzzer (if enabled)
    if (settings.buzzer) {
      commands.push(ESC, 0x42, 0x05, 0x05);
    }
    
    return new Uint8Array(commands);
  };

  // Update settings
  const updateSetting = (key: keyof PrinterSettings, value: any) => {
    switch (key) {
      case 'printerType':
        updateSettings({ printerType: value });
        break;
      case 'paperSize':
        updateSettings({ printerPaperSize: value });
        break;
      case 'encoding':
        updateSettings({ printerEncoding: value });
        break;
      case 'autoConnect':
        updateSettings({ printerAutoConnect: value });
        break;
      case 'autoPrint':
        updateSettings({ printerAutoPrint: value });
        break;
      case 'cashDrawer':
        updateSettings({ printerCashDrawer: value });
        break;
      case 'buzzer':
        updateSettings({ printerBuzzer: value });
        break;
      case 'receiptHeader':
        updateSettings({ receiptHeader: value });
        break;
      case 'receiptFooter':
        updateSettings({ receiptFooter: value });
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Thermal Printer Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Thermal Printer Configuration
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure your USB thermal printer for receipt printing
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="connection-type">Connection Type</Label>
            <Select 
              value={connectionType} 
              onValueChange={(value: any) => setConnectionType(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="usb">USB Thermal Printer</SelectItem>
                <SelectItem value="network">Network Printer (IP)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* USB Thermal Printer Section */}
          {connectionType === 'usb' && (
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">USB Thermal Printer</h4>
                <p className="text-sm text-muted-foreground">
                  Configure your USB thermal printer for automatic receipt printing
                </p>
              </div>
              <Dialog open={connectionDialog} onOpenChange={setConnectionDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Printer
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Printer className="h-5 w-5" />
                      Thermal Printer
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    {/* Connection Status */}
                    {selectedDevice && (
                      <div className="p-3 border rounded-lg">
                        <div className="text-sm font-medium">
                          {selectedDevice.productName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {selectedDevice.manufacturerName} • Vendor ID: {selectedDevice.vendorId} • Product ID: {selectedDevice.productId}
                        </div>
                      </div>
                    )}

                    {/* Connection Button */}
                    {!isConnected ? (
                      <Button 
                        onClick={requestUSBDevice} 
                        disabled={isConnecting || !isWebUSBSupported}
                        className="w-full"
                      >
                        {isConnecting ? 'Connecting...' : 'Connect'}
                      </Button>
                    ) : (
                      <Button 
                        onClick={disconnectPrinter} 
                        variant="outline"
                        className="w-full"
                      >
                        Disconnect
                      </Button>
                    )}

                    {/* Auto Connect */}
                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto-connect">Auto Connect</Label>
                      <Switch
                        id="auto-connect"
                        checked={settings.autoConnect}
                        onCheckedChange={(checked) => updateSetting('autoConnect', checked)}
                      />
                    </div>

                    {/* Paper Size */}
                    <div className="space-y-2">
                      <Label>Paper Size</Label>
                      <Select 
                        value={settings.paperSize} 
                        onValueChange={(value) => updateSetting('paperSize', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="58mm">58mm</SelectItem>
                          <SelectItem value="80mm">80mm</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Encoding */}
                    <div className="space-y-2">
                      <Label>Encoding</Label>
                      <Select 
                        value={settings.encoding} 
                        onValueChange={(value) => updateSetting('encoding', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UTF-8">UTF-8</SelectItem>
                          <SelectItem value="CP1252">CP1252</SelectItem>
                          <SelectItem value="ISO-8859-1">ISO-8859-1</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Cash Drawer */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="cash-drawer">Cash Drawer</Label>
                        <p className="text-xs text-muted-foreground">Open cash drawer after printing</p>
                      </div>
                      <Switch
                        id="cash-drawer"
                        checked={settings.cashDrawer}
                        onCheckedChange={(checked) => updateSetting('cashDrawer', checked)}
                      />
                    </div>

                    {/* Buzzer */}
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="buzzer">Buzzer</Label>
                        <p className="text-xs text-muted-foreground">Sound buzzer after printing</p>
                      </div>
                      <Switch
                        id="buzzer"
                        checked={settings.buzzer}
                        onCheckedChange={(checked) => updateSetting('buzzer', checked)}
                      />
                    </div>

                    <Separator />

                    {/* Setup Instructions */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium text-blue-600">Setup Instructions</span>
                      </div>
                      <ol className="text-xs space-y-1 text-muted-foreground">
                        <li>1. Connect your thermal printer via USB cable</li>
                        <li>2. Click "Connect Printer" and select your device</li>
                        <li>3. Run a test print to verify connection</li>
                        <li>4. Configure settings according to your printer model</li>
                        <li>5. Enable "Auto Print" for automatic receipt printing</li>
                      </ol>
                    </div>

                    {/* Test Print Button */}
                    {isConnected && (
                      <Button 
                        onClick={testPrint}
                        variant="outline" 
                        className="w-full"
                      >
                        Test Print
                      </Button>
                    )}

                    {/* Close Button */}
                    <Button 
                      onClick={() => setConnectionDialog(false)}
                      variant="ghost"
                      className="w-full"
                    >
                      Close
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <Badge variant={isConnected ? "default" : "secondary"}>
                Status: {isConnected ? "Connected" : "Disconnected"}
              </Badge>
              {selectedDevice && (
                <span className="text-sm text-muted-foreground">
                  Vendor ID: {selectedDevice.vendorId} | Product ID: {selectedDevice.productId}
                </span>
              )}
            </div>
          </div>
          )}

          {/* Network Printer Section */}
          {connectionType === 'network' && <NetworkPrinterTest />}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* WebUSB Support Warning */}
          {!isWebUSBSupported && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                WebUSB is not supported in this browser. Please use Chrome, Edge, or another Chromium-based browser for USB printer support.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Receipt Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Receipt Settings</CardTitle>
          <p className="text-sm text-muted-foreground">
            Customize receipt header and footer text
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="receipt-header">Receipt Header</Label>
            <Input
              id="receipt-header"
              value={settings.receiptHeader}
              onChange={(e) => updateSetting('receiptHeader', e.target.value)}
              placeholder="Thank you for your business!"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt-footer">Receipt Footer</Label>
            <Input
              id="receipt-footer"
              value={settings.receiptFooter}
              onChange={(e) => updateSetting('receiptFooter', e.target.value)}
              placeholder="Visit us again soon!"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
