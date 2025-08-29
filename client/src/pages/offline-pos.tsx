import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ThermalReceiptPrinter, ReceiptData } from '@/lib/thermal-receipt-printer';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Search, 
  DollarSign,
  Receipt,
  User,
  Package,
  Printer
} from 'lucide-react';

// Import offline storage and types
import {
  OfflineProduct,
  OfflineCustomer,
  OfflineSale,
  OfflineSaleItem,
  OfflineCategory,
  OfflineStockLocation,
  OfflineSalesPeriod,
  databaseProductStorage,
  offlineCategoryStorage,
  databaseCustomerStorage,
  databaseSalesStorage,
  offlineStockLocationStorage,
  salesPeriodHelpers
} from '@/lib/database-storage';

interface CartItem {
  product: OfflineProduct;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export default function OfflinePOS() {
  const { toast } = useToast();
  
  // State variables
  const [products, setProducts] = useState<OfflineProduct[]>([]);
  const [customers, setCustomers] = useState<OfflineCustomer[]>([]);
  const [categories, setCategories] = useState<OfflineCategory[]>([]);
  const [stockLocations, setStockLocations] = useState<OfflineStockLocation[]>([]);
  const [currentSalesPeriod, setCurrentSalesPeriod] = useState<OfflineSalesPeriod | null>(null);
  const [salesPeriodStats, setSalesPeriodStats] = useState({
    totalSales: 0,
    totalTransactions: 0,
    averageTransaction: 0
  });
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<OfflineCustomer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'credit'>('cash');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [paidAmount, setPaidAmount] = useState(0);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastSale, setLastSale] = useState<OfflineSale | null>(null);
  const [loading, setLoading] = useState(true);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [productsData, customersData, categoriesData, stockLocationsData] = await Promise.all([
          databaseProductStorage.getAll(),
          databaseCustomerStorage.getAll(),
          offlineCategoryStorage.getAll(),
          offlineStockLocationStorage.getAll()
        ]);
        
        setProducts(productsData);
        setCustomers(customersData);
        setCategories(categoriesData);
        setStockLocations(stockLocationsData);
        
        // Load sales period data
        await loadSalesPeriodData();
        
