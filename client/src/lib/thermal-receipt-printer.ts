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

  // Print receipt with fallback options
  static async printReceipt(receiptData: ReceiptData): Promise<void> {
    const settings = JSON.parse(localStorage.getItem('stocksage_settings') || '{}');
    const currentSettings = settings;
    
    // First try thermal printer if configured
    if (currentSettings?.printerConnected && currentSettings?.printerVendorId && 'usb' in navigator) {
      try {
        await this.printToThermalPrinter(receiptData, currentSettings);
        return;
      } catch (error) {
        console.warn('Thermal printer failed:', error);
        throw new Error('Imprimante thermique non connectée');
      }
    }
    
    // If no thermal printer configured, show message instead of opening print dialog
    throw new Error('Imprimante thermique non configurée');
  }

  // Print to thermal printer
  private static async printToThermalPrinter(receiptData: ReceiptData, currentSettings: any): Promise<void> {

    try {
      console.log('Printing receipt to USB thermal printer...');
      
      // Get the actual USB device
      const devices = await (navigator as any).usb.getDevices();
      let device = devices.find((d: any) => 
        d.vendorId === currentSettings.printerVendorId && 
        d.productId === currentSettings.printerProductId
      );
      
      if (!device) {
        throw new Error('USB device not found. Please reconnect the printer in Settings.');
      }

      // Open device connection - may require re-authorization
      if (!device.opened) {
        try {
          await device.open();
        } catch (openError: any) {
          // If access denied, user needs to re-authorize the device
          if (openError.name === 'SecurityError' || openError.message.includes('Access denied')) {
            throw new Error('USB access denied. Please click "Configure Printer" in Settings to re-authorize the device.');
          }
          throw openError;
        }
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

  // Fallback browser print method
  private static async printToBrowser(receiptData: ReceiptData, currentSettings: any): Promise<void> {
    return new Promise((resolve) => {
      // Create a new window for printing
      const printWindow = window.open('', '_blank', 'width=300,height=600');
      
      if (!printWindow) {
        throw new Error('Could not open print window. Please allow popups.');
      }

      // Generate HTML receipt
      const receiptHtml = this.generateReceiptHtml(receiptData, currentSettings);
      
      printWindow.document.write(receiptHtml);
      printWindow.document.close();
      
      // Wait for content to load then print
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
          resolve();
        }, 100);
      };
    });
  }

  // Generate HTML receipt for browser printing
  private static generateReceiptHtml(receiptData: ReceiptData, settings: any): string {
    const header = settings?.receiptHeader || 'REÇU DE VENTE';
    const footer = settings?.receiptFooter || 'Merci pour votre visite!';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Reçu</title>
        <style>
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.2;
            margin: 0;
            padding: 10px;
            width: 280px;
          }
          .header {
            text-align: center;
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 10px;
          }
          .info {
            margin-bottom: 10px;
          }
          .separator {
            border-top: 1px dashed #000;
            margin: 10px 0;
          }
          .item {
            margin-bottom: 8px;
          }
          .item-name {
            font-weight: bold;
          }
          .item-details {
            display: flex;
            justify-content: space-between;
          }
          .totals {
            margin-top: 10px;
          }
          .total-line {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
          }
          .total-final {
            font-weight: bold;
            font-size: 14px;
            border-top: 1px solid #000;
            padding-top: 5px;
            margin-top: 5px;
          }
          .footer {
            text-align: center;
            margin-top: 15px;
            font-style: italic;
          }
          .timestamp {
            text-align: center;
            font-size: 10px;
            margin-top: 10px;
          }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">${header}</div>
        
        <div class="info">
          <div>Facture: ${receiptData.invoiceNumber}</div>
          <div>Date: ${receiptData.date.toLocaleDateString()}</div>
          <div>Heure: ${receiptData.date.toLocaleTimeString()}</div>
          <div>Client: ${receiptData.customerName || 'Client de passage'}</div>
        </div>
        
        <div class="separator"></div>
        
        <div class="items">
          ${receiptData.items.map(item => `
            <div class="item">
              <div class="item-name">${item.name}</div>
              <div class="item-details">
                <span>${item.quantity} x ${item.unitPrice.toFixed(2)} DH</span>
                <span>${item.totalPrice.toFixed(2)} DH</span>
              </div>
            </div>
          `).join('')}
        </div>
        
        <div class="separator"></div>
        
        <div class="totals">
          <div class="total-line">
            <span>Sous-total:</span>
            <span>${receiptData.subtotal.toFixed(2)} DH</span>
          </div>
          ${receiptData.discountAmount ? `
            <div class="total-line">
              <span>Remise:</span>
              <span>-${receiptData.discountAmount.toFixed(2)} DH</span>
            </div>
          ` : ''}
          ${receiptData.taxAmount ? `
            <div class="total-line">
              <span>TVA:</span>
              <span>${receiptData.taxAmount.toFixed(2)} DH</span>
            </div>
          ` : ''}
          <div class="total-line total-final">
            <span>TOTAL:</span>
            <span>${receiptData.total.toFixed(2)} DH</span>
          </div>
          <div class="total-line">
            <span>Paiement (${receiptData.paymentMethod}):</span>
            <span>${(receiptData.paymentMethod === 'credit' ? receiptData.total : receiptData.paidAmount).toFixed(2)} DH</span>
          </div>
          ${receiptData.changeAmount ? `
            <div class="total-line">
              <span>Monnaie:</span>
              <span>${receiptData.changeAmount.toFixed(2)} DH</span>
            </div>
          ` : ''}
        </div>
        
        <div class="footer">${footer}</div>
        <div class="timestamp">Imprimé: ${new Date().toLocaleString()}</div>
      </body>
      </html>
    `;
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
    
    // Print logo/brand name in large bold text
    commands.push(ESC, 0x45, 0x01); // Bold on
    commands.push(GS, 0x21, 0x11);  // Double height and width
    
    const brandName = settings?.businessName || 'igoodar';
    commands.push(...Array.from(new TextEncoder().encode(brandName.toUpperCase())));
    commands.push(0x0A);
    
    // Reset font size
    commands.push(GS, 0x21, 0x00);  // Normal size
    
    // Print business tagline/subtitle
    const tagline = settings?.receiptHeader || 'Gestion de Stock';
    commands.push(...Array.from(new TextEncoder().encode(tagline)));
    commands.push(0x0A);
    
    // Print contact info if available
    if (settings?.phone || settings?.address) {
      commands.push(0x0A);
      if (settings?.phone) {
        commands.push(...Array.from(new TextEncoder().encode(`Tel: ${settings.phone}`)));
        commands.push(0x0A);
      }
      if (settings?.address) {
        commands.push(...Array.from(new TextEncoder().encode(settings.address)));
        commands.push(0x0A);
      }
    }
    
    commands.push(ESC, 0x45, 0x00); // Bold off
    commands.push(0x0A);
    
    // Set alignment to left for details
    commands.push(ESC, 0x61, 0x00);
    
    // Print invoice details with better spacing
    const dateStr = receiptData.date.toLocaleDateString('fr-MA', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
    const timeStr = receiptData.date.toLocaleTimeString('fr-MA', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const invoiceInfo = [
      `N° Facture: ${receiptData.invoiceNumber}`,
      `Date: ${dateStr} ${timeStr}`,
      receiptData.customerName ? `Client: ${receiptData.customerName}` : 'Client: Passage',
      ''
    ];
    
    invoiceInfo.forEach(line => {
      commands.push(...Array.from(new TextEncoder().encode(line)));
      commands.push(0x0A);
    });
    
    // Print decorative separator line
    const separator = '================================';
    commands.push(...Array.from(new TextEncoder().encode(separator)));
    commands.push(0x0A);
    
    // Print items header
    commands.push(ESC, 0x45, 0x01); // Bold on
    const itemsHeader = 'ARTICLES';
    commands.push(...Array.from(new TextEncoder().encode(itemsHeader)));
    commands.push(0x0A);
    commands.push(ESC, 0x45, 0x00); // Bold off
    commands.push(...Array.from(new TextEncoder().encode(separator)));
    commands.push(0x0A);
    
    // Print items with better formatting
    receiptData.items.forEach((item, index) => {
      // Item number and name (bold)
      commands.push(ESC, 0x45, 0x01); // Bold on
      const itemLine = `${index + 1}. ${item.name}`;
      commands.push(...Array.from(new TextEncoder().encode(itemLine)));
      commands.push(0x0A);
      commands.push(ESC, 0x45, 0x00); // Bold off
      
      // Quantity and price line with proper alignment
      const qtyPrice = `   ${item.quantity} x ${item.unitPrice.toFixed(2)} DH`;
      const total = `${item.totalPrice.toFixed(2)} DH`;
      const spacesNeeded = 32 - qtyPrice.length - total.length;
      const qtyPriceLine = qtyPrice + ' '.repeat(Math.max(1, spacesNeeded)) + total;
      
      commands.push(...Array.from(new TextEncoder().encode(qtyPriceLine)));
      commands.push(0x0A);
      
      // Thin separator between items
      if (index < receiptData.items.length - 1) {
        const thinSeparator = '- - - - - - - - - - - - - - - -';
        commands.push(...Array.from(new TextEncoder().encode(thinSeparator)));
        commands.push(0x0A);
      }
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
      formatTotalLine('Sous-total:', `${receiptData.subtotal.toFixed(2)} DH`),
      ...(receiptData.discountAmount ? [formatTotalLine('Remise:', `-${receiptData.discountAmount.toFixed(2)} DH`)] : []),
      ...(receiptData.taxAmount ? [formatTotalLine('TVA:', `${receiptData.taxAmount.toFixed(2)} DH`)] : []),
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
    
    const totalLine = formatTotalLine('TOTAL:', `${receiptData.total.toFixed(2)} DH`);
    commands.push(...Array.from(new TextEncoder().encode(totalLine)));
    commands.push(0x0A);
    
    // Reset font
    commands.push(GS, 0x21, 0x00);  // Normal size
    commands.push(ESC, 0x45, 0x00); // Bold off
    commands.push(0x0A);
    
    // Print payment details
    const paymentAmount = receiptData.paymentMethod === 'credit' ? receiptData.total : receiptData.paidAmount;
    
    // Translate payment method
    const paymentMethodLabels: Record<string, string> = {
      'cash': 'Espèces',
      'credit': 'Crédit',
      'card': 'Carte',
      'check': 'Chèque'
    };
    const paymentLabel = paymentMethodLabels[receiptData.paymentMethod] || receiptData.paymentMethod;
    
    const paymentInfo = [
      formatTotalLine(`Paiement (${paymentLabel}):`, `${paymentAmount.toFixed(2)} DH`),
      ...(receiptData.changeAmount ? [formatTotalLine('Monnaie rendue:', `${receiptData.changeAmount.toFixed(2)} DH`)] : [])
    ];
    
    paymentInfo.forEach(line => {
      commands.push(...Array.from(new TextEncoder().encode(line)));
      commands.push(0x0A);
    });
    
    // Add spacing before footer
    commands.push(0x0A, 0x0A);
    
    // Print decorative line
    commands.push(ESC, 0x61, 0x01); // Center align
    const decorativeLine = '* * * * * * * * * * * * * * * *';
    commands.push(...Array.from(new TextEncoder().encode(decorativeLine)));
    commands.push(0x0A, 0x0A);
    
    // Print footer message
    commands.push(ESC, 0x45, 0x01); // Bold on
    const footer = settings?.receiptFooter || 'Merci pour votre visite!';
    commands.push(...Array.from(new TextEncoder().encode(footer)));
    commands.push(0x0A);
    commands.push(ESC, 0x45, 0x00); // Bold off
    
    // Print closing message
    const closingMsg = 'A bientôt!';
    commands.push(...Array.from(new TextEncoder().encode(closingMsg)));
    commands.push(0x0A, 0x0A);
    
    // Add timestamp at bottom
    const timestampLabel = `Imprimé le: ${new Date().toLocaleString('fr-MA')}`;
    commands.push(...Array.from(new TextEncoder().encode(timestampLabel)));
    commands.push(0x0A, 0x0A);
    
    // Print QR Code with invoice number for scanning
    commands.push(ESC, 0x61, 0x01); // Center align
    
    // QR Code label
    const qrLabel = 'Scannez pour recharger:';
    commands.push(...Array.from(new TextEncoder().encode(qrLabel)));
    commands.push(0x0A);
    
    // Generate QR Code (ESC/POS QR Code command)
    // Format: INVOICE:invoice_number
    const qrData = `INVOICE:${receiptData.invoiceNumber}`;
    
    // QR Code model (GS ( k pL pH cn fn n1 n2)
    commands.push(GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00); // Set QR model to 2
    commands.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x05); // Set QR size to 5
    commands.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x30); // Set error correction to L
    
    // Store QR data
    const qrDataLength = qrData.length + 3;
    const pL = qrDataLength & 0xFF;
    const pH = (qrDataLength >> 8) & 0xFF;
    commands.push(GS, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30);
    commands.push(...Array.from(new TextEncoder().encode(qrData)));
    
    // Print QR code
    commands.push(GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30);
    
    commands.push(0x0A, 0x0A);
    
    // Print barcode as backup (Code128)
    // Barcode height
    commands.push(GS, 0x68, 0x50); // Height = 80 dots
    
    // HRI position (print text below barcode)
    commands.push(GS, 0x48, 0x02); // Below barcode
    
    // Barcode width
    commands.push(GS, 0x77, 0x02); // Width = 2
    
    // Print Code128 barcode
    const barcodeData = receiptData.invoiceNumber;
    commands.push(GS, 0x6B, 0x49, barcodeData.length);
    commands.push(...Array.from(new TextEncoder().encode(barcodeData)));
    
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
