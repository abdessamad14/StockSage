import { useOfflineSettings } from '@/hooks/use-offline-settings';

export interface ReceiptData {
  invoiceNumber: string;
  date: Date;
  customerName?: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  discountAmount?: number;
  taxAmount?: number;
  total: number;
  paidAmount: number;
  changeAmount?: number;
  paymentMethod: string;
}

export class ThermalReceiptPrinter {
  // Check if printer is connected and ready
  static async isPrinterReady(): Promise<boolean> {
    try {
      const settings = JSON.parse(localStorage.getItem('stocksage_settings') || '[]');
      const currentSettings = settings.length > 0 ? settings[0] : null;
      
      return !!(
        currentSettings?.printerConnected &&
        currentSettings?.printerVendorId &&
        currentSettings?.printerProductId &&
        'usb' in navigator
      );
    } catch {
      return false;
    }
  }

  // Print receipt using the same logic as the test print
  static async printReceipt(receiptData: ReceiptData): Promise<void> {
    const settings = JSON.parse(localStorage.getItem('stocksage_settings') || '[]');
    const currentSettings = settings.length > 0 ? settings[0] : null;
    
    if (!currentSettings?.printerConnected || !currentSettings?.printerVendorId) {
      throw new Error('Printer not connected');
    }

    try {
      console.log('Printing receipt to USB thermal printer...');
      
      // Get the actual USB device
      const devices = await (navigator as any).usb.getDevices();
      const device = devices.find((d: any) => 
        d.vendorId === currentSettings.printerVendorId && 
        d.productId === currentSettings.printerProductId
      );
      
      if (!device) {
        throw new Error('USB device not found');
      }

      // Open device connection
      if (!device.opened) {
        await device.open();
      }

      // Select configuration (usually configuration 1)
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }

      // Find the bulk OUT endpoint for sending data
      const interface_ = device.configuration?.interfaces[0];
      if (!interface_) {
        throw new Error('No interface found');
      }

      await device.claimInterface(interface_.interfaceNumber);

      // Generate ESC/POS receipt
      const escPos = ThermalReceiptPrinter.generateReceiptCommands(receiptData, currentSettings);
      
      // Find the OUT endpoint
      const endpoint = interface_.alternate.endpoints.find(
        (ep: any) => ep.direction === 'out' && ep.type === 'bulk'
      );
      
      if (!endpoint) {
        throw new Error('No bulk OUT endpoint found');
      }

      // Send data to printer
      await device.transferOut(endpoint.endpointNumber, escPos);
      
      // Release interface
      await device.releaseInterface(interface_.interfaceNumber);
      
      console.log('Receipt printed successfully to USB device');
      
    } catch (error: any) {
      console.error('Receipt print error:', error);
      throw new Error(`Receipt print failed: ${error.message}`);
    }
  }

  // Generate ESC/POS commands for receipt
  private static generateReceiptCommands(receiptData: ReceiptData, settings: any): Uint8Array {
    const commands: number[] = [];
    
    // ESC/POS Commands
    const ESC = 0x1B;
    const GS = 0x1D;
    
    // Initialize printer
    commands.push(ESC, 0x40);
    
    // Set character set to UTF-8
    commands.push(ESC, 0x74, 0x06);
    
    // Set line spacing to default
    commands.push(ESC, 0x32);
    
    // Print blank line at top
    commands.push(0x0A);
    
    // Set alignment to center and print header
    commands.push(ESC, 0x61, 0x01);
    
    // Make header bold and double height
    commands.push(ESC, 0x45, 0x01); // Bold on
    commands.push(GS, 0x21, 0x11);  // Double height and width
    
    const header = settings?.receiptHeader || 'RECEIPT';
    commands.push(...Array.from(new TextEncoder().encode(header)));
    commands.push(0x0A);
    
    // Reset font size and bold
    commands.push(GS, 0x21, 0x00);  // Normal size
    commands.push(ESC, 0x45, 0x00); // Bold off
    commands.push(0x0A);
    
    // Set alignment to left for details
    commands.push(ESC, 0x61, 0x00);
    
    // Print invoice details with better spacing
    const invoiceInfo = [
      `Invoice: ${receiptData.invoiceNumber}`,
      `Date: ${receiptData.date.toLocaleDateString()}`,
      `Time: ${receiptData.date.toLocaleTimeString()}`,
      receiptData.customerName ? `Customer: ${receiptData.customerName}` : 'Customer: Walk-in Customer',
      ''
    ];
    
    invoiceInfo.forEach(line => {
      commands.push(...Array.from(new TextEncoder().encode(line)));
      commands.push(0x0A);
    });
    
    // Print separator line
    const separator = '================================';
    commands.push(...Array.from(new TextEncoder().encode(separator)));
    commands.push(0x0A);
    
    // Print items with better formatting
    receiptData.items.forEach(item => {
      // Item name
      commands.push(...Array.from(new TextEncoder().encode(item.name)));
      commands.push(0x0A);
      
      // Quantity and price line with proper alignment
      const qtyPrice = `${item.quantity} x $${item.unitPrice.toFixed(2)}`;
      const total = `$${item.totalPrice.toFixed(2)}`;
      const spacesNeeded = 32 - qtyPrice.length - total.length;
      const qtyPriceLine = qtyPrice + ' '.repeat(Math.max(1, spacesNeeded)) + total;
      
      commands.push(...Array.from(new TextEncoder().encode(qtyPriceLine)));
      commands.push(0x0A);
      commands.push(0x0A); // Extra line between items
    });
    
    // Print separator
    commands.push(...Array.from(new TextEncoder().encode(separator)));
    commands.push(0x0A);
    
    // Print totals with right alignment
    const formatTotalLine = (label: string, amount: string) => {
      const spacesNeeded = 32 - label.length - amount.length;
      return label + ' '.repeat(Math.max(1, spacesNeeded)) + amount;
    };
    
    const totalsInfo = [
      formatTotalLine('Subtotal:', `$${receiptData.subtotal.toFixed(2)}`),
      ...(receiptData.discountAmount ? [formatTotalLine('Discount:', `-$${receiptData.discountAmount.toFixed(2)}`)] : []),
      ...(receiptData.taxAmount ? [formatTotalLine('Tax:', `$${receiptData.taxAmount.toFixed(2)}`)] : []),
    ];
    
    totalsInfo.forEach(line => {
      commands.push(...Array.from(new TextEncoder().encode(line)));
      commands.push(0x0A);
    });
    
    // Print total separator
    const totalSeparator = '--------------------------------';
    commands.push(...Array.from(new TextEncoder().encode(totalSeparator)));
    commands.push(0x0A);
    
    // Print TOTAL in bold and larger font
    commands.push(ESC, 0x45, 0x01); // Bold on
    commands.push(GS, 0x21, 0x01);  // Double height
    
    const totalLine = formatTotalLine('TOTAL:', `$${receiptData.total.toFixed(2)}`);
    commands.push(...Array.from(new TextEncoder().encode(totalLine)));
    commands.push(0x0A);
    
    // Reset font
    commands.push(GS, 0x21, 0x00);  // Normal size
    commands.push(ESC, 0x45, 0x00); // Bold off
    commands.push(0x0A);
    
    // Print payment details
    const paymentInfo = [
      formatTotalLine(`Payment (${receiptData.paymentMethod}):`, `$${receiptData.paidAmount.toFixed(2)}`),
      ...(receiptData.changeAmount ? [formatTotalLine('Change:', `$${receiptData.changeAmount.toFixed(2)}`)] : [])
    ];
    
    paymentInfo.forEach(line => {
      commands.push(...Array.from(new TextEncoder().encode(line)));
      commands.push(0x0A);
    });
    
    // Add spacing before footer
    commands.push(0x0A, 0x0A);
    
    // Print footer centered
    commands.push(ESC, 0x61, 0x01); // Center align
    const footer = settings?.receiptFooter || 'Thank you for your business!';
    commands.push(...Array.from(new TextEncoder().encode(footer)));
    commands.push(0x0A);
    
    // Add timestamp at bottom
    commands.push(0x0A);
    const timestamp = `Printed: ${new Date().toLocaleString()}`;
    commands.push(...Array.from(new TextEncoder().encode(timestamp)));
    commands.push(0x0A, 0x0A, 0x0A);
    
    // Cut paper (if supported)
    commands.push(GS, 0x56, 0x00);
    
    // Cash drawer (if enabled)
    if (settings?.printerCashDrawer) {
      commands.push(ESC, 0x70, 0x00, 0x19, 0x19);
    }
    
    // Buzzer (if enabled)
    if (settings?.printerBuzzer) {
      commands.push(ESC, 0x42, 0x05, 0x05);
    }
    
    return new Uint8Array(commands);
  }
}
