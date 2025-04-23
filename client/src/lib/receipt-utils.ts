import { SaleWithItems } from '@shared/schema';
import { format } from 'date-fns';

/**
 * Constants for ESC/POS thermal printer commands
 */
export const ESC_POS = {
  // Printer hardware
  HW_INIT: '\x1b\x40', // Clear data in buffer and reset modes
  HW_SELECT: '\x1b\x3d\x01', // Select printer mode
  HW_RESET: '\x1b\x3f\x0a\x00', // Reset printer hardware
  
  // Cash drawer
  CD_KICK_2: '\x1b\x70\x00', // Send pulse to pin 2
  CD_KICK_5: '\x1b\x70\x01', // Send pulse to pin 5
  
  // Paper
  PAPER_FULL_CUT: '\x1d\x56\x00', // Full cut paper
  PAPER_PART_CUT: '\x1d\x56\x01', // Partial cut paper
  
  // Text format
  TXT_NORMAL: '\x1b\x21\x00', // Normal text
  TXT_2HEIGHT: '\x1b\x21\x10', // Double height text
  TXT_2WIDTH: '\x1b\x21\x20', // Double width text
  TXT_UNDERL_OFF: '\x1b\x2d\x00', // Underline off
  TXT_UNDERL_ON: '\x1b\x2d\x01', // Underline on
  TXT_BOLD_OFF: '\x1b\x45\x00', // Bold off
  TXT_BOLD_ON: '\x1b\x45\x01', // Bold on
  TXT_FONT_A: '\x1b\x4d\x00', // Font type A
  TXT_FONT_B: '\x1b\x4d\x01', // Font type B
  TXT_ALIGN_LT: '\x1b\x61\x00', // Left justification
  TXT_ALIGN_CT: '\x1b\x61\x01', // Centering
  TXT_ALIGN_RT: '\x1b\x61\x02', // Right justification
  
  // Barcodes
  BARCODE_TXT_OFF: '\x1d\x48\x00', // HRI barcode chars OFF
  BARCODE_TXT_ABV: '\x1d\x48\x01', // HRI barcode chars above
  BARCODE_TXT_BLW: '\x1d\x48\x02', // HRI barcode chars below
  BARCODE_TXT_BTH: '\x1d\x48\x03', // HRI barcode chars both above and below
  BARCODE_FONT_A: '\x1d\x66\x00', // Font type A for HRI barcode chars
  BARCODE_FONT_B: '\x1d\x66\x01', // Font type B for HRI barcode chars
  BARCODE_HEIGHT: '\x1d\x68\x64', // Barcode Height [1-255]
  BARCODE_WIDTH: '\x1d\x77\x03', // Barcode Width [2-6]
  BARCODE_UPC_A: '\x1d\x6b\x00', // Barcode type UPC-A
  BARCODE_UPC_E: '\x1d\x6b\x01', // Barcode type UPC-E
  BARCODE_EAN13: '\x1d\x6b\x02', // Barcode type EAN13
  BARCODE_EAN8: '\x1d\x6b\x03', // Barcode type EAN8
  BARCODE_CODE39: '\x1d\x6b\x04', // Barcode type CODE39
  BARCODE_ITF: '\x1d\x6b\x05', // Barcode type ITF
  BARCODE_NW7: '\x1d\x6b\x06', // Barcode type NW7
  
  // QR Code
  QRCODE_MODEL1: '\x1d\x28\x6b\x04\x00\x31\x41\x31\x00', // Model 1
  QRCODE_MODEL2: '\x1d\x28\x6b\x04\x00\x31\x41\x32\x00', // Model 2
  QRCODE_MODEL3: '\x1d\x28\x6b\x04\x00\x31\x41\x33\x00', // Model 3
};

/**
 * Generate a text-based thermal receipt that can be downloaded or printed
 * This version includes ESC/POS commands for thermal printers
 */