        setLoading(false);
      } catch (error) {
        console.error('Error loading POS data:', error);
        toast({
          title: "Error",
          description: "Failed to load POS data",
          variant: "destructive",
        });
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Load sales period data
  const loadSalesPeriodData = async () => {
    try {
      const period = await salesPeriodHelpers.getCurrentPeriod();
      setCurrentSalesPeriod(period);
      
      if (period) {
        const todaysData = await salesPeriodHelpers.getTodaysSalesData();
        setSalesPeriodStats({
          totalSales: todaysData.totalSales,
          totalTransactions: todaysData.totalTransactions,
          averageTransaction: todaysData.totalTransactions > 0 ? todaysData.totalSales / todaysData.totalTransactions : 0
        });
      }
    } catch (error) {
      console.error('Error loading sales period data:', error);
    }
  };

  // Get primary warehouse
  const primaryWarehouse = stockLocations.find(loc => loc.isPrimary) || stockLocations[0];

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.barcode?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Cart functions
  const addToCart = (product: OfflineProduct) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.unitPrice }
          : item
      ));
    } else {
      const newItem: CartItem = {
        product,
        quantity: 1,
        unitPrice: product.sellingPrice || 0,
        totalPrice: product.sellingPrice || 0
      };
      setCart([...cart, newItem]);
    }
  };

  const updateCartItemQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCart(cart.map(item =>
      item.product.id === productId
        ? { ...item, quantity, totalPrice: quantity * item.unitPrice }
        : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setPaidAmount(0);
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax;
  const change = paidAmount - total;

  // Print thermal receipt
  const printThermalReceipt = async () => {
    if (!lastSale) return;

    try {
      const receiptData: ReceiptData = {
        invoiceNumber: lastSale.invoiceNumber,
        date: new Date(lastSale.date),
        customerName: selectedCustomer?.name,
        items: lastSale.items.map(item => ({
          name: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        })),
        subtotal: lastSale.totalAmount - (lastSale.taxAmount || 0),
        discountAmount: lastSale.discountAmount,
        taxAmount: lastSale.taxAmount,
        total: lastSale.totalAmount,
        paidAmount: lastSale.paidAmount,
        changeAmount: lastSale.changeAmount,
        paymentMethod: lastSale.paymentMethod
      };

      await ThermalReceiptPrinter.printReceipt(receiptData);
      
      toast({
        title: "Success",
        description: "Receipt printed successfully",
      });
    } catch (error) {
      console.error('Print error:', error);
      toast({
        title: "Print Error",
        description: error instanceof Error ? error.message : "Failed to print receipt",
        variant: "destructive",
      });
    }
  };

  // Process sale
  const processSale = async () => {
    if (cart.length === 0) {
      toast({
        title: "Error",
        description: "Cart is empty",
        variant: "destructive",
      });
      return;
    }

    if (paymentMethod === 'cash' && paidAmount < total) {
      toast({
        title: "Error",
        description: "Insufficient payment amount",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create sale items
      const saleItems: OfflineSaleItem[] = cart.map(item => ({
        id: `item-${Date.now()}-${Math.random()}`,
        saleId: '', // Will be set when sale is created
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      // Create sale data (without id, createdAt, updatedAt as they're auto-generated)
      const saleData = {
        invoiceNumber: `INV-${Date.now()}`,
        date: new Date().toISOString(),
        customerId: selectedCustomer?.id ? parseInt(selectedCustomer.id) : null,
        totalAmount: total,
        discountAmount: 0,
        taxAmount: tax,
        paidAmount: paymentMethod === 'cash' ? paidAmount : total,
        changeAmount: paymentMethod === 'cash' ? change : 0,
        paymentMethod,
        status: 'completed',
        items: saleItems.map(item => ({
          productId: parseInt(item.productId),
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        })),
        notes: undefined
      };

      // Save sale to database
      const createdSale = await databaseSalesStorage.create(saleData);

      // Update product stock quantities and create stock history entries
      for (const item of cart) {
        const currentProduct = products.find(p => p.id === item.product.id);
        if (currentProduct) {
          const previousQuantity = currentProduct.quantity;
          const newQuantity = previousQuantity - item.quantity;
          
          // Update product quantity
          await databaseProductStorage.update(item.product.id, {
            quantity: newQuantity,
            updatedAt: new Date().toISOString()
          });

          // Create stock transaction entry for sale
          try {
            const response = await fetch('http://localhost:5003/api/offline/stock-transactions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                tenantId: 'offline',
                productId: parseInt(item.product.id),
                warehouseId: primaryWarehouse?.id || 'main',
                type: 'sale',
                quantity: -item.quantity, // Negative for stock decrease
                previousQuantity: previousQuantity,
                newQuantity: newQuantity,
                reason: 'POS Sale',
                reference: createdSale.invoiceNumber,
                relatedId: createdSale.id?.toString(),
                createdAt: new Date().toISOString()
              }),
            });

            if (!response.ok) {
              console.error('Failed to create stock transaction for product:', item.product.id);
            }
          } catch (stockError) {
            console.error('Error creating stock transaction:', stockError);
          }
        }
      }

      // Reload products to reflect updated quantities
      const updatedProducts = await databaseProductStorage.getAll();
      setProducts(updatedProducts);

      setLastSale(createdSale);
      setIsCheckoutOpen(false);
      setIsReceiptOpen(true);
      clearCart();

      // Reload sales period stats
      await loadSalesPeriodData();

      toast({
        title: "Success",
        description: "Sale completed successfully",
      });
    } catch (error) {
      console.error('Error processing sale:', error);
      toast({
        title: "Error",
        description: "Failed to process sale",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading POS...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Left Panel - Products */}
      <div className="flex-1 p-4">
        <div className="mb-4">
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto">
          {filteredProducts.map(product => (
            <Card key={product.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center">
                  <Package className="h-12 w-12 text-gray-400 mb-2" />
                  <h3 className="font-medium text-sm mb-1 line-clamp-2">{product.name}</h3>
                  <p className="text-xs text-gray-500 mb-2">{product.barcode}</p>
                  <p className="font-bold text-lg mb-2">${(product.sellingPrice || 0).toFixed(2)}</p>
                  <Button
                    onClick={() => addToCart(product)}
                    size="sm"
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="w-96 bg-white border-l p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center">
            <ShoppingCart className="h-5 w-5 mr-2" />
            Cart ({cart.length})
          </h2>
          {cart.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearCart}>
              Clear
            </Button>
          )}
        </div>

        {/* Sales Period Info */}
        {currentSalesPeriod && (
          <Card className="mb-4">
            <CardContent className="p-3">
              <div className="text-sm">
                <div className="font-medium">{currentSalesPeriod.name}</div>
                <div className="text-gray-500">
                  Sales: ${salesPeriodStats.totalSales.toFixed(2)} | 
                  Transactions: {salesPeriodStats.totalTransactions}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto mb-4">
          {cart.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Cart is empty</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map(item => (
                <Card key={item.product.id}>
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.product.name}</h4>
                        <p className="text-xs text-gray-500">${item.unitPrice.toFixed(2)} each</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(item.product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateCartItemQuantity(item.product.id, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateCartItemQuantity(item.product.id, item.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="font-bold">${item.totalPrice.toFixed(2)}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Totals */}
        {cart.length > 0 && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (10%):</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Customer Selection */}
        <div className="mb-4">
          <Select
            value={selectedCustomer?.id || 'walk-in'}
            onValueChange={(value) => {
              if (value === 'walk-in') {
                setSelectedCustomer(null);
              } else {
                const customer = customers.find(c => c.id === value);
                setSelectedCustomer(customer || null);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Customer (Optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="walk-in">Walk-in Customer</SelectItem>
              {customers.map(customer => (
                <SelectItem key={customer.id} value={customer.id}>
                  {customer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Checkout Button */}
        <Button
          onClick={() => setIsCheckoutOpen(true)}
          disabled={cart.length === 0}
          className="w-full"
          size="lg"
        >
          <DollarSign className="h-5 w-5 mr-2" />
          Checkout
        </Button>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Checkout</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Payment Method</label>
              <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentMethod === 'cash' && (
              <div>
                <label className="block text-sm font-medium mb-2">Amount Paid</label>
                <Input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
                {paidAmount >= total && (
                  <p className="text-sm text-green-600 mt-1">
                    Change: ${change.toFixed(2)}
                  </p>
                )}
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded">
              <div className="flex justify-between font-bold">
                <span>Total Amount:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>
              Cancel
            </Button>
            <Button onClick={processSale}>
              Complete Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sale Receipt</DialogTitle>
          </DialogHeader>
          {lastSale && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-bold">StockSage POS</h3>
                <p className="text-sm text-gray-500">Sale #{lastSale.id}</p>
                <p className="text-sm text-gray-500">{new Date(lastSale.date).toLocaleString()}</p>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-2">Items:</h4>
                {lastSale.items.map(item => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.productName} x{item.quantity}</span>
                    <span>${item.totalPrice.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              
              <Separator />
              
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${(lastSale.totalAmount - (lastSale.taxAmount || 0)).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>${(lastSale.taxAmount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>${lastSale.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paid ({lastSale.paymentMethod}):</span>
                  <span>${lastSale.paidAmount.toFixed(2)}</span>
                </div>
                {(lastSale.changeAmount || 0) > 0 && (
                  <div className="flex justify-between">
                    <span>Change:</span>
                    <span>${(lastSale.changeAmount || 0).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={printThermalReceipt}
              disabled={!lastSale}
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Receipt
            </Button>
            <Button onClick={() => setIsReceiptOpen(false)}>
              <Receipt className="h-4 w-4 mr-2" />
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
