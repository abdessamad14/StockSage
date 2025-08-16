import { useState } from "react";
import { format } from "date-fns";
import { useOfflineSales } from "@/hooks/use-offline-sales";
import { useOfflineProducts } from "@/hooks/use-offline-products";
import { useOfflineCustomers } from "@/hooks/use-offline-customers";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { OfflineSale } from "@/lib/offline-storage";
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

  const filteredSales = sales.filter(sale => {
    const matchesSearch = !searchQuery || 
      sale.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customers.find(c => c.id === sale.customerId)?.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || sale.status === statusFilter;
    const matchesPayment = paymentMethodFilter === "all" || sale.paymentMethod === paymentMethodFilter;
    
    return matchesSearch && matchesStatus && matchesPayment;
  });

  const totalSales = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalTransactions = filteredSales.length;
  const averageTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0;

  const getCustomerName = (customerId: string | null) => {
    if (!customerId) return "Walk-in Customer";
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || "Unknown Customer";
  };

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.name || "Unknown Product";
  };

  const handleViewDetails = (sale: OfflineSale) => {
    setSelectedSale(sale);
    setIsDetailOpen(true);
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
      title: "Success",
      description: "Sales data exported successfully"
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
        <h1 className="text-3xl font-bold">Sales History</h1>
        <Button onClick={handleExportData} disabled={filteredSales.length === 0}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSales.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              From {totalTransactions} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
            <p className="text-xs text-muted-foreground">
              Total completed sales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Sale</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${averageTransaction.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Per transaction
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by invoice number or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by payment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payment Methods</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="card">Card</SelectItem>
            <SelectItem value="mobile">Mobile Payment</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sales Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-20">Actions</TableHead>
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
                      {sale.paymentMethod}
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
                      {sale.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${sale.totalAmount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetails(sale)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredSales.length === 0 && (
            <div className="text-center py-12">
              <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No sales found</h3>
              <p className="text-gray-600">
                {searchQuery || statusFilter !== "all" || paymentMethodFilter !== "all"
                  ? "Try adjusting your filters"
                  : "No sales have been recorded yet"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sale Details Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sale Details</DialogTitle>
          </DialogHeader>
          
          {selectedSale && (
            <div className="space-y-6">
              {/* Sale Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-2">Sale Information</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Invoice:</span>
                      <span>{selectedSale.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Date:</span>
                      <span>{format(new Date(selectedSale.date), 'MMM dd, yyyy HH:mm')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Customer:</span>
                      <span>{getCustomerName(selectedSale.customerId)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <Badge variant="outline" className="capitalize">
                        {selectedSale.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Payment Information</h3>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Method:</span>
                      <span className="capitalize">{selectedSale.paymentMethod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Paid:</span>
                      <span>${selectedSale.paidAmount.toFixed(2)}</span>
                    </div>
                    {selectedSale.changeAmount && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Change:</span>
                        <span>${selectedSale.changeAmount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="font-semibold mb-2">Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSale.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{getProductName(item.productId)}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right">${item.totalPrice.toFixed(2)}</TableCell>
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
                      <span>Discount:</span>
                      <span>-${selectedSale.discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {selectedSale.taxAmount && (
                    <div className="flex justify-between">
                      <span>Tax:</span>
                      <span>${selectedSale.taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>${selectedSale.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              // Could implement receipt printing here
              toast({
                title: "Info",
                description: "Print functionality would be implemented here"
              });
            }}>
              Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