export function generateThermalReceipt(sale: SaleWithItems, businessName: string = 'iGoodar Stock', settings: any = {}) {
  const commands = [];
  
  // Initialize printer
  commands.push(ESC_POS.HW_INIT);
  commands.push(ESC_POS.TXT_ALIGN_CT);
  commands.push(ESC_POS.TXT_BOLD_ON);
  commands.push(businessName);
  commands.push('\n');
  commands.push(ESC_POS.TXT_BOLD_OFF);
  
  // Header
  if (settings.receiptHeader) {
    commands.push(settings.receiptHeader + '\n');
  }
  
  commands.push(ESC_POS.TXT_ALIGN_LT);
  commands.push('--------------------------------\n');
  
  // Sale info
  commands.push(`N° Facture: ${sale.invoiceNumber || ''}\n`);
  const date = sale.date ? new Date(sale.date) : new Date();
  commands.push(`Date: ${format(date, 'dd/MM/yyyy HH:mm')}\n`);
  commands.push(`Client: ${sale.customer?.name || 'Client occasionnel'}\n`);
  if (sale.customer?.phone) {
    commands.push(`Tél.: ${sale.customer.phone}\n`);
  }
  
  commands.push('--------------------------------\n');
  commands.push('Article         Qté     Prix\n');
  commands.push('--------------------------------\n');
  
  // Items
  if (Array.isArray(sale.items)) {
    sale.items.forEach(item => {
      const productName = item.product?.name || `Produit #${item.productId}`;
      const truncatedName = productName.length > 14 ? productName.substring(0, 11) + '...' : productName;
      const quantity = item.quantity.toString();
      const price = (item.unitPrice * item.quantity).toFixed(2);
      const currency = settings.currency || 'MAD';
      
      commands.push(`${truncatedName.padEnd(14)}${quantity.padStart(3)}    ${price.padStart(6)} ${currency}\n`);
      
      // If there's a discount, show it
      if (item.discount && item.discount > 0) {
        commands.push(`  Remise: ${item.discount.toFixed(2)} ${currency}\n`);
      }
    });
  }
  
  commands.push('--------------------------------\n');
  
  // Totals
  const currency = settings.currency || 'MAD';
  commands.push(`Sous-total: ${(sale.totalAmount + (sale.discountAmount || 0)).toFixed(2)} ${currency}\n`);
  if (sale.discountAmount && sale.discountAmount > 0) {
    commands.push(`Remise: - ${sale.discountAmount.toFixed(2)} ${currency}\n`);
  }
  if (sale.taxAmount && sale.taxAmount > 0) {
    commands.push(`Taxe: ${sale.taxAmount.toFixed(2)} ${currency}\n`);
  }
  commands.push(ESC_POS.TXT_BOLD_ON);
  commands.push(`Total: ${sale.totalAmount.toFixed(2)} ${currency}\n`);
  commands.push(ESC_POS.TXT_BOLD_OFF);
  commands.push('--------------------------------\n');
  
  // Payment info
  commands.push(`Méthode: ${sale.paymentMethod || 'Espèces'}\n`);
  if (sale.paymentMethod !== 'credit') {
    commands.push(`Montant payé: ${(sale.paidAmount || sale.totalAmount).toFixed(2)} ${currency}\n`);
    if (sale.changeAmount && sale.changeAmount > 0) {
      commands.push(`Monnaie rendue: ${sale.changeAmount.toFixed(2)} ${currency}\n`);
    }
  }
  
  commands.push('--------------------------------\n');
  
  // Footer
  commands.push(ESC_POS.TXT_ALIGN_CT);
  if (settings.receiptFooter) {
    commands.push(settings.receiptFooter + '\n');
  } else {
    commands.push('Merci pour votre achat\n');
    commands.push('شكرا لشرائكم\n');
  }
  
  // Add space for cutting
  commands.push('\n\n\n\n');
  commands.push(ESC_POS.PAPER_PART_CUT);
  
  return commands.join('');
}

/**
 * Generate a text-based receipt that can be downloaded or printed
 */
export function generateTextReceipt(sale: SaleWithItems, businessName: string = 'iGoodar Stock', settings: any = {}) {
  // Get settings with defaults
  const currency = settings.currency || 'MAD';
  const receiptHeader = settings.receiptHeader || '';
  const receiptFooter = settings.receiptFooter || 'Merci pour votre achat / شكرا لشرائكم';
  const width = 42; // Standard width for thermal receipts (characters)
  
  // Format date
  const date = sale.date ? new Date(sale.date) : new Date();
  const dateStr = format(date, 'dd/MM/yyyy HH:mm');
  
  // Utility function to center text
  const center = (text: string): string => {
    const spaces = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(spaces) + text;
  };
  
  // Utility function to create a divider line
  const divider = (): string => '-'.repeat(width);
  
  // Utility function to format currency
  const formatPrice = (amount: number): string => {
    return `${amount.toFixed(2)} ${currency}`;
  };
  
  // Utility function to create a justified line (label left, value right)
  const justified = (label: string, value: string): string => {
    const spaces = Math.max(0, width - label.length - value.length);
    return label + ' '.repeat(spaces) + value;
  };
  
  // Build receipt
  let receiptContent = [];
  
  // Header
  receiptContent.push(center(businessName));
  if (receiptHeader) {
    receiptHeader.split('\n').forEach(line => {
      receiptContent.push(center(line));
    });
  }
  receiptContent.push(divider());
  
  // Sale info
  receiptContent.push(justified('N° Facture:', sale.invoiceNumber || ''));
  receiptContent.push(justified('Date:', dateStr));
  receiptContent.push(justified('Client:', sale.customer?.name || 'Client occasionnel'));
  if (sale.customer?.phone) {
    receiptContent.push(justified('Tél.:', sale.customer.phone));
  }
  receiptContent.push(divider());
  
  // Items
  receiptContent.push(' Article                  Qté     Prix');
  receiptContent.push(divider());
  
  if (Array.isArray(sale.items)) {
    sale.items.forEach(item => {
      const productName = item.product?.name || `Produit #${item.productId}`;
      // Truncate the name if too long
      const truncatedName = productName.length > 24 ? productName.substring(0, 21) + '...' : productName;
      const quantity = item.quantity.toString();
      const price = formatPrice(item.unitPrice);
      
      // Format: Product name (truncated)   Qty   Price
      const spacesAfterName = Math.max(0, 24 - truncatedName.length);
      const spacesBeforeQty = Math.max(0, 5 - quantity.length);
      
      receiptContent.push(
        truncatedName + 
        ' '.repeat(spacesAfterName) + 
        ' '.repeat(spacesBeforeQty) + 
        quantity + '     ' + 
        price
      );
      
      // If there's a discount, show it
      if (item.discount && item.discount > 0) {
        receiptContent.push(
          `   Remise: ${item.discount.toFixed(2)} ${currency}`
        );
      }
    });
  }
  
  receiptContent.push(divider());
  
  // Totals
  receiptContent.push(justified('Sous-total:', formatPrice(sale.totalAmount + (sale.discountAmount || 0))));
  if (sale.discountAmount && sale.discountAmount > 0) {
    receiptContent.push(justified('Remise:', '- ' + formatPrice(sale.discountAmount)));
  }
  if (sale.taxAmount && sale.taxAmount > 0) {
    receiptContent.push(justified('Taxe:', formatPrice(sale.taxAmount)));
  }
  receiptContent.push(justified('Total:', formatPrice(sale.totalAmount)));
  receiptContent.push(divider());
  
  // Payment info
  receiptContent.push(justified('Méthode de paiement:', sale.paymentMethod || 'Espèces'));
  if (sale.paymentMethod !== 'credit') {
    receiptContent.push(justified('Montant payé:', formatPrice(sale.paidAmount || sale.totalAmount)));
    if (sale.changeAmount && sale.changeAmount > 0) {
      receiptContent.push(justified('Monnaie rendue:', formatPrice(sale.changeAmount)));
    }
  }
  
  receiptContent.push(divider());
  
  // Footer
  if (receiptFooter) {
    receiptFooter.split('\n').forEach(line => {
      receiptContent.push(center(line));
    });
  }
  
  // Add some blank lines at the end for the cutter
  receiptContent.push('');
  receiptContent.push('');
  receiptContent.push('');
  
  return receiptContent.join('\n');
}

