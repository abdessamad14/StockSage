import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
  FileText, 
  RefreshCw, 
  AlertTriangle, 
  Check, 
  Calendar, 
  User, 
  CreditCard, 
  Printer, 
  Download,
  Eye,
  Banknote,
  Smartphone,
  Building
} from "lucide-react";
import { SaleWithItems } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function SalesHistory() {
  const { t } = useI18n();
  const { toast } = useToast();
  
  // State variables
  const [searchQuery, setSearchQuery] = useState("");
  const [customerFilter, setCustomerFilter] = useState<number | null>(null);
  const [dateFilter, setDateFilter] = useState<"today" | "week" | "month" | "all">("all");
  const [selectedSale, setSelectedSale] = useState<SaleWithItems | null>(null);
  
  // Calculate date range for filtering
  const getDateRange = () => {
    const today = new Date();
    
    switch (dateFilter) {
      case "today":
        return {
          startDate: format(today, "yyyy-MM-dd"),
          endDate: format(today, "yyyy-MM-dd")
        };
      case "week":
        const lastWeek = new Date(today);
        lastWeek.setDate(today.getDate() - 7);
        return {
          startDate: format(lastWeek, "yyyy-MM-dd"),
          endDate: format(today, "yyyy-MM-dd")
        };
      case "month":
        const lastMonth = new Date(today);
        lastMonth.setMonth(today.getMonth() - 1);
        return {
          startDate: format(lastMonth, "yyyy-MM-dd"),
          endDate: format(today, "yyyy-MM-dd")
        };
      default:
        return {};
    }
  };
  
  // Fetch sales data
  const { data: sales, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/sales', getDateRange(), customerFilter],
  });
  
  // Fetch customers for filtering
  const { data: customers, isLoading: isLoadingCustomers } = useQuery({
    queryKey: ['/api/customers'],
  });
  
  // Filter sales by search query
  const filteredSales = (sales || []).filter(sale => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        (sale.invoiceNumber && sale.invoiceNumber.toLowerCase().includes(query)) ||
        (sale.customer?.name && sale.customer.name.toLowerCase().includes(query))
      );
    }
    return true;
  });
  
  // Handle print receipt
  const handlePrintReceipt = (sale: SaleWithItems) => {
    // In a real app, this would trigger the thermal printer
    toast({
      title: t('print_receipt'),
      description: t('print_receipt_not_implemented'),
    });
  };
  
  // Handle download invoice
  const handleDownloadInvoice = (sale: SaleWithItems) => {
    // In a real app, this would generate a PDF
    toast({
      title: t('download_invoice'),
      description: t('download_invoice_not_implemented'),
    });
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Error state
  if (isError) {
    return (
      <div className="p-4">
        <Card className="bg-red-50 border border-red-200 p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-semibold">{t('error')}</h3>
          </div>
          <p className="mt-2 text-sm text-red-700">{t('sales_load_error')}</p>
          <Button 
            onClick={() => refetch()} 
            variant="outline" 
            className="mt-4 text-red-700 border-red-300"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('retry')}
          </Button>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">{t('sales_history')}</h1>
      </div>
      
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="search"
            placeholder={t('search_sales')}
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Select
          value={dateFilter}
          onValueChange={(value) => setDateFilter(value as any)}
        >
          <SelectTrigger>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{t('date_filter')}</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all_dates')}</SelectItem>
            <SelectItem value="today">{t('today')}</SelectItem>
            <SelectItem value="week">{t('last_7_days')}</SelectItem>
            <SelectItem value="month">{t('last_30_days')}</SelectItem>
          </SelectContent>
        </Select>
        
        <Select
          value={customerFilter?.toString() || "all"}
          onValueChange={(value) => setCustomerFilter(value !== "all" && value !== "loading" ? parseInt(value) : null)}
        >
          <SelectTrigger>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>{t('customer_filter')}</span>
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('all_customers')}</SelectItem>
            {isLoadingCustomers ? (
              <SelectItem value="loading" disabled>{t('loading')}</SelectItem>
            ) : (
              customers?.map(customer => (
                <SelectItem key={customer.id} value={customer.id.toString()}>
                  {customer.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
      
      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('sales_list')}</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredSales.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>{t('no_sales_found')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('invoice_number')}</TableHead>
                    <TableHead>{t('date')}</TableHead>
                    <TableHead>{t('customer')}</TableHead>
                    <TableHead>{t('payment_method')}</TableHead>
                    <TableHead className="text-right">{t('total')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-medium">{sale.invoiceNumber}</TableCell>
                      <TableCell>
                        {new Date(sale.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {sale.customer ? sale.customer.name : t('cash_customer')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {sale.paymentMethod === 'cash' ? (
                            <><Banknote className="h-3 w-3 mr-1" /> {t('cash')}</>
                          ) : sale.paymentMethod === 'credit' ? (
                            <><CreditCard className="h-3 w-3 mr-1" /> {t('credit')}</>
                          ) : sale.paymentMethod === 'bank_transfer' ? (
                            <><Building className="h-3 w-3 mr-1" /> {t('bank_transfer')}</>
                          ) : (
                            <><Smartphone className="h-3 w-3 mr-1" /> {t('mobile_payment')}</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {sale.totalAmount.toFixed(2)} {t('currency')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedSale(sale)}
                            title={t('view_details')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePrintReceipt(sale)}
                            title={t('print_receipt')}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadInvoice(sale)}
                            title={t('download_invoice')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Sale Details Dialog */}
      <Dialog open={!!selectedSale} onOpenChange={(open) => !open && setSelectedSale(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('sale_details')}</DialogTitle>
          </DialogHeader>
          
          {selectedSale && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-sm text-muted-foreground">{t('invoice_number')}</p>
                  <p className="font-medium">{selectedSale.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('date')}</p>
                  <p className="font-medium">{new Date(selectedSale.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('customer')}</p>
                  <p className="font-medium">{selectedSale.customer ? selectedSale.customer.name : t('cash_customer')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('payment_method')}</p>
                  <p className="font-medium capitalize">{t(selectedSale.paymentMethod as any)}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium mb-2">{t('items')}</h3>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('product')}</TableHead>
                        <TableHead className="text-right">{t('quantity')}</TableHead>
                        <TableHead className="text-right">{t('price')}</TableHead>
                        <TableHead className="text-right">{t('total')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedSale.items?.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.product ? item.product.name : `Product #${item.productId}`}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{item.unitPrice.toFixed(2)}</TableCell>
                          <TableCell className="text-right">{item.totalPrice.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              
              <div className="space-y-1 pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span>{t('subtotal')}</span>
                  <span>{(selectedSale.totalAmount + selectedSale.discountAmount).toFixed(2)} {t('currency')}</span>
                </div>
                {selectedSale.discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>{t('discount')}</span>
                    <span>-{selectedSale.discountAmount.toFixed(2)} {t('currency')}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold">
                  <span>{t('total')}</span>
                  <span>{selectedSale.totalAmount.toFixed(2)} {t('currency')}</span>
                </div>
                {selectedSale.paymentMethod === 'cash' && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>{t('amount_paid')}</span>
                      <span>{selectedSale.paidAmount.toFixed(2)} {t('currency')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{t('change')}</span>
                      <span>{selectedSale.changeAmount.toFixed(2)} {t('currency')}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => selectedSale && handlePrintReceipt(selectedSale)}
            >
              <Printer className="h-4 w-4 mr-2" />
              {t('print_receipt')}
            </Button>
            <Button 
              onClick={() => selectedSale && handleDownloadInvoice(selectedSale)}
            >
              <Download className="h-4 w-4 mr-2" />
              {t('download_invoice')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}