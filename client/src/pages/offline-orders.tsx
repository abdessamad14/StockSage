import { useState, useEffect } from "react";
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
        <h3 className="font-semibold mb-4">Order Items</h3>
        <div className="text-sm text-gray-600">Loading order items...</div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="font-semibold mb-4">Order Items</h3>
      {items.length === 0 ? (
        <div className="text-sm text-gray-600">No items found for this order.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Unit Cost</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Received</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(item => {
              const product = products.find(p => p.id === item.productId);
              return (
                <TableRow key={item.id}>
                  <TableCell>{product?.name || 'Unknown Product'}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>${(item.unitCost || item.unitPrice || 0).toFixed(2)}</TableCell>
                  <TableCell>${(item.totalCost || item.totalPrice || 0).toFixed(2)}</TableCell>
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
        title: "Success",
        description: "Purchase order created successfully"
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
      toast({
        title: "Error",
        description: `Failed to create purchase order: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
          reason: 'Purchase Order Received',
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
        title: "Success",
        description: "Order received and stock updated"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to receive order",
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
          title: "Success",
          description: "Order deleted successfully"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to delete order",
          variant: "destructive"
        });
      }
      setDeletingOrderId(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete order",
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
          title: "Error",
          description: "Failed to update payment information",
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
          notes: `Payment for order ${order.orderNumber}`
        });
      }

      toast({
        title: "Success",
        description: `Payment of $${(newPaidAmount - (order.paidAmount || 0)).toFixed(2)} recorded`
      });

      setShowPaymentDialog(false);
      setPaymentOrderId(null);
      setPaidAmount(0);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record payment",
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
        <h1 className="text-3xl font-bold">Purchase Orders</h1>
        <Dialog open={isCreateOrderOpen} onOpenChange={setIsCreateOrderOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Purchase Order</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Supplier and Warehouse Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier *</Label>
                  <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
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
                  <Label htmlFor="warehouse">Warehouse *</Label>
                  <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {stockLocations.map((location: any) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name} {location.isPrimary && '(Primary)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Product Selection */}
              <div className="space-y-4">
                <Label>Products</Label>
                <div className="border rounded-lg p-4 space-y-4">
                  {orderProducts.map((orderProduct, index) => (
                    <div key={index} className="grid grid-cols-4 gap-4 items-end">
                      <div className="space-y-2">
                        <Label>Product</Label>
                        <Select 
                          value={orderProduct.productId} 
                          onValueChange={(value) => {
                            const newProducts = [...orderProducts];
                            newProducts[index].productId = value;
                            setOrderProducts(newProducts);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select product" />
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
                        <Label>Quantity</Label>
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
                        <Label>Unit Cost</Label>
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
                    Add Product
                  </Button>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Order notes (optional)"
                  rows={3}
                />
              </div>

              {/* Payment Information */}
              <div className="space-y-4 border-t pt-4">
                <h4 className="font-semibold">Payment Information</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={(value: 'cash' | 'credit' | 'bank_check') => setPaymentMethod(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="credit">Credit (Pay Later)</SelectItem>
                        <SelectItem value="bank_check">Bank Check</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {paymentMethod !== 'credit' && (
                    <div className="space-y-2">
                      <Label htmlFor="paidAmount">Amount Paid</Label>
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
                  <h4 className="font-semibold mb-2">Order Summary</h4>
                  <div className="space-y-2">
                    {orderProducts.map((orderProduct, index) => {
                      const product = products.find(p => p.id === orderProduct.productId);
                      const total = orderProduct.quantity * orderProduct.unitCost;
                      return product ? (
                        <div key={index} className="flex justify-between text-sm">
                          <span>{product.name} × {orderProduct.quantity}</span>
                          <span>${total.toFixed(2)}</span>
                        </div>
                      ) : null;
                    })}
                    <div className="border-t pt-2 font-semibold flex justify-between">
                      <span>Total:</span>
                      <span>${orderProducts.reduce((sum, op) => sum + (op.quantity * op.unitCost), 0).toFixed(2)}</span>
                    </div>
                    {paymentMethod !== 'credit' && paidAmount > 0 && (
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between text-green-600">
                          <span>Paid Amount:</span>
                          <span>${paidAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-orange-600">
                          <span>Remaining:</span>
                          <span>${(orderProducts.reduce((sum, op) => sum + (op.quantity * op.unitCost), 0) - paidAmount).toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateOrderOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateOrder}
                  disabled={!selectedSupplier || !selectedWarehouse || orderProducts.length === 0 || orderProducts.some(op => !op.productId || op.quantity <= 0)}
                >
                  Create Order
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
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
            <p className="text-xs text-muted-foreground">
              {orders.length === 0 ? 'No orders created yet' : `${orders.filter(o => o.status === 'pending' || o.status === 'ordered').length} active orders`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Suppliers</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliers.length}</div>
            <p className="text-xs text-muted-foreground">
              Available suppliers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground">
              Available products
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search orders..."
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
                <TableHead>Order #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-20">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                    <p className="text-gray-600">
                      Create your first purchase order to get started
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                orders
                  .filter(order => 
                    order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    suppliers.find(s => s.id === order.supplierId)?.name.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map(order => {
                    const supplier = suppliers.find(s => s.id === order.supplierId);
                    const warehouse = stockLocations.find((w: any) => w.id === order.warehouseId);
                    console.log('Rendering order:', order.orderNumber, 'paymentStatus:', order.paymentStatus, 'paidAmount:', order.paidAmount);
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                        <TableCell>{supplier?.name || 'Unknown Supplier'}</TableCell>
                        <TableCell>{order.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge 
                              variant={order.status === 'received' ? 'default' : 
                                     order.status === 'ordered' ? 'secondary' : 
                                     order.status === 'cancelled' ? 'destructive' : 'outline'}
                            >
                              {order.status}
                            </Badge>
                            <Badge 
                              variant={(order.paymentStatus || 'unpaid') === 'paid' ? 'default' : 
                                     (order.paymentStatus || 'unpaid') === 'partial' ? 'secondary' : 'destructive'}
                              className="text-xs"
                            >
                              {(order.paymentStatus || 'unpaid') === 'paid' ? 'Paid' : 
                               (order.paymentStatus || 'unpaid') === 'partial' ? 'Partial' : 'Unpaid'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="space-y-1">
                            <div>${(order.total || order.totalAmount || 0).toFixed(2)}</div>
                            {(order.paymentStatus || 'unpaid') !== 'unpaid' && (
                              <div className="text-xs text-green-600">
                                Paid: ${(order.paidAmount || 0).toFixed(2)}
                              </div>
                            )}
                            {(order.remainingAmount || 0) > 0 && (
                              <div className="text-xs text-orange-600">
                                Due: ${(order.remainingAmount || 0).toFixed(2)}
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
                                title="Mark as Ordered"
                              >
                                <Package className="w-4 h-4" />
                              </Button>
                            ) : order.status === 'ordered' ? (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleReceiveOrder(order.id)}
                                title="Receive Order"
                              >
                                <Truck className="w-4 h-4" />
                              </Button>
                            ) : null}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              title="View Details"
                              onClick={() => handleViewOrder(order.id)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {(order.paymentStatus || 'unpaid') !== 'paid' && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                title="Make Payment"
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
                                  title="Delete Order"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Order</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete order {order.orderNumber}? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteOrder(order.id)}>
                                    Delete
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
            
            if (!order) return <div>Order not found</div>;
            
            return (
              <div className="space-y-6">
                {/* Order Header */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold">Order Information</h3>
                    <div className="space-y-2 mt-2">
                      <div><span className="text-gray-600">Order #:</span> {order.orderNumber}</div>
                      <div><span className="text-gray-600">Status:</span> 
                        <Badge className="ml-2" variant={order.status === 'received' ? 'default' : 
                                                       order.status === 'ordered' ? 'secondary' : 
                                                       order.status === 'cancelled' ? 'destructive' : 'outline'}>
                          {order.status}
                        </Badge>
                      </div>
                      <div><span className="text-gray-600">Order Date:</span> {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : 'N/A'}</div>
                      {order.receivedDate && (
                        <div><span className="text-gray-600">Received Date:</span> {order.receivedDate ? new Date(order.receivedDate).toLocaleDateString() : 'N/A'}</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold">Supplier & Warehouse</h3>
                    <div className="space-y-2 mt-2">
                      <div><span className="text-gray-600">Supplier:</span> {supplier?.name || 'Unknown'}</div>
                      <div><span className="text-gray-600">Warehouse:</span> {warehouse?.name || 'Unknown'}</div>
                      {order.notes && (
                        <div><span className="text-gray-600">Notes:</span> {order.notes}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <OrderItemsDisplay orderId={viewingOrderId} products={products} />

                {/* Order Summary */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total Amount:</span>
                    <span className="text-xl font-bold">${(order.total || order.totalAmount || 0).toFixed(2)}</span>
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
            <DialogTitle>Make Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {(() => {
              const order = orders.find(o => o.id === paymentOrderId);
              if (!order) return null;
              
              return (
                <div className="space-y-4">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm space-y-1">
                      <div><span className="font-medium">Order:</span> {order.orderNumber}</div>
                      <div><span className="font-medium">Total:</span> ${(order.total || order.totalAmount || 0).toFixed(2)}</div>
                      <div><span className="font-medium">Paid:</span> ${(order.paidAmount || 0).toFixed(2)}</div>
                      <div><span className="font-medium">Due:</span> ${(order.remainingAmount || ((order.total || order.totalAmount || 0) - (order.paidAmount || 0))).toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentMethodDialog">Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={(value: 'cash' | 'credit' | 'bank_check') => setPaymentMethod(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank_check">Bank Check</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentAmount">Payment Amount</Label>
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
                        Pay Full Amount
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleMakePayment}
                      disabled={paidAmount <= 0 || paidAmount > (order.remainingAmount || ((order.total || order.totalAmount || 0) - (order.paidAmount || 0)))}
                    >
                      Record Payment
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
              <h3 className="font-semibold text-blue-900">Orders Module</h3>
              <p className="text-sm text-blue-700 mt-1">
                This is a simplified offline orders page. In a full implementation, you would be able to:
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                <li>Create purchase orders for suppliers</li>
                <li>Track order status and delivery</li>
                <li>Manage order items and quantities</li>
                <li>Update inventory when orders are received</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