/**
 * Generate HTML for a receipt that can be printed or rendered on screen
 */
export function generateHtmlReceipt(sale: SaleWithItems, businessName: string = 'iGoodar Stock', settings: any = {}) {
  // Get settings with defaults
  const currency = settings.currency || 'MAD';
  const receiptHeader = settings.receiptHeader || '';
  const receiptFooter = settings.receiptFooter || 'Merci pour votre achat / شكرا لشرائكم';
  
  // Format date
  const date = sale.date ? new Date(sale.date) : new Date();
  const dateStr = format(date, 'dd/MM/yyyy HH:mm');
  
  // Start building the HTML
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Reçu - ${sale.invoiceNumber}</title>
      <style>
        @media print {
          body { 
            width: 80mm;
            margin: 0;
            padding: 0;
          }
        }
        body {
          font-family: 'Courier New', monospace;
          margin: 0;
          padding: 0;
          width: 80mm;
          margin-left: auto;
          margin-right: auto;
        }
        .receipt {
          padding: 10px;
        }
        .text-center {
          text-align: center;
        }
        .divider {
          border-top: 1px dashed #000;
          margin: 5px 0;
        }
        .row {
          display: flex;
          justify-content: space-between;
        }
        .footer {
          text-align: center;
          margin-top: 10px;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
        }
        .items-table th, .items-table td {
          text-align: left;
          padding: 3px 0;
        }
        .items-table .price {
          text-align: right;
        }
        .items-table .qty {
          text-align: center;
        }
        .totals {
          margin-top: 5px;
        }
        .totals .row {
          margin-bottom: 3px;
        }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="text-center">
          <strong>${businessName}</strong>
        </div>
  `;
  
  // Header
  if (receiptHeader) {
    html += `<div class="text-center">${receiptHeader.replace(/\n/g, '<br>')}</div>`;
  }
  
  html += `<div class="divider"></div>`;
  
  // Sale info
  html += `
    <div class="row">
      <span>N° Facture:</span>
      <span>${sale.invoiceNumber || ''}</span>
    </div>
    <div class="row">
      <span>Date:</span>
      <span>${dateStr}</span>
    </div>
    <div class="row">
      <span>Client:</span>
      <span>${sale.customer?.name || 'Client occasionnel'}</span>
    </div>
  `;
  
  if (sale.customer?.phone) {
    html += `
      <div class="row">
        <span>Tél.:</span>
        <span>${sale.customer.phone}</span>
      </div>
    `;
  }
  
  html += `<div class="divider"></div>`;
  
  // Items
  html += `
    <table class="items-table">
      <thead>
        <tr>
          <th>Article</th>
          <th class="qty">Qté</th>
          <th class="price">Prix</th>
        </tr>
      </thead>
      <tbody>
  `;
  
  if (Array.isArray(sale.items)) {
    sale.items.forEach(item => {
      const productName = item.product?.name || `Produit #${item.productId}`;
      html += `
        <tr>
          <td>${productName}</td>
          <td class="qty">${item.quantity}</td>
          <td class="price">${item.unitPrice.toFixed(2)} ${currency}</td>
        </tr>
      `;
      
      // If there's a discount, show it
      if (item.discount && item.discount > 0) {
        html += `
          <tr>
            <td colspan="2" style="padding-left: 10px;">Remise:</td>
            <td class="price">${item.discount.toFixed(2)} ${currency}</td>
          </tr>
        `;
      }
    });
  }
  
  html += `
      </tbody>
    </table>
    <div class="divider"></div>
  `;
  
  // Totals
  html += `
    <div class="totals">
      <div class="row">
        <span>Sous-total:</span>
        <span>${(sale.totalAmount + (sale.discountAmount || 0)).toFixed(2)} ${currency}</span>
      </div>
  `;
  
  if (sale.discountAmount && sale.discountAmount > 0) {
    html += `
      <div class="row">
        <span>Remise:</span>
        <span>- ${sale.discountAmount.toFixed(2)} ${currency}</span>
      </div>
    `;
  }
  
  if (sale.taxAmount && sale.taxAmount > 0) {
    html += `
      <div class="row">
        <span>Taxe:</span>
        <span>${sale.taxAmount.toFixed(2)} ${currency}</span>
      </div>
    `;
  }
  
  html += `
      <div class="row">
        <strong>Total:</strong>
        <strong>${sale.totalAmount.toFixed(2)} ${currency}</strong>
      </div>
    </div>
    <div class="divider"></div>
  `;
  
  // Payment info
  const paymentMethodMap: {[key: string]: string} = {
    'cash': 'Espèces',
    'credit': 'Crédit',
    'bank_transfer': 'Virement bancaire',
    'mobile_payment': 'Paiement mobile'
  };
  
  html += `
    <div class="row">
      <span>Méthode de paiement:</span>
      <span>${paymentMethodMap[sale.paymentMethod || 'cash'] || sale.paymentMethod || 'Espèces'}</span>
    </div>
  `;
  
  if (sale.paymentMethod !== 'credit') {
    html += `
      <div class="row">
        <span>Montant payé:</span>
        <span>${(sale.paidAmount || sale.totalAmount).toFixed(2)} ${currency}</span>
      </div>
    `;
    
    if (sale.changeAmount && sale.changeAmount > 0) {
      html += `
        <div class="row">
          <span>Monnaie rendue:</span>
          <span>${sale.changeAmount.toFixed(2)} ${currency}</span>
        </div>
      `;
    }
  }
  
  html += `<div class="divider"></div>`;
  
  // Footer
  html += `
    <div class="footer">
      ${receiptFooter.replace(/\n/g, '<br>')}
    </div>
  `;
  
  // Close the HTML
  html += `
      </div>
    </body>
    </html>
  `;
  
  return html;
}

