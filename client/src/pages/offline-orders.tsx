import { useMemo, useState, useEffect } from "react";
import { useOfflinePurchaseOrders } from "@/hooks/use-offline-purchase-orders";
import { useOfflineSuppliers } from "@/hooks/use-offline-suppliers";
import { useOfflineProducts } from "@/hooks/use-offline-products";
import { useOfflineStockTransactions } from "@/hooks/use-offline-stock-transactions";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { 
  OfflineSupplier, 
  OfflineProduct,
  offlineProductStockStorage,
  offlineStockLocationStorage,
  offlineSupplierPaymentStorage,
  offlinePurchaseOrderItemStorage
} from "@/lib/offline-storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  ShoppingCart, 
  Search, 
  Plus,
  Package,
  Truck,
  Edit,
  Trash2,
  Eye,
  Minus,
  CreditCard,
  DollarSign
} from "lucide-react";

// Component to display order items with async loading
function OrderItemsDisplay({ orderId, products }: { orderId: string, products: any[] }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();
  const formatCurrency = (value?: number) => `${(value ?? 0).toFixed(2)} ${t('currency')}`;

  useEffect(() => {
    const loadItems = async () => {
      try {
        const orderItems = await offlinePurchaseOrderItemStorage.getByOrderId(orderId);
        setItems(orderItems);
      } catch (error) {
        console.error('Error loading order items:', error);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };

    loadItems();
  }, [orderId]);

  if (loading) {
    return (
      <div>
        <h3 className="font-semibold mb-4">{t('order_items')}</h3>
        <div className="text-sm text-gray-600">{t('loading_order_items')}</div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-semibold mb-4">{t('order_items')}</h3>
      {items.length === 0 ? (
        <div className="text-sm text-gray-600">{t('no_order_items')}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('product')}</TableHead>
              <TableHead>{t('quantity')}</TableHead>
              <TableHead>{t('unit_cost')}</TableHead>
              <TableHead>{t('total')}</TableHead>
              <TableHead>{t('received_quantity')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(item => {
              const product = products.find(p => p.id === item.productId);
              return (
                <TableRow key={item.id}>
                  <TableCell>{product?.name || t('unknown_product')}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>{formatCurrency(item.unitCost || item.unitPrice || 0)}</TableCell>
                  <TableCell>{formatCurrency(item.totalCost || item.totalPrice || 0)}</TableCell>
                  <TableCell>{item.receivedQuantity || 0}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

export default function OfflineOrders() {
  const { orders, loading: ordersLoading, createOrder, updateOrder, deleteOrder, generateOrderNumber } = useOfflinePurchaseOrders();
  const { suppliers, loading: suppliersLoading } = useOfflineSuppliers();
  const { products, loading: productsLoading } = useOfflineProducts();
  const { createTransaction } = useOfflineStockTransactions();
  const { toast } = useToast();
  const { t } = useI18n();

  // Load stock locations
  const [stockLocations, setStockLocations] = useState<any[]>([]);

  const formatCurrency = (value?: number) => `${(value ?? 0).toFixed(2)} ${t('currency')}`;

  const orderStatusLabels = useMemo(() => ({
    draft: t('order_status_draft'),
    pending: t('order_status_pending'),
    ordered: t('order_status_ordered'),
    in_transit: t('in_transit'),
    received: t('order_status_received'),
    cancelled: t('order_status_cancelled'),
  }), [t]);

  const paymentStatusLabels = useMemo(() => ({
    paid: t('payment_status_paid'),
    partial: t('payment_status_partial'),
    unpaid: t('payment_status_unpaid'),
  }), [t]);
  
  useEffect(() => {
    const loadStockLocations = async () => {
      try {
        const locations = await offlineStockLocationStorage.getAll();
        setStockLocations(locations || []);
      } catch (error) {
        console.error('Error loading stock locations:', error);
        setStockLocations([]);
      }
    };
    
    loadStockLocations();
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
  const [orderProducts, setOrderProducts] = useState<{productId: string, quantity: number, unitCost: number}[]>([]);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit' | 'bank_check'>('credit');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null);
  const [receivingOrderId, setReceivingOrderId] = useState<string | null>(null);
  const [receivingItems, setReceivingItems] = useState<{itemId: string, receivedQuantity: number}[]>([]);
  const [viewingOrderId, setViewingOrderId] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  const loading = productsLoading || suppliersLoading || ordersLoading;
  const orderProductsTotal = orderProducts.reduce((sum, op) => sum + (op.quantity * op.unitCost), 0);

  const handleCreateOrder = async () => {
    try {
      console.log('=== STARTING PURCHASE ORDER CREATION ===');
      console.log('Selected supplier:', selectedSupplier);
      console.log('Selected warehouse:', selectedWarehouse);
      console.log('Order products:', orderProducts);
      console.log('Payment method:', paymentMethod);
      console.log('Paid amount:', paidAmount);

      const subtotal = orderProducts.reduce((sum, op) => sum + (op.quantity * op.unitCost), 0);
      const tax = 0; // No tax calculation for now
      const total = subtotal + tax;

      console.log('Calculated totals:', { subtotal, tax, total });

      // Create the order
      const orderData = {
        orderNumber: generateOrderNumber(),
        supplierId: selectedSupplier,
        warehouseId: selectedWarehouse,
        status: 'draft',
        notes: notes || null,
        date: new Date(),
        orderDate: new Date(),
        total: total,
        totalAmount: total,
        paymentMethod: paymentMethod,
        paymentStatus: paymentMethod === 'credit' ? 'unpaid' : paidAmount >= total ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid',
        paidAmount: paymentMethod === 'credit' ? 0 : paidAmount,
        remainingAmount: paymentMethod === 'credit' ? total : total - paidAmount,
        items: []
      };

      console.log('Creating order with data:', orderData);
      const newOrder = await createOrder(orderData);
      console.log('Order created:', newOrder);
      console.log('Order payment fields:', {
        paymentStatus: newOrder.paymentStatus,
        paidAmount: newOrder.paidAmount,
        paymentMethod: newOrder.paymentMethod
      });

      // Create order items for each product
      console.log('Creating order items...');
      for (const op of orderProducts) {
        const itemData = {
          orderId: newOrder.id,
          productId: op.productId,
          quantity: op.quantity,
          unitCost: op.unitCost,
          unitPrice: op.unitCost,
          totalCost: op.quantity * op.unitCost,
          totalPrice: op.quantity * op.unitCost,
          receivedQuantity: 0
        };
        console.log('Creating item:', itemData);
        await offlinePurchaseOrderItemStorage.create(itemData);
      }

      toast({
        title: t('success'),
        description: t('offline_order_create_success')
      });

      // No need to force refresh anymore - database schema is fixed

      // Reset form
      setSelectedSupplier("");
      setSelectedWarehouse("");
      setOrderProducts([]);
      setNotes("");
      setPaymentMethod('credit');
      setPaidAmount(0);
      setIsCreateOrderOpen(false);

      console.log('=== PURCHASE ORDER CREATION COMPLETED ===');
    } catch (error) {
      console.error('Purchase order creation error:', error);
      const message = error instanceof Error ? error.message : t('unknown_error');
      toast({
        title: t('error'),
        description: t('offline_order_create_error', { message }),
        variant: "destructive"
      });
    }
  };

  const handleReceiveOrder = async (orderId: string) => {
    try {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      // Get order items from storage
      const orderItems = await offlinePurchaseOrderItemStorage.getByOrderId(orderId);
      
      // Update stock quantities for each item and record transactions
      for (const item of orderItems) {
        const currentStock = await offlineProductStockStorage.getByProductAndLocation(item.productId, order.supplierId || 'default');
        const previousQuantity = currentStock?.quantity || 0;
        const receivedQuantity = (item as any).receivedQuantity || item.quantity;
        const newQuantity = previousQuantity + receivedQuantity;
        
        // Update stock
        offlineProductStockStorage.upsert({
          productId: item.productId,
          locationId: order.warehouseId || 'default',
          quantity: newQuantity,
          minStockLevel: 0
        });

        // Record stock transaction
        createTransaction({
          productId: item.productId,
          warehouseId: order.warehouseId || 'default',
          type: 'entry',
          quantity: receivedQuantity,
          previousQuantity,
          newQuantity,
          reason: t('purchase_order_received_reason'),
          reference: order.orderNumber
        });
      }

      // Update order status
      updateOrder(orderId, { 
        status: 'received',
        receivedDate: new Date().toISOString()
      });

      // Update remaining amount calculation
      const updatedOrder = orders.find(o => o.id === orderId);
      if (updatedOrder) {
        const remainingAmount = (updatedOrder.total || updatedOrder.totalAmount || 0) - (updatedOrder.paidAmount || 0);
        updateOrder(orderId, { remainingAmount });
      }

      toast({
        title: t('success'),
        description: t('offline_order_receive_success')
      });
    } catch (error) {
      toast({
        title: t('error'),
        description: t('offline_order_receive_error'),
        variant: "destructive"
      });
    }
  };

  const handleViewOrder = (orderId: string) => {
    setViewingOrderId(orderId);
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      const success = await deleteOrder(orderId);
      if (success) {
        toast({
          title: t('success'),
          description: t('offline_order_delete_success')
        });
      } else {
        toast({
          title: t('error'),
          description: t('offline_order_delete_error'),
          variant: "destructive"
        });
      }
      setDeletingOrderId(null);
    } catch (error) {
      toast({
        title: t('error'),
        description: t('offline_order_delete_error'),
        variant: "destructive"
      });
    }
  };

  const handlePaymentDialog = (orderId: string) => {
    setPaymentOrderId(orderId);
    const order = orders.find(o => o.id === orderId);
    if (order) {
      setPaidAmount(order.paidAmount || 0);
      setPaymentMethod((order.paymentMethod as 'cash' | 'credit' | 'bank_check') || 'credit');
    }
    setShowPaymentDialog(true);
  };

  const handleMakePayment = async () => {
    if (!paymentOrderId) return;
    
    try {
      const order = orders.find(o => o.id === paymentOrderId);
      if (!order) return;

      const newPaidAmount = paidAmount;
      const orderTotal = order.total || order.totalAmount || 0;
      const newRemainingAmount = orderTotal - newPaidAmount;
      const newPaymentStatus = newPaidAmount >= orderTotal ? 'paid' : newPaidAmount > 0 ? 'partial' : 'unpaid';

      console.log('Making payment:', {
        orderId: paymentOrderId,
        newPaidAmount,
        orderTotal,
        newPaymentStatus,
        newRemainingAmount
      });

      // Update order payment information
      const success = await updateOrder(paymentOrderId, {
        paymentMethod: paymentMethod,
        paymentStatus: newPaymentStatus,
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        paymentDate: newPaidAmount > 0 ? new Date().toISOString() : undefined
      });

      if (!success) {
        toast({
          title: t('error'),
          description: t('offline_order_payment_update_error'),
          variant: "destructive"
        });
        return;
      }

      // Create payment record if amount > 0
      if (newPaidAmount > (order.paidAmount || 0)) {
        const paymentAmount = newPaidAmount - (order.paidAmount || 0);
        offlineSupplierPaymentStorage.create({
          supplierId: order.supplierId || '',
          amount: paymentAmount,
          paymentMethod: paymentMethod === 'bank_check' ? 'bank_check' : paymentMethod === 'cash' ? 'cash' : 'bank_check',
          notes: t('order_payment_note', { order: order.orderNumber })
        });
      }

      const paymentDelta = newPaidAmount - (order.paidAmount || 0);
      if (paymentDelta !== 0) {
        toast({
          title: t('success'),
          description: t('offline_order_payment_recorded', { amount: formatCurrency(Math.abs(paymentDelta)) })
        });
      }

      setShowPaymentDialog(false);
      setPaymentOrderId(null);
      setPaidAmount(0);
    } catch (error) {
      toast({
        title: t('error'),
        description: t('offline_order_payment_error'),
        variant: "destructive"
      });
    }
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
        <h1 className="text-3xl font-bold">{t('purchase_orders')}</h1>
        <Dialog open={isCreateOrderOpen} onOpenChange={setIsCreateOrderOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              {t('create_order')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('create_purchase_order')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Supplier and Warehouse Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier">{t('supplier')} *</Label>
                  <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('select_supplier')} />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(supplier => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warehouse">{t('warehouse')} *</Label>
                  <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('select_warehouse')} />
                    </SelectTrigger>
                    <SelectContent>
                      {stockLocations.map((location: any) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name} {location.isPrimary && t('primary_location_badge')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Product Selection */}
              <div className="space-y-4">
                <Label>{t('products')}</Label>
                <div className="border rounded-lg p-4 space-y-4">
                  {orderProducts.map((orderProduct, index) => (
                    <div key={index} className="grid grid-cols-4 gap-4 items-end">
                      <div className="space-y-2">
                        <Label>{t('product')}</Label>
                        <Select 
                          value={orderProduct.productId} 
                          onValueChange={(value) => {
                            const newProducts = [...orderProducts];
                            newProducts[index].productId = value;
                            setOrderProducts(newProducts);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('select_product')} />
                          </SelectTrigger>
                          <SelectContent>
                            {products.filter(p => p.active).map(product => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t('quantity')}</Label>
                        <Input
                          type="number"
                          min="1"
                          value={orderProduct.quantity}
                          onChange={(e) => {
                            const newProducts = [...orderProducts];
                            newProducts[index].quantity = parseInt(e.target.value) || 0;
                            setOrderProducts(newProducts);
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('unit_cost')}</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={orderProduct.unitCost}
                          onChange={(e) => {
                            const newProducts = [...orderProducts];
                            newProducts[index].unitCost = parseFloat(e.target.value) || 0;
                            setOrderProducts(newProducts);
                          }}
                        />
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const newProducts = orderProducts.filter((_, i) => i !== index);
                          setOrderProducts(newProducts);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button 
                    variant="outline" 
                    onClick={() => setOrderProducts([...orderProducts, { productId: '', quantity: 1, unitCost: 0 }])}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('add_product')}
                  </Button>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">{t('notes')}</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('order_notes_placeholder')}
                  rows={3}
                />
              </div>

              {/* Payment Information */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-semibold">{t('payment_information')}</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">{t('payment_method')}</Label>
                    <Select value={paymentMethod} onValueChange={(value: 'cash' | 'credit' | 'bank_check') => setPaymentMethod(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">{t('cash')}</SelectItem>
                        <SelectItem value="credit">{t('credit_pay_later')}</SelectItem>
                        <SelectItem value="bank_check">{t('bank_check')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {paymentMethod !== 'credit' && (
                    <div className="space-y-2">
                      <Label htmlFor="paidAmount">{t('amount_paid')}</Label>
                      <Input
                        id="paidAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Order Summary */}
              {orderProducts.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">{t('order_summary')}</h4>
                  <div className="space-y-2">
                    {orderProducts.map((orderProduct, index) => {
                      const product = products.find(p => p.id === orderProduct.productId);
                      const total = orderProduct.quantity * orderProduct.unitCost;
                      return product ? (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{product.name} × {orderProduct.quantity}</span>
                          <span>{formatCurrency(total)}</span>
                        </div>
                      ) : null;
                    })}
                    <div className="border-t pt-2 font-semibold flex justify-between">
                      <span>{t('total')}:</span>
                      <span>{formatCurrency(orderProductsTotal)}</span>
                    </div>
                    {paymentMethod !== 'credit' && paidAmount > 0 && (
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between text-green-600">
                          <span>{t('paid_amount')}:</span>
                          <span>{formatCurrency(paidAmount)}</span>
                        </div>
                        <div className="flex justify-between text-orange-600">
                          <span>{t('due')}:</span>
                          <span>{formatCurrency(orderProductsTotal - paidAmount)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateOrderOpen(false)}>
                  {t('cancel')}
                </Button>
                <Button 
                  onClick={handleCreateOrder}
                  disabled={!selectedSupplier || !selectedWarehouse || orderProducts.length === 0 || orderProducts.some(op => !op.productId || op.quantity <= 0)}
                >
                  {t('create_order')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('total_orders')}</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
            <p className="text-xs text-muted-foreground">
              {orders.length === 0 
                ? t('no_orders_created') 
                : t('active_orders_count', { count: orders.filter(o => o.status === 'pending' || o.status === 'ordered').length })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('suppliers')}</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliers.length}</div>
            <p className="text-xs text-muted-foreground">
              {t('available_suppliers')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('products')}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground">
              {t('available_products')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder={t('search_orders')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('order_number')}</TableHead>
                <TableHead>{t('supplier')}</TableHead>
                <TableHead>{t('date')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead className="text-right">{t('amount')}</TableHead>
                <TableHead className="w-20">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{t('no_orders_found')}</h3>
                    <p className="text-gray-600">
                      {t('create_first_order')}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                orders
                  .filter(order => 
                    order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    ((suppliers.find(s => s.id === order.supplierId)?.name?.toLowerCase() ?? '')
                      .includes(searchQuery.toLowerCase()))
                  )
                  .map(order => {
                    const supplier = suppliers.find(s => s.id === order.supplierId);
                    console.log('Rendering order:', order.orderNumber, 'paymentStatus:', order.paymentStatus, 'paidAmount:', order.paidAmount);
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                        <TableCell>{supplier?.name || t('unknown_supplier')}</TableCell>
                        <TableCell>{order.orderDate ? new Date(order.orderDate).toLocaleDateString() : t('unknown')}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge 
                              variant={order.status === 'received' ? 'default' : 
                                     order.status === 'ordered' ? 'secondary' : 
                                     order.status === 'cancelled' ? 'destructive' : 'outline'}
                            >
                              {orderStatusLabels[order.status as keyof typeof orderStatusLabels] || order.status}
                            </Badge>
                            <Badge 
                              variant={(order.paymentStatus || 'unpaid') === 'paid' ? 'default' : 
                                     (order.paymentStatus || 'unpaid') === 'partial' ? 'secondary' : 'destructive'}
                              className="text-xs"
                            >
                              {paymentStatusLabels[(order.paymentStatus || 'unpaid') as keyof typeof paymentStatusLabels] || (order.paymentStatus || 'unpaid')}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="space-y-1">
                            <div>{formatCurrency(order.total || order.totalAmount || 0)}</div>
                            {(order.paymentStatus || 'unpaid') !== 'unpaid' && (
                              <div className="text-xs text-green-600">
                                {t('paid_amount')}: {formatCurrency(order.paidAmount || 0)}
                              </div>
                            )}
                            {(order.remainingAmount || 0) > 0 && (
                              <div className="text-xs text-orange-600">
                                {t('due')}: {formatCurrency(order.remainingAmount || 0)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {order.status === 'draft' || order.status === 'pending' ? (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => updateOrder(order.id, { status: 'ordered' })}
                                title={t('mark_as_ordered')}
                              >
                                <Package className="w-4 h-4" />
                              </Button>
                            ) : order.status === 'ordered' ? (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleReceiveOrder(order.id)}
                                title={t('receive_order')}
                              >
                                <Truck className="w-4 h-4" />
                              </Button>
                            ) : null}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              title={t('view_details')}
                              onClick={() => handleViewOrder(order.id)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {(order.paymentStatus || 'unpaid') !== 'paid' && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                title={t('make_payment')}
                                onClick={() => handlePaymentDialog(order.id)}
                              >
                                <CreditCard className="w-4 h-4" />
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  title={t('delete_order')}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{t('delete_order_title')}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {t('delete_order_description', { orderNumber: order.orderNumber })}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteOrder(order.id)}>
                                    {t('delete')}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={!!viewingOrderId} onOpenChange={() => setViewingOrderId(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {viewingOrderId && (() => {
            const order = orders.find(o => o.id === viewingOrderId);
            const supplier = suppliers.find(s => s.id === order?.supplierId);
            const warehouse = stockLocations.find((w: any) => w.id === order?.warehouseId);
            
            if (!order) return <div>{t('order_not_found')}</div>;
            
            return (
              <div className="space-y-6">
                {/* Order Header */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold">{t('order_information')}</h3>
                    <div className="space-y-2 mt-2">
                      <div><span className="text-gray-600">{t('order_number_label')}:</span> {order.orderNumber}</div>
                      <div><span className="text-gray-600">{t('status')}:</span> 
                        <Badge className="ml-2" variant={order.status === 'received' ? 'default' : 
                                                       order.status === 'ordered' ? 'secondary' : 
                                                       order.status === 'cancelled' ? 'destructive' : 'outline'}>
                          {orderStatusLabels[order.status as keyof typeof orderStatusLabels] || order.status}
                        </Badge>
                      </div>
                      <div><span className="text-gray-600">{t('order_date_label')}:</span> {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : t('unknown')}</div>
                      {order.receivedDate && (
                        <div><span className="text-gray-600">{t('received_date_label')}:</span> {order.receivedDate ? new Date(order.receivedDate).toLocaleDateString() : t('unknown')}</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold">{t('supplier_and_warehouse')}</h3>
                    <div className="space-y-2 mt-2">
                      <div><span className="text-gray-600">{t('supplier')}:</span> {supplier?.name || t('unknown_supplier')}</div>
                      <div><span className="text-gray-600">{t('warehouse')}:</span> {warehouse?.name || t('unknown')}</div>
                      {order.notes && (
                        <div><span className="text-gray-600">{t('notes_label')}:</span> {order.notes}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <OrderItemsDisplay orderId={viewingOrderId} products={products} />

                {/* Order Summary */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{t('total_amount')}:</span>
                    <span className="text-xl font-bold">{formatCurrency(order.total || order.totalAmount || 0)}</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('make_payment')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {(() => {
              const order = orders.find(o => o.id === paymentOrderId);
              if (!order) return null;
              
              return (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm space-y-1">
                      <div><span className="font-medium">{t('payment_details_order')}</span> {order.orderNumber}</div>
                      <div><span className="font-medium">{t('payment_details_total')}</span> {formatCurrency(order.total || order.totalAmount || 0)}</div>
                      <div><span className="font-medium">{t('payment_details_paid')}</span> {formatCurrency(order.paidAmount || 0)}</div>
                      <div><span className="font-medium">{t('payment_details_due')}</span> {formatCurrency(order.remainingAmount || ((order.total || order.totalAmount || 0) - (order.paidAmount || 0)))}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentMethodDialog">{t('payment_method')}</Label>
                    <Select value={paymentMethod} onValueChange={(value: 'cash' | 'credit' | 'bank_check') => setPaymentMethod(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">{t('cash')}</SelectItem>
                        <SelectItem value="bank_check">{t('bank_check')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentAmount">{t('payment_amount')}</Label>
                    <Input
                      id="paymentAmount"
                      type="number"
                      min="0"
                      max={(order.total || order.totalAmount || 0) - (order.paidAmount || 0)}
                      step="0.01"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setPaidAmount((order.total || order.totalAmount || 0) - (order.paidAmount || 0))}
                      >
                        {t('pay_full_amount')}
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                      {t('cancel')}
                    </Button>
                    <Button 
                      onClick={handleMakePayment}
                      disabled={paidAmount <= 0 || paidAmount > (order.remainingAmount || ((order.total || order.totalAmount || 0) - (order.paidAmount || 0)))}
                    >
                      {t('record_payment')}
                    </Button>
                  </div>
                </div>
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Package className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">{t('orders_module_title')}</h3>
              <p className="text-sm text-blue-700 mt-1">
                {t('orders_module_description')}
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                <li>{t('orders_module_point_create')}</li>
                <li>{t('orders_module_point_track')}</li>
                <li>{t('orders_module_point_manage')}</li>
                <li>{t('orders_module_point_update')}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
