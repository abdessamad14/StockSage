import { useMemo, useState } from "react";
import { format } from "date-fns";
import { useOfflineSales } from "@/hooks/use-offline-sales";
import { useOfflineProducts } from "@/hooks/use-offline-products";
import { useOfflineCustomers } from "@/hooks/use-offline-customers";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { OfflineSale } from "@/lib/offline-storage";
import { ThermalReceiptPrinter, ReceiptData } from "@/lib/thermal-receipt-printer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Search, 
  Calendar,
  DollarSign,
  Receipt,
  Eye,
  Filter,
  Download,
  TrendingUp
} from "lucide-react";

export default function OfflineSalesHistory() {
  const { sales, loading } = useOfflineSales();
  const { products } = useOfflineProducts();
  const { customers } = useOfflineCustomers();
  const { t } = useI18n();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [selectedSale, setSelectedSale] = useState<OfflineSale | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const formatCurrency = (value?: number) => `${(value ?? 0).toFixed(2)} ${t('currency')}`;
  const formatNumber = (value: number) => value.toLocaleString();

  const saleStatusLabels = useMemo(() => ({
    completed: t('sale_status_completed'),
    pending: t('sale_status_pending'),
    cancelled: t('sale_status_cancelled'),
  }), [t]);

  const paymentMethodLabels = useMemo(() => ({
    cash: t('cash'),
    credit: t('credit'),
    card: t('card_payment'),
    mobile: t('mobile_payment'),
  }), [t]);

  const filteredSales = sales.filter(sale => {
    const matchesSearch = !searchQuery || 
      sale.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (customers.find(c => c.id === sale.customerId)?.name?.toLowerCase() ?? '').includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || sale.status === statusFilter;
    const matchesPayment = paymentMethodFilter === "all" || sale.paymentMethod === paymentMethodFilter;
    
    return matchesSearch && matchesStatus && matchesPayment;
  });

  const totalSales = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalTransactions = filteredSales.length;
  const averageTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0;

  const getCustomerName = (customerId: string | null) => {
    if (!customerId) return t('walk_in_customer');
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || t('unknown_customer');
  };

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.name || t('unknown_product');
  };

  const handleViewDetails = (sale: OfflineSale) => {
    setSelectedSale(sale);
    setIsDetailOpen(true);
  };

  const handlePrintReceipt = async (sale: OfflineSale) => {
    try {
      // Check if printer is ready
      const printerReady = await ThermalReceiptPrinter.isPrinterReady();
      if (!printerReady) {
        toast({
          title: t('offline_sales_printer_not_ready_title'),
          description: t('offline_sales_printer_not_ready_desc'),
          variant: "destructive"
        });
        return;
      }

      // Prepare receipt data
      const customerName = sale.customerId ? getCustomerName(sale.customerId) : undefined;

      const receiptData: ReceiptData = {
        invoiceNumber: sale.invoiceNumber,
        date: new Date(sale.date),
        customerName,
        items: sale.items.map(item => ({
          name: getProductName(item.productId),
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        })),
        subtotal: sale.items.reduce((sum, item) => sum + item.totalPrice, 0),
        discountAmount: sale.discountAmount || undefined,
        taxAmount: sale.taxAmount || undefined,
        total: sale.totalAmount,
        paidAmount: sale.paidAmount,
        changeAmount: sale.changeAmount || undefined,
        paymentMethod: sale.paymentMethod
      };

      // Print receipt
      await ThermalReceiptPrinter.printReceipt(receiptData);
      
      toast({
        title: t('success'),
        description: t('offline_sales_print_success')
      });
    } catch (error) {
      console.error('Print error:', error);
      toast({
        title: t('offline_sales_print_error_title'),
        description: t('offline_sales_print_error_desc'),
        variant: "destructive"
      });
    }
  };

  const handleExportData = () => {
    const csvData = filteredSales.map(sale => ({
      'Invoice Number': sale.invoiceNumber,
      'Date': format(new Date(sale.date), 'yyyy-MM-dd HH:mm'),
      'Customer': getCustomerName(sale.customerId),
      'Total Amount': sale.totalAmount.toFixed(2),
      'Payment Method': sale.paymentMethod,
      'Status': sale.status
    }));

    const csvContent = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: t('success'),
      description: t('offline_sales_export_success')
    });
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('offline_sales_history_title')}</h1>
        <Button onClick={handleExportData} disabled={filteredSales.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          {t('offline_sales_export')}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('offline_sales_total_sales')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSales)}</div>
            <p className="text-xs text-muted-foreground">
              {t('offline_sales_total_sales_desc', { count: formatNumber(totalTransactions) })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('offline_sales_transactions')}</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalTransactions)}</div>
            <p className="text-xs text-muted-foreground">
              {t('offline_sales_transactions_desc')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('offline_sales_average_sale')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(averageTransaction)}</div>
            <p className="text-xs text-muted-foreground">
              {t('offline_sales_average_sale_desc')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder={t('offline_sales_search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t('offline_sales_status_filter_placeholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('offline_sales_status_all')}</SelectItem>
            <SelectItem value="completed">{saleStatusLabels.completed}</SelectItem>
            <SelectItem value="pending">{saleStatusLabels.pending}</SelectItem>
            <SelectItem value="cancelled">{saleStatusLabels.cancelled}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder={t('offline_sales_payment_filter_placeholder')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('offline_sales_payment_all')}</SelectItem>
            <SelectItem value="cash">{paymentMethodLabels.cash}</SelectItem>
            <SelectItem value="credit">{paymentMethodLabels.credit}</SelectItem>
            <SelectItem value="card">{paymentMethodLabels.card}</SelectItem>
            <SelectItem value="mobile">{paymentMethodLabels.mobile}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sales Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('invoice_number')}</TableHead>
                <TableHead>{t('date')}</TableHead>
                <TableHead>{t('customer')}</TableHead>
                <TableHead>{t('payment_method')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead className="text-right">{t('amount')}</TableHead>
                <TableHead className="w-20">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">
                    {sale.invoiceNumber}
                  </TableCell>
                  <TableCell>
                    {format(new Date(sale.date), 'MMM dd, yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    {getCustomerName(sale.customerId)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {paymentMethodLabels[sale.paymentMethod as keyof typeof paymentMethodLabels] || sale.paymentMethod}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={
                        sale.status === 'completed' ? 'default' :
                        sale.status === 'pending' ? 'secondary' : 'destructive'
                      }
                      className="capitalize"
                    >
                      {saleStatusLabels[sale.status as keyof typeof saleStatusLabels] || sale.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(sale.totalAmount)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(sale)}
                        title={t('view_details')}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePrintReceipt(sale)}
                        title={t('offline_sales_print_receipt')}
                      >
                        <Receipt className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredSales.length === 0 && (
            <div className="text-center py-12">
              <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('no_sales_found')}</h3>
              <p className="text-gray-600">
                {searchQuery || statusFilter !== "all" || paymentMethodFilter !== "all"
                  ? t('offline_sales_no_results_filters')
                  : t('offline_sales_no_results_empty')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sale Details Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('sale_details')}</DialogTitle>
          </DialogHeader>
          
          {selectedSale && (
            <div className="space-y-6">
              {/* Sale Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">{t('offline_sales_info_section')}</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('invoice_number')}:</span>
                      <span>{selectedSale.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('date')}:</span>
                      <span>{format(new Date(selectedSale.date), 'MMM dd, yyyy HH:mm')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('customer')}:</span>
                      <span>{getCustomerName(selectedSale.customerId)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('status')}:</span>
                      <Badge variant="outline" className="capitalize">
                        {saleStatusLabels[selectedSale.status as keyof typeof saleStatusLabels] || selectedSale.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">{t('payment_information')}</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('payment_method')}:</span>
                      <span className="capitalize">{paymentMethodLabels[selectedSale.paymentMethod as keyof typeof paymentMethodLabels] || selectedSale.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('amount_paid')}:</span>
                      <span>{formatCurrency(selectedSale.paidAmount)}</span>
                    </div>
                    {selectedSale.changeAmount && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">{t('change_amount')}:</span>
                        <span>{formatCurrency(selectedSale.changeAmount)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="font-semibold mb-2">{t('offline_sales_items_section')}</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('product')}</TableHead>
                      <TableHead className="text-center">{t('quantity')}</TableHead>
                      <TableHead className="text-right">{t('unit_price')}</TableHead>
                      <TableHead className="text-right">{t('total')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSale.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{getProductName(item.productId)}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.totalPrice)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="border-t pt-4">
                <div className="space-y-1 text-sm">
                  {selectedSale.discountAmount && (
                    <div className="flex justify-between text-red-600">
                      <span>{t('discount')}:</span>
                      <span>-{formatCurrency(selectedSale.discountAmount)}</span>
                    </div>
                  )}
                  {selectedSale.taxAmount && (
                    <div className="flex justify-between">
                      <span>{t('tax')}:</span>
                      <span>{formatCurrency(selectedSale.taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg">
                    <span>{t('total')}:</span>
                    <span>{formatCurrency(selectedSale.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              {t('close')}
            </Button>
            <Button onClick={() => selectedSale && handlePrintReceipt(selectedSale)}>
              {t('offline_sales_print_receipt')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
