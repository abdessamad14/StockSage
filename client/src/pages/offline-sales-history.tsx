import { useMemo, useState, useEffect } from "react";
import type { ReactNode } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
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
  DollarSign,
  Receipt,
  Eye,
  Filter,
  Download,
  TrendingUp
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

export default function OfflineSalesHistory() {
  const { sales, loading } = useOfflineSales();
  const { products } = useOfflineProducts();
  const { customers } = useOfflineCustomers();
  const { t } = useI18n();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
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

  type ColumnDefinition = {
    id: string;
    label: string;
    align: 'left' | 'right' | 'center';
    render: (sale: OfflineSale) => ReactNode;
    alwaysVisible?: boolean;
  };

  const columnDefinitions = useMemo<ColumnDefinition[]>(() => ([
    {
      id: 'invoice',
      label: t('invoice_number'),
      align: 'left' as const,
      render: (sale: OfflineSale) => <span className="font-semibold text-slate-800">{sale.invoiceNumber}</span>
    },
    {
      id: 'date',
      label: t('date'),
      align: 'left' as const,
      render: (sale: OfflineSale) => (
        <div className="space-y-0.5">
          <span className="text-sm text-slate-800 font-medium">{format(new Date(sale.date), 'MMM dd, yyyy')}</span>
          <span className="text-[11px] text-slate-500">{format(new Date(sale.date), 'HH:mm')}</span>
        </div>
      )
    },
    {
      id: 'customer',
      label: t('customer'),
      align: 'left' as const,
      render: (sale: OfflineSale) => <span className="text-sm text-slate-700">{getCustomerName(sale.customerId)}</span>
    },
    {
      id: 'payment',
      label: t('payment_method'),
      align: 'left' as const,
      render: (sale: OfflineSale) => (
        <Badge variant="outline" className="capitalize border-transparent bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700">
          {paymentMethodLabels[sale.paymentMethod as keyof typeof paymentMethodLabels] || sale.paymentMethod}
        </Badge>
      )
    },
    {
      id: 'status',
      label: t('status'),
      align: 'left' as const,
      render: (sale: OfflineSale) => (
        <Badge 
          variant="outline"
          className={`capitalize border-transparent px-3 ${
            sale.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
            sale.status === 'pending' ? 'bg-amber-100 text-amber-700' :
            'bg-rose-100 text-rose-700'
          }`}
        >
          {saleStatusLabels[sale.status as keyof typeof saleStatusLabels] || sale.status}
        </Badge>
      )
    },
    {
      id: 'amount',
      label: t('amount'),
      align: 'right' as const,
      render: (sale: OfflineSale) => <span className="font-semibold text-slate-900">{formatCurrency(sale.totalAmount)}</span>
    },
    {
      id: 'actions',
      label: t('actions'),
      align: 'center' as const,
      alwaysVisible: true,
      render: (sale: OfflineSale) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewDetails(sale)}
            title={t('view_details')}
            className="hover:bg-indigo-50 text-indigo-600"
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handlePrintReceipt(sale)}
            title={t('offline_sales_print_receipt')}
            className="hover:bg-teal-50 text-teal-600"
          >
            <Receipt className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ]), [t, saleStatusLabels, paymentMethodLabels, formatCurrency, customers]);

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => columnDefinitions.map(column => column.id));

  useEffect(() => {
    setVisibleColumns(prev => {
      const ids = columnDefinitions.map(col => col.id);
      const required = columnDefinitions.filter(col => col.alwaysVisible).map(col => col.id);
      const filtered = prev.filter(id => ids.includes(id));
      const merged = Array.from(new Set([...filtered, ...required]));
      return merged.length ? merged : ids;
    });
  }, [columnDefinitions]);

  const setColumnVisibility = (id: string, visible: boolean) => {
    const column = columnDefinitions.find(col => col.id === id);
    if (column && column.alwaysVisible) return;
    setVisibleColumns(prev => {
      if (visible) {
        return prev.includes(id) ? prev : [...prev, id];
      }
      if (prev.length === 1) return prev;
      return prev.filter(columnId => columnId !== id);
    });
  };

  const columnsToRender = columnDefinitions.filter(column => visibleColumns.includes(column.id));

  const filteredSales = sales.filter(sale => {
    const matchesSearch = !searchQuery || 
      sale.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (customers.find(c => c.id === sale.customerId)?.name?.toLowerCase() ?? '').includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || sale.status === statusFilter;
    const matchesPayment = paymentMethodFilter === "all" || sale.paymentMethod === paymentMethodFilter;
    
    // Date filtering
    const saleDate = new Date(sale.date);
    const matchesStartDate = !startDate || saleDate >= new Date(startDate);
    const matchesEndDate = !endDate || saleDate <= new Date(endDate + 'T23:59:59');
    
    return matchesSearch && matchesStatus && matchesPayment && matchesStartDate && matchesEndDate;
  });

  const totalSales = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalTransactions = filteredSales.length;
  const averageTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0;

  function getCustomerName(customerId: string | null) {
    if (!customerId) return t('walk_in_customer');
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || t('unknown_customer');
  }

  function getProductName(productId: string, productName?: string) {
    // If productName is already provided in the item, use it
    if (productName) return productName;
    
    // Otherwise, look up the product by ID (handle both string and number IDs)
    const product = products.find(p => p.id === productId || p.id === String(productId));
    return product?.name || t('unknown_product');
  }

  const handleViewDetails = (sale: OfflineSale) => {
    setSelectedSale(sale);
    setIsDetailOpen(true);
  };

  const handlePrintReceipt = async (sale: OfflineSale) => {
    try {
      // Prepare receipt data (same as POS implementation)
      const customerName = sale.customerId ? getCustomerName(String(sale.customerId)) : undefined;

      const receiptData: ReceiptData = {
        invoiceNumber: sale.invoiceNumber,
        date: new Date(sale.date),
        customerName,
        items: sale.items.map(item => ({
          name: getProductName(String(item.productId), item.productName),
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

      // Print receipt directly (same as POS)
      await ThermalReceiptPrinter.printReceipt(receiptData);
      
      toast({
        title: t('success'),
        description: t('offline_pos_receipt_auto_printed')
      });
    } catch (error) {
      console.error('Print error:', error);
      toast({
        title: t('error'),
        description: t('offline_pos_sale_completed_print_error'),
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
        <div>
          <p className="text-sm uppercase tracking-widest text-indigo-600 font-semibold">{t('offline_sales_history_title')}</p>
          <h1 className="text-3xl font-bold text-slate-900">{t('offline_sales_headline')}</h1>
        </div>
        <Button onClick={handleExportData} disabled={filteredSales.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          {t('offline_sales_export')}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 via-emerald-400 to-teal-500 text-white p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider/5 opacity-80">{t('offline_sales_total_sales')}</p>
              <p className="text-3xl font-bold mt-1">{formatCurrency(totalSales)}</p>
            </div>
            <div className="bg-white/20 rounded-full p-3">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs mt-4 text-white/80">
            {t('offline_sales_total_sales_desc', { count: formatNumber(totalTransactions) })}
          </p>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-400 to-sky-500 text-white p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider/5 opacity-80">{t('offline_sales_transactions')}</p>
              <p className="text-3xl font-bold mt-1">{formatNumber(totalTransactions)}</p>
            </div>
            <div className="bg-white/20 rounded-full p-3">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs mt-4 text-white/80">
            {t('offline_sales_transactions_desc')}
          </p>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-amber-500 via-orange-400 to-rose-500 text-white p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider/5 opacity-80">{t('offline_sales_average_sale')}</p>
              <p className="text-3xl font-bold mt-1">{formatCurrency(averageTransaction)}</p>
            </div>
            <div className="bg-white/20 rounded-full p-3">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <p className="text-xs mt-4 text-white/80">
            {t('offline_sales_average_sale_desc')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-3 items-start lg:items-end">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder={t('offline_sales_search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          {/* Date Range Filters */}
          <div className="flex gap-2 items-center">
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40 bg-white/80"
              placeholder={t('start_date')}
            />
            <span className="text-gray-500">-</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40 bg-white/80"
              placeholder={t('end_date')}
            />
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="text-xs"
              >
                {t('clear')}
              </Button>
            )}
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-white/80">
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
            <SelectTrigger className="w-full sm:w-48 bg-white/80">
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

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="bg-white/80">
                <Filter className="mr-2 h-4 w-4" />
                {t('offline_sales_column_filter')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="end">
              <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-widest">
                {t('offline_sales_column_picker_title')}
              </p>
              <div className="space-y-2">
                {columnDefinitions.map((column) => (
                  <div key={column.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`col-${column.id}`}
                      checked={visibleColumns.includes(column.id)}
                      onCheckedChange={(checked) => setColumnVisibility(column.id, checked === true)}
                      disabled={column.alwaysVisible}
                    />
                    <label htmlFor={`col-${column.id}`} className="text-sm text-slate-700">
                      {column.label}
                    </label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Sales Table */}
      <Card className="border-none shadow-xl bg-gradient-to-br from-white via-white to-indigo-50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-500">
                <TableRow>
                  {columnsToRender.map(column => (
                    <TableHead
                      key={column.id}
                      className={`text-white uppercase tracking-wider text-xs ${column.align === 'right' ? 'text-right pr-6' : column.align === 'center' ? 'text-center' : ''}`}
                    >
                      {column.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSales.map((sale) => (
                  <TableRow key={sale.id} className="hover:bg-indigo-50/70 transition-colors">
                    {columnsToRender.map(column => (
                      <TableCell
                        key={column.id}
                        className={`${column.align === 'right' ? 'text-right pr-6' : column.align === 'center' ? 'text-center' : ''}`}
                      >
                        {column.render(sale)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredSales.length === 0 && (
            <div className="text-center py-12">
              <Receipt className="w-12 h-12 text-indigo-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">{t('no_sales_found')}</h3>
              <p className="text-slate-500">
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
                        <TableCell>{getProductName(String(item.productId), item.productName)}</TableCell>
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
