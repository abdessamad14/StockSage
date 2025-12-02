import { useMemo, useState, useEffect } from "react";
import { useOfflineSuppliers } from "@/hooks/use-offline-suppliers";
import { useOfflineProducts } from "@/hooks/use-offline-products";
import { useOfflinePurchaseOrders } from "@/hooks/use-offline-purchase-orders";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { 
  OfflineSupplier, 
  OfflineProduct,
  offlineProductStockStorage,
  offlineStockLocationStorage,
  offlinePurchaseOrderItemStorage,
  offlineSupplierPaymentStorage
} from "@/lib/offline-storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { 
  Search,
  ShoppingCart,
  Trash2,
  Package,
  Truck,
  DollarSign,
  CreditCard,
  Plus,
  Minus,
  User,
  MapPin,
  BarChart3,
  Settings
} from "lucide-react";

interface PurchaseCartItem {
  product: OfflineProduct;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export default function OfflinePurchasePOS() {
  const { suppliers, loading: suppliersLoading } = useOfflineSuppliers();
  const { products, loading: productsLoading } = useOfflineProducts();
  const { createOrder, generateOrderNumber } = useOfflinePurchaseOrders();
  const { toast } = useToast();
  const { t } = useI18n();

  // State
  const [selectedSupplier, setSelectedSupplier] = useState<OfflineSupplier | null>(null);
  const [rightSidebarView, setRightSidebarView] = useState<'products' | 'suppliers'>('products');
  const [cart, setCart] = useState<PurchaseCartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit' | 'bank_check'>('credit');
  const [paidAmount, setPaidAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState<any>(null);
  const [stockLocations, setStockLocations] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");

  // Load stock locations
  useEffect(() => {
    const loadLocations = async () => {
      try {
        const locations = await offlineStockLocationStorage.getAll();
        setStockLocations(locations || []);
        if (locations && locations.length > 0) {
          setSelectedWarehouse(locations[0].id);
        }
      } catch (error) {
        console.error('Error loading locations:', error);
      }
    };
    loadLocations();
  }, []);

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.totalCost, 0);
  const tax = 0;
  const total = subtotal + tax;

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(query) ||
      (p.barcode && p.barcode.toLowerCase().includes(query))
    );
  }, [products, searchQuery]);

  // Add product to cart
  const addToCart = (product: OfflineProduct) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1, totalCost: (item.quantity + 1) * item.unitCost }
          : item
      ));
    } else {
      const unitCost = product.costPrice || 0;
      setCart([...cart, {
        product,
        quantity: 1,
        unitCost,
        totalCost: unitCost
      }]);
    }

    toast({
      title: t('product_added'),
      description: `${product.name} ${t('added_to_cart')}`,
      duration: 1000
    });
  };

  // Update cart item quantity
  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(cart.map(item =>
      item.product.id === productId
        ? { ...item, quantity: newQuantity, totalCost: newQuantity * item.unitCost }
        : item
    ));
  };

  // Update cart item cost
  const updateUnitCost = (productId: string, newCost: number) => {
    setCart(cart.map(item =>
      item.product.id === productId
        ? { ...item, unitCost: newCost, totalCost: item.quantity * newCost }
        : item
    ));
  };

  // Remove from cart
  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
    setSelectedSupplier(null);
    setNotes("");
    setPaidAmount(0);
  };

  // Process purchase order
  const processPurchase = async () => {
    if (cart.length === 0) {
      toast({
        title: t('error'),
        description: t('cart_empty'),
        variant: "destructive"
      });
      return;
    }

    if (!selectedSupplier) {
      toast({
        title: t('error'),
        description: t('please_select_supplier'),
        variant: "destructive"
      });
      return;
    }

    if (!selectedWarehouse) {
      toast({
        title: t('error'),
        description: t('please_select_warehouse'),
        variant: "destructive"
      });
      return;
    }

    try {
      // Create purchase order
      const orderData = {
        orderNumber: generateOrderNumber(),
        supplierId: selectedSupplier.id,
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

      const newOrder = await createOrder(orderData);

      // Create order items and update stock
      for (const item of cart) {
        await offlinePurchaseOrderItemStorage.create({
          orderId: newOrder.id,
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.unitCost,
          totalPrice: item.totalCost
        });

        // UPDATE STOCK - INCREASE quantity for purchases
        const currentStock = await offlineProductStockStorage.getByProductAndLocation(
          item.product.id,
          selectedWarehouse
        );
        const previousQuantity = currentStock?.quantity || 0;
        const newQuantity = previousQuantity + item.quantity;

        await offlineProductStockStorage.upsert({
          productId: item.product.id,
          locationId: selectedWarehouse,
          quantity: newQuantity,
          minStockLevel: currentStock?.minStockLevel || 0
        });

        console.log(`✅ Stock increased for ${item.product.name}: ${previousQuantity} → ${newQuantity} (+${item.quantity})`);
      }

      // Handle payment if not credit
      if (paymentMethod !== 'credit' && paidAmount > 0) {
        await offlineSupplierPaymentStorage.create({
          supplierId: selectedSupplier.id,
          amount: paidAmount,
          paymentMethod: paymentMethod,
          reference: newOrder.orderNumber,
          notes: `Payment for order ${newOrder.orderNumber}`
        });
      }

      toast({
        title: t('success'),
        description: t('purchase_order_created')
      });

      setLastOrder(newOrder);
      setIsCheckoutOpen(false);
      setIsReceiptOpen(true);
      clearCart();

    } catch (error) {
      console.error('Purchase order error:', error);
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : t('purchase_order_failed'),
        variant: "destructive"
      });
    }
  };

  const loading = productsLoading || suppliersLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Package className="h-16 w-16 mx-auto mb-4 text-blue-600 animate-pulse" />
          <p className="text-lg text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
      {/* LEFT PANEL - Purchase Order Preview (like invoice in POS) */}
      <div className="w-[500px] bg-[#fdf5ec] border-r border-gray-200 flex flex-col shadow-lg">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-white text-xl font-bold">{t('purchase_order_pos')}</h1>
              <p className="text-white/80 text-sm mt-1">
                {new Date().toLocaleString('fr-FR')}
              </p>
            </div>
            <div className="text-white text-right">
              <div className="text-sm">{t('supplier')}:</div>
              <div className="font-semibold">{selectedSupplier ? selectedSupplier.name : t('no_supplier')}</div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 bg-white border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder={t('search_products_or_scan')}
              className="pl-10"
            />
          </div>
        </div>

        {/* Order Items Table (like invoice table) */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="bg-white/90 rounded-lg shadow-sm border border-gray-200 p-4">
            <table className="w-full">
              <thead>
                <tr className="border-b text-xs text-gray-600">
                  <th className="text-left py-2">{t('product').toUpperCase()}</th>
                  <th className="text-center py-2">{t('quantity').toUpperCase()}</th>
                  <th className="text-right py-2">{t('unit_cost').toUpperCase()}</th>
                  <th className="text-right py-2">{t('total').toUpperCase()}</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {cart.map(item => (
                  <tr key={item.product.id} className="border-b">
                    <td className="py-3">
                      <div className="font-medium text-sm">{item.product.name}</div>
                      <div className="text-xs text-gray-500">{item.product.barcode}</div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="h-7 w-7 p-0"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.product.id, parseFloat(e.target.value) || 0)}
                          className="w-16 h-7 text-center text-sm"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="h-7 w-7 p-0"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                    <td className="py-3">
                      <Input
                        type="number"
                        value={item.unitCost}
                        onChange={(e) => updateUnitCost(item.product.id, parseFloat(e.target.value) || 0)}
                        className="w-24 h-7 text-right text-sm"
                        step="0.01"
                      />
                    </td>
                    <td className="py-3 text-right font-semibold text-sm">
                      {item.totalCost.toFixed(2)} DH
                    </td>
                    <td className="py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {/* Empty rows to fill space */}
                {cart.length < 5 && Array.from({ length: 5 - cart.length }).map((_, index) => (
                  <tr key={`empty-${index}`} className="border-b">
                    <td className="py-3 text-xs text-gray-300">-</td>
                    <td className="py-3"></td>
                    <td className="py-3"></td>
                    <td className="py-3"></td>
                    <td className="py-3"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Footer */}
        <div className="border-t p-4 bg-white space-y-2">
          <div className="flex justify-between text-sm">
            <span>{t('subtotal')}:</span>
            <span className="font-semibold">{subtotal.toFixed(2)} DH</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>{t('tax')}:</span>
            <span className="font-semibold">{tax.toFixed(2)} DH</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>{t('total').toUpperCase()}:</span>
            <span className="text-green-600">{total.toFixed(2)} DH</span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <Button
              onClick={() => setIsCheckoutOpen(true)}
              disabled={cart.length === 0 || !selectedSupplier}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-6 text-lg"
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              {t('proceed_to_checkout')}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={clearCart}
                variant="outline"
                disabled={cart.length === 0}
              >
                {t('clear_cart')}
              </Button>
              <Button
                onClick={() => window.location.href = '/orders-history'}
                variant="outline"
              >
                {t('orders')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Products and Suppliers */}
      <div className="flex-1 flex flex-col">
        {/* Function Buttons (like POS) */}
        <div className="bg-white border-b p-4">
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => setRightSidebarView('products')}
              className={`h-16 font-bold text-sm flex flex-col items-center justify-center gap-1 ${
                rightSidebarView === 'products'
                  ? 'bg-gradient-to-br from-[#06d6a0] via-[#1b998b] to-[#118ab2] text-white'
                  : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700'
              }`}
            >
              <Package className="h-5 w-5" />
              {t('products').toUpperCase()}
            </Button>
            <Button
              onClick={() => setRightSidebarView('suppliers')}
              className={`h-16 font-bold text-sm flex flex-col items-center justify-center gap-1 ${
                rightSidebarView === 'suppliers'
                  ? 'bg-gradient-to-br from-[#06d6a0] via-[#1b998b] to-[#118ab2] text-white'
                  : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700'
              }`}
            >
              <Truck className="h-5 w-5" />
              {t('suppliers').toUpperCase()}
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {rightSidebarView === 'products' ? (
            <div className="grid grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 pb-8">
              {filteredProducts.map((product, index) => {
                const colors = [
                  'bg-gradient-to-br from-[#f94144] via-[#f3722c] to-[#f8961e]',
                  'bg-gradient-to-br from-[#06d6a0] via-[#1b998b] to-[#118ab2]',
                  'bg-gradient-to-br from-[#3a86ff] via-[#4361ee] to-[#7209b7]',
                  'bg-gradient-to-br from-[#ffbe0b] via-[#fb8500] to-[#ff6d00]',
                  'bg-gradient-to-br from-[#ef233c] via-[#d00000] to-[#9d0208]',
                  'bg-gradient-to-br from-[#8338ec] via-[#9d4edd] to-[#7209b7]',
                  'bg-gradient-to-br from-[#118ab2] via-[#06d6a0] to-[#4cc9f0]',
                  'bg-gradient-to-br from-[#f4a259] via-[#f77f00] to-[#e85d04]'
                ];
                const bgColor = colors[index % colors.length];

                return (
                  <div
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className={`${bgColor} text-white rounded-xl p-4 cursor-pointer hover:shadow-xl transform hover:scale-105 transition-all duration-200 active:scale-95 relative overflow-hidden border border-white/20`}
                  >
                    <div className="text-center">
                      {product.image ? (
                        <div className="mb-2">
                          <img 
                            src={product.image} 
                            alt={product.name}
                            className="w-full h-16 object-cover rounded-lg mx-auto"
                          />
                        </div>
                      ) : (
                        <div className="text-3xl mb-2">📦</div>
                      )}
                      <h3 className="font-bold text-sm mb-1 line-clamp-2">
                        {product.name}
                      </h3>
                      <div className="bg-white bg-opacity-20 rounded-lg py-1 px-2 mt-2">
                        <div className="font-bold text-sm">
                          {t('cost')}: {(product.costPrice || 0).toFixed(2)} DH
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Suppliers View */
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div
                onClick={() => setSelectedSupplier(null)}
                className={`p-4 rounded-xl cursor-pointer transition-all border-2 ${
                  !selectedSupplier
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-700 shadow-lg'
                    : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'
                }`}
              >
                <div className="flex flex-col items-center text-center gap-2">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                    !selectedSupplier ? 'bg-white/20' : 'bg-gray-100'
                  }`}>
                    <User className="h-8 w-8" />
                  </div>
                  <div>
                    <div className="font-semibold">{t('no_supplier')}</div>
                    <div className={`text-sm ${!selectedSupplier ? 'text-white/80' : 'text-gray-600'}`}>
                      {t('general_purchase')}
                    </div>
                  </div>
                </div>
              </div>

              {suppliers.map(supplier => (
                <div
                  key={supplier.id}
                  onClick={() => setSelectedSupplier(supplier)}
                  className={`p-4 rounded-xl cursor-pointer transition-all border-2 ${
                    selectedSupplier?.id === supplier.id
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-700 shadow-lg'
                      : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                      selectedSupplier?.id === supplier.id ? 'bg-white/20' : 'bg-blue-100'
                    }`}>
                      <Truck className="h-8 w-8" />
                    </div>
                    <div>
                      <div className="font-semibold">{supplier.name}</div>
                      {supplier.phone && (
                        <div className={`text-sm ${selectedSupplier?.id === supplier.id ? 'text-white/80' : 'text-gray-600'}`}>
                          {supplier.phone}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('checkout_purchase_order')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('supplier')}</label>
              <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                <div className="font-semibold">{selectedSupplier?.name || t('no_supplier')}</div>
                {selectedSupplier?.phone && (
                  <div className="text-sm text-gray-600">{selectedSupplier.phone}</div>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">{t('warehouse')}</label>
              <select
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="mt-1 w-full p-2 border rounded-lg"
              >
                <option value="">{t('select_warehouse')}</option>
                {stockLocations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">{t('payment_method')}</label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <Button
                  variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('cash')}
                  className="flex-col h-auto py-4"
                >
                  <DollarSign className="h-6 w-6 mb-2" />
                  <span>{t('cash')}</span>
                </Button>
                <Button
                  variant={paymentMethod === 'credit' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('credit')}
                  className="flex-col h-auto py-4"
                >
                  <CreditCard className="h-6 w-6 mb-2" />
                  <span>{t('credit')}</span>
                </Button>
                <Button
                  variant={paymentMethod === 'bank_check' ? 'default' : 'outline'}
                  onClick={() => setPaymentMethod('bank_check')}
                  className="flex-col h-auto py-4"
                >
                  <Package className="h-6 w-6 mb-2" />
                  <span>{t('check')}</span>
                </Button>
              </div>
            </div>

            {paymentMethod !== 'credit' && (
              <div>
                <label className="text-sm font-medium">{t('amount_paid')}</label>
                <Input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                  className="mt-1"
                  step="0.01"
                />
                {paidAmount < total && (
                  <div className="text-sm text-amber-600 mt-1">
                    {t('remaining')}: {(total - paidAmount).toFixed(2)} DH
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-sm font-medium">{t('notes')}</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 w-full p-2 border rounded-lg"
                rows={3}
                placeholder={t('add_notes_optional')}
              />
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between text-lg font-bold mb-4">
                <span>{t('total_to_pay')}:</span>
                <span className="text-green-600">{total.toFixed(2)} DH</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={processPurchase} className="bg-green-600 hover:bg-green-700">
              {t('confirm_purchase')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('purchase_order_receipt')}</DialogTitle>
          </DialogHeader>
          {lastOrder && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-bold">igoodar POS</h3>
                <p className="text-sm text-gray-500">{t('purchase_order')} #{lastOrder.orderNumber}</p>
                <p className="text-sm text-gray-500">{new Date(lastOrder.date).toLocaleString()}</p>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-2">{t('supplier')}:</h4>
                <p className="text-sm">{selectedSupplier?.name || t('no_supplier')}</p>
              </div>

              <div>
                <h4 className="font-medium mb-2">{t('items')}:</h4>
                {cart.map(item => (
                  <div key={item.product.id} className="flex justify-between text-sm mb-1">
                    <span>{item.product.name} x{item.quantity}</span>
                    <span>{item.totalCost.toFixed(2)} DH</span>
                  </div>
                ))}
              </div>
              
              <Separator />
              
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>{t('subtotal')}:</span>
                  <span>{subtotal.toFixed(2)} DH</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>{t('total')}:</span>
                  <span>{total.toFixed(2)} DH</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('payment_method')}:</span>
                  <span>{paymentMethod}</span>
                </div>
                {paymentMethod !== 'credit' && (
                  <>
                    <div className="flex justify-between">
                      <span>{t('paid')}:</span>
                      <span>{paidAmount.toFixed(2)} DH</span>
                    </div>
                    {paidAmount < total && (
                      <div className="flex justify-between text-red-600">
                        <span>{t('remaining')}:</span>
                        <span>{(total - paidAmount).toFixed(2)} DH</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsReceiptOpen(false)}>
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