/**
 * Create a text file download
 */
export function downloadTextFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Create an HTML file download
 */
export function downloadHtmlFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Print the HTML receipt directly to the printer
 */
export function printHtmlReceipt(content: string) {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(content);
    iframeDoc.close();
    
    setTimeout(() => {
      iframe.contentWindow?.print();
      document.body.removeChild(iframe);
    }, 500);
  }
}

/**
 * Download thermal receipt (raw ESC/POS commands)
 */
export function downloadThermalReceipt(sale: SaleWithItems, businessName: string = 'iGoodar Stock', settings: any = {}) {
  const content = generateThermalReceipt(sale, businessName, settings);
  const date = sale.date ? new Date(sale.date) : new Date();
  const dateStr = format(date, 'yyyyMMdd_HHmmss');
  const filename = `thermal_receipt_${sale.invoiceNumber || dateStr}.bin`;
  
  const blob = new Blob([content], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Send receipt to thermal printer
 * Note: For a real implementation, you would need a backend service or
 * native app integration to communicate directly with a printer
 */
export function printThermalReceipt(sale: SaleWithItems, businessName: string = 'iGoodar Stock', settings: any = {}, printerAddress?: string) {
  // This is a placeholder function. In a real implementation, you would:
  // 1. Generate thermal receipt commands
  const receiptData = generateThermalReceipt(sale, businessName, settings);
  
  // 2. Send to printer via WebUSB, WebBluetooth, or a backend service
  if (printerAddress) {
    // In a real app, this would send data to the printer
    console.log(`Sending receipt to printer at ${printerAddress}`);
    console.log('Receipt data:', receiptData);
    return true;
  } else {
    // If no printer is available, download the file instead
    downloadThermalReceipt(sale, businessName, settings);
    return false;
  }
}