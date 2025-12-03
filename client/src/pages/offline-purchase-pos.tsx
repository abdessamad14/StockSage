import { useMemo, useState, useEffect } from "react";
import { useOfflineSuppliers } from "@/hooks/use-offline-suppliers";
import { useOfflineProducts } from "@/hooks/use-offline-products";
import { useOfflinePurchaseOrders } from "@/hooks/use-offline-purchase-orders";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { ThermalReceiptPrinter } from '@/lib/thermal-receipt-printer';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
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
  Settings,
  GripVertical,
  Printer,
  Clock,
  TrendingUp
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
  const { orders, createOrder, generateOrderNumber } = useOfflinePurchaseOrders();
  const { toast } = useToast();
  const { t } = useI18n();

  // State
  const [selectedSupplier, setSelectedSupplier] = useState<OfflineSupplier | null>(null);
  const [rightSidebarView, setRightSidebarView] = useState<'products' | 'orders'>('orders');
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
  const [productSearchQuery, setProductSearchQuery] = useState("");

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

  // Filter products for search (right panel)
  const filteredProducts = useMemo(() => {
    if (!productSearchQuery.trim()) return products;
    const query = productSearchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(query) ||
      (p.barcode && p.barcode.toLowerCase().includes(query))
    );
  }, [products, productSearchQuery]);

  // Filter cart items for search (left panel)
  const filteredCart = useMemo(() => {
    if (!searchQuery.trim()) return cart;
    const query = searchQuery.toLowerCase();
    return cart.filter(item => 
      item.product.name.toLowerCase().includes(query) ||
      (item.product.barcode && item.product.barcode.toLowerCase().includes(query))
    );
  }, [cart, searchQuery]);

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

  // Load purchase order into cart
  const loadPurchaseOrder = async (order: any) => {
    try {
      console.log('Loading purchase order:', order);
      
      // Set supplier
      const supplier = suppliers.find(s => s.id === order.supplierId);
      setSelectedSupplier(supplier || null);
      console.log('Supplier set:', supplier);

      // Set warehouse
      setSelectedWarehouse(order.warehouseId || "");

      // Load order items
      const orderItems = await offlinePurchaseOrderItemStorage.getByOrderId(order.id);
      console.log('Order items fetched:', orderItems);
      
      if (!orderItems || orderItems.length === 0) {
        console.warn('No order items found for order:', order.id);
        toast({
          title: t('warning'),
          description: 'Cette commande ne contient aucun article',
          variant: "destructive"
        });
        return;
      }
      
      // Convert order items to cart items
      const cartItems: PurchaseCartItem[] = [];
      for (const item of orderItems) {
        // Fix type mismatch - compare both as strings
        const product = products.find(p => String(p.id) === String(item.productId));
        console.log('Processing item:', item, 'Looking for productId:', item.productId, 'Type:', typeof item.productId);
        console.log('Product found:', product);
        console.log('Available products count:', products.length);
        if (product) {
          cartItems.push({
            product,
            quantity: item.quantity,
            unitCost: item.unitPrice,
            totalCost: item.totalPrice
          });
        } else {
          console.warn('❌ Product not found for item:', item);
          console.warn('Product IDs in list:', products.map(p => `${p.id} (${typeof p.id})`).slice(0, 5));
        }
      }
      
      console.log('Cart items created:', cartItems);
      setCart(cartItems);
      setNotes(order.notes || "");
      
      // Clear search to show all items
      setSearchQuery("");
      setProductSearchQuery("");
      
      // Don't switch tabs - stay on orders tab to see what was clicked
      // setRightSidebarView('products');
      
      toast({
        title: t('success'),
        description: `${t('order')} ${order.orderNumber} ${t('loaded')} - ${cartItems.length} article(s)`,
        duration: 2000
      });
    } catch (error) {
      console.error('Error loading purchase order:', error);
      toast({
        title: t('error'),
        description: t('failed_to_load_order'),
        variant: "destructive"
      });
    }
  };

  // Print purchase order receipt
  const printPurchaseReceipt = async (order: any) => {
    try {
      // Get supplier info
      const supplier = suppliers.find(s => s.id === order.supplierId);
      
      // Get order items
      const orderItems = await offlinePurchaseOrderItemStorage.getByOrderId(order.id);
      
      // Format items for receipt
      const items = [];
      for (const item of orderItems) {
        const product = products.find(p => String(p.id) === String(item.productId));
        if (product) {
          items.push({
            name: product.name,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice
          });
        }
      }

      const receiptData = {
        invoiceNumber: order.orderNumber,
        date: new Date(order.date),
        items: items,
        subtotal: order.total || 0,
        discount: 0,
        tax: 0,
        total: order.total || 0,
        paidAmount: order.paidAmount || 0,
        change: 0,
        customerName: supplier?.name || 'Sans fournisseur',
        paymentMethod: order.paymentMethod || 'credit'
      };

      await ThermalReceiptPrinter.printReceipt(receiptData);
      
      toast({
        title: t('success'),
        description: t('offline_sales_print_success'),
      });
    } catch (error) {
      console.error('Print error:', error);
      toast({
        title: t('offline_sales_print_error_title'),
        description: error instanceof Error ? error.message : t('offline_sales_print_error_desc'),
        variant: "destructive",
      });
    }
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
      // Create purchase order - goods received immediately
      const now = new Date();
      const orderData = {
        orderNumber: generateOrderNumber(),
        supplierId: selectedSupplier.id,
        warehouseId: selectedWarehouse,
        status: 'received', // Goods are received immediately
        notes: notes || null,
        date: now,
        orderDate: now,
        receivedDate: now.toISOString(), // Add received date as ISO string
        total: total,
        totalAmount: total,
        paymentMethod: paymentMethod,
        paymentStatus: paymentMethod === 'credit' ? 'unpaid' : paidAmount >= total ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid',
        paidAmount: paymentMethod === 'credit' ? 0 : paidAmount,
        remainingAmount: paymentMethod === 'credit' ? total : total - paidAmount,
        items: []
      };

      const newOrder = await createOrder(orderData);
      console.log('✅ Purchase order created:', newOrder);
      console.log('📦 Creating order items for orderId:', newOrder.id, 'Type:', typeof newOrder.id);

      // Create order items and update stock
      for (const item of cart) {
        const orderItemData = {
          orderId: newOrder.id,
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.unitCost,
          totalPrice: item.totalCost
        };
        console.log('Creating order item:', orderItemData);
        const createdItem = await offlinePurchaseOrderItemStorage.create(orderItemData);
        console.log('✅ Order item created:', createdItem);

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

      // Store complete order details for receipt before clearing
      setLastOrder({
        ...newOrder,
        supplier: selectedSupplier,
        items: cart.map(item => ({
          productName: item.product.name,
          quantity: item.quantity,
          unitCost: item.unitCost,
          totalCost: item.totalCost
        })),
        subtotal: subtotal,
        total: total,
        paymentMethod: paymentMethod,
        paidAmount: paidAmount
      });
      
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
    <>
      <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-gray-50 to-blue-50">
        <PanelGroup direction="horizontal">
        {/* LEFT PANEL - Purchase Order Preview (like invoice in POS) */}
        <Panel defaultSize={35} minSize={25} maxSize={50}>
          <div className="h-full bg-[#fdf5ec] border-r border-gray-200 flex flex-col shadow-lg">
            {/* Header with Supplier Dropdown */}
            <div className="p-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h1 className="text-white text-xl font-bold">{t('purchase_order_pos')}</h1>
                  <p className="text-white/80 text-sm mt-1">
                    {new Date().toLocaleString('fr-FR')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    if (cart.length === 0) {
                      toast({
                        title: t('cart_empty'),
                        description: 'Ajoutez des produits avant d\'imprimer',
                        variant: "destructive",
                      });
                      return;
                    }

                    try {
                      const items = cart.map(item => ({
                        name: item.product.name,
                        quantity: item.quantity,
                        unitPrice: item.unitCost,
                        totalPrice: item.totalCost
                      }));

                      const receiptData = {
                        invoiceNumber: 'PREVIEW-' + Date.now(),
                        date: new Date(),
                        items: items,
                        subtotal: subtotal,
                        discount: 0,
                        tax: 0,
                        total: total,
                        paidAmount: 0,
                        change: 0,
                        customerName: selectedSupplier?.name || 'Sans fournisseur',
                        paymentMethod: 'preview'
                      };

                      await ThermalReceiptPrinter.printReceipt(receiptData);
                      
                      toast({
                        title: t('success'),
                        description: t('offline_sales_print_success'),
                      });
                    } catch (error) {
                      console.error('Print error:', error);
                      toast({
                        title: t('offline_sales_print_error_title'),
                        description: error instanceof Error ? error.message : t('offline_sales_print_error_desc'),
                        variant: "destructive",
                      });
                    }
                  }}
                  className="text-white hover:bg-white/20"
                >
                  <Printer className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Supplier Dropdown */}
              <div>
                <label className="text-white/80 text-xs mb-1 block">{t('supplier')}:</label>
                <Select 
                  value={selectedSupplier?.id || "none"}
                  onValueChange={(value) => {
                    if (value === "none") {
                      setSelectedSupplier(null);
                    } else {
                      const supplier = suppliers.find(s => s.id === value);
                      setSelectedSupplier(supplier || null);
                    }
                  }}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder={t('select_supplier')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('no_supplier')}</SelectItem>
                    {suppliers.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

        {/* Search */}
        <div className="p-4 bg-white border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder={t('search_products_or_scan')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
                {filteredCart.map(item => (
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
                {filteredCart.length < 5 && Array.from({ length: 5 - filteredCart.length }).map((_, index) => (
                  <tr key={`empty-${index}`} className="border-b">
                    <td className="py-3 text-xs text-gray-300">-</td>
                    <td className="py-3"></td>
                    <td className="py-3"></td>
                    <td className="py-3"></td>
                    <td className="py-3"></td>
                  </tr>
                ))}
                {/* No results message */}
                {filteredCart.length === 0 && cart.length > 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center">
                      <Search className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p className="text-gray-400 text-sm">{t('no_results_found')}</p>
                    </td>
                  </tr>
                )}
                {/* Empty cart message */}
                {cart.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center">
                      <Package className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                      <p className="text-gray-400 text-sm">{t('add_products_to_start')}</p>
                    </td>
                  </tr>
                )}
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
        </Panel>

        {/* RESIZER */}
        <PanelResizeHandle className="w-2 bg-gray-300 hover:bg-blue-500 transition-colors flex items-center justify-center group">
          <div className="w-1 h-8 bg-gray-400 rounded group-hover:bg-white transition-colors"></div>
        </PanelResizeHandle>

        {/* RIGHT PANEL - Products and Orders */}
        <Panel defaultSize={65} minSize={50}>
          <div className="h-full flex flex-col">
            {/* Tab Buttons */}
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
                  onClick={() => setRightSidebarView('orders')}
                  className={`h-16 font-bold text-sm flex flex-col items-center justify-center gap-1 ${
                    rightSidebarView === 'orders'
                      ? 'bg-gradient-to-br from-[#06d6a0] via-[#1b998b] to-[#118ab2] text-white'
                      : 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-700'
                  }`}
                >
                  <Clock className="h-5 w-5" />
                  {t('orders').toUpperCase()}
                </Button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {rightSidebarView === 'products' ? (
            <>
              {/* Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    placeholder={t('search_products_or_scan')}
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                    className="pl-10 text-lg py-6"
                  />
                </div>
              </div>
              
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
            </>
          ) : (
            /* Purchase Orders View with Summaries */
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-xl shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-80">{t('total_orders')}</p>
                      <h3 className="text-3xl font-bold">{orders?.length || 0}</h3>
                    </div>
                    <Package className="h-12 w-12 opacity-50" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-xl shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-80">{t('total_value')}</p>
                      <h3 className="text-3xl font-bold">
                        {orders?.reduce((sum: number, o: any) => sum + (o.total || 0), 0).toFixed(2) || '0.00'} DH
                      </h3>
                    </div>
                    <TrendingUp className="h-12 w-12 opacity-50" />
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-xl shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm opacity-80">{t('pending')}</p>
                      <h3 className="text-3xl font-bold">
                        {orders?.filter((o: any) => o.status === 'draft' || o.status === 'pending').length || 0}
                      </h3>
                    </div>
                    <Clock className="h-12 w-12 opacity-50" />
                  </div>
                </div>
              </div>

              {/* Recent Orders List */}
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <h3 className="font-bold text-lg mb-4">{t('recent_orders')}</h3>
                <div className="space-y-2">
                  {orders && orders.length > 0 ? (
                    orders.slice(0, 10).map((order: any) => {
                      const supplier = suppliers.find(s => s.id === order.supplierId);
                      return (
                        <div 
                          key={order.id} 
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div 
                            onClick={() => loadPurchaseOrder(order)}
                            className="flex items-center gap-3 flex-1 cursor-pointer"
                          >
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Truck className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-semibold text-sm">{order.orderNumber}</div>
                              <div className="text-xs text-gray-600">
                                {supplier?.name || t('no_supplier')} • {new Date(order.date).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="font-bold text-sm">{order.total?.toFixed(2)} DH</div>
                              <div className={`text-xs px-2 py-1 rounded ${
                                order.status === 'received' ? 'bg-green-100 text-green-700' :
                                order.status === 'ordered' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {order.status}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                printPurchaseReceipt(order);
                              }}
                              className="h-8 w-8 p-0"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <Package className="h-12 w-12 mx-auto mb-2" />
                      <p>{t('no_orders_created')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
          </div>
        </Panel>
      </PanelGroup>
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
                <p className="text-sm">{lastOrder.supplier?.name || t('no_supplier')}</p>
              </div>

              <div>
                <h4 className="font-medium mb-2">{t('items')}:</h4>
                {lastOrder.items && lastOrder.items.length > 0 ? (
                  lastOrder.items.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm mb-1">
                      <span>{item.productName} x{item.quantity}</span>
                      <span>{item.totalCost.toFixed(2)} DH</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-400">{t('no_items')}</p>
                )}
              </div>
              
              <Separator />
              
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>{t('subtotal')}:</span>
                  <span>{(lastOrder.subtotal || 0).toFixed(2)} DH</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>{t('total')}:</span>
                  <span>{(lastOrder.total || 0).toFixed(2)} DH</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('payment_method')}:</span>
                  <span>{lastOrder.paymentMethod || 'credit'}</span>
                </div>
                {lastOrder.paymentMethod !== 'credit' && (
                  <>
                    <div className="flex justify-between">
                      <span>{t('paid')}:</span>
                      <span>{(lastOrder.paidAmount || 0).toFixed(2)} DH</span>
                    </div>
                    {lastOrder.paidAmount < lastOrder.total && (
                      <div className="flex justify-between text-red-600">
                        <span>{t('remaining')}:</span>
                        <span>{(lastOrder.total - lastOrder.paidAmount).toFixed(2)} DH</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                if (lastOrder) {
                  await printPurchaseReceipt(lastOrder);
                }
              }}
              disabled={!lastOrder}
            >
              <Printer className="h-4 w-4 mr-2" />
              {t('print_receipt')}
            </Button>
            <Button onClick={() => setIsReceiptOpen(false)}>
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
