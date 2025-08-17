import { useState, useEffect } from "react";
import { useOfflineProducts } from "@/hooks/use-offline-products";
import { useOfflineCustomers } from "@/hooks/use-offline-customers";
import { useOfflineSales } from "@/hooks/use-offline-sales";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { OfflineProduct, OfflineCustomer, OfflineCategory, OfflineSalesPeriod, offlineCategoryStorage, creditHelpers, salesPeriodHelpers, offlineSalesPeriodStorage } from "@/lib/offline-storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Calculator, 
  CreditCard, 
  Receipt, 
  DollarSign, 
  Clock, 
  AlertCircle, 
  Info,
  X,
  Filter,
  Grid3X3,
  List,
  Package,
  Calendar,
  TrendingUp,
  PlayCircle,
  StopCircle,
  User
} from "lucide-react";

interface CartItem {
  product: OfflineProduct;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export default function OfflinePOS() {
  const { products } = useOfflineProducts();
  const { customers } = useOfflineCustomers();
  const { createSale } = useOfflineSales();
  const { t } = useI18n();
  const { toast } = useToast();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<OfflineCustomer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'credit'>('cash');
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [amountPaid, setAmountPaid] = useState('');
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [currentSalesPeriod, setCurrentSalesPeriod] = useState<OfflineSalesPeriod | null>(null);
  const [todaysSalesData, setTodaysSalesData] = useState({
    totalSales: 0,
    totalTransactions: 0,
    averageTransaction: 0
  });
  const [showOpenPeriodDialog, setShowOpenPeriodDialog] = useState(false);
  const [showClosePeriodDialog, setShowClosePeriodDialog] = useState(false);
  const [openingBalance, setOpeningBalance] = useState('');
  const [closingBalance, setClosingBalance] = useState('');
  const [periodNotes, setPeriodNotes] = useState('');
  const [isCreditPayment, setIsCreditPayment] = useState(false);
  const [quantityInputs, setQuantityInputs] = useState<{[key: string]: string}>({});
  const [priceInputs, setPriceInputs] = useState<{[key: string]: string}>({});
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [pricingTier, setPricingTier] = useState<'retail' | 'semi-wholesale' | 'wholesale'>('retail');
  const [categories, setCategories] = useState<OfflineCategory[]>([]);
  const [showPriceInfo, setShowPriceInfo] = useState(false);
  const [selectedProductInfo, setSelectedProductInfo] = useState<OfflineProduct | null>(null);
  const [discount, setDiscount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Load categories and sales period data
  useEffect(() => {
    setCategories(offlineCategoryStorage.getAll());
    loadSalesPeriodData();
  }, []);

  // Load sales period data
  const loadSalesPeriodData = () => {
    const currentPeriod = offlineSalesPeriodStorage.getCurrentPeriod();
    setCurrentSalesPeriod(currentPeriod);
    
    const todaysData = salesPeriodHelpers.getTodaysSalesData();
    setTodaysSalesData(todaysData);
  };

  // Update sales period stats when a sale is made
  useEffect(() => {
    if (currentSalesPeriod) {
      salesPeriodHelpers.updatePeriodStats(currentSalesPeriod.id);
      loadSalesPeriodData();
    }
  }, [cart.length === 0 && lastSale]); // Trigger when cart is cleared after sale

  // Get price based on selected pricing tier
  const getPriceForTier = (product: OfflineProduct, tier: 'retail' | 'semi-wholesale' | 'wholesale'): number => {
    switch (tier) {
      case 'semi-wholesale':
        return product.semiWholesalePrice || product.sellingPrice;
      case 'wholesale':
        return product.wholesalePrice || product.semiWholesalePrice || product.sellingPrice;
      default:
        return product.sellingPrice;
    }
  };

  // Update cart prices when pricing tier changes
  useEffect(() => {
    setCart(prevCart => 
      prevCart.map(item => {
        const newPrice = getPriceForTier(item.product, pricingTier);
        return {
          ...item,
          unitPrice: newPrice,
          totalPrice: newPrice * item.quantity
        };
      })
    );
  }, [pricingTier]);


  // Price info handlers
  const showProductPriceInfo = (product: OfflineProduct) => {
    setSelectedProductInfo(product);
    setShowPriceInfo(true);
  };

  // Sales period handlers
  const handleOpenSalesPeriod = () => {
    try {
      const balance = parseFloat(openingBalance) || 0;
      const newPeriod = salesPeriodHelpers.openSalesPeriod(balance, periodNotes || null);
      setCurrentSalesPeriod(newPeriod);
      setShowOpenPeriodDialog(false);
      setOpeningBalance('');
      setPeriodNotes('');
      loadSalesPeriodData();
      toast({
        title: "Sales Period Opened",
        description: `Daily sales tracking started with opening balance of $${balance.toFixed(2)}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open sales period",
        variant: "destructive",
      });
    }
  };

  const handleCloseSalesPeriod = () => {
    if (!currentSalesPeriod) return;
    
    try {
      const balance = parseFloat(closingBalance) || undefined;
      salesPeriodHelpers.closeSalesPeriod(currentSalesPeriod.id, balance, periodNotes || undefined);
      setCurrentSalesPeriod(null);
      setShowClosePeriodDialog(false);
      setClosingBalance('');
      setPeriodNotes('');
      loadSalesPeriodData();
      toast({
        title: "Sales Period Closed",
        description: "Daily sales period has been closed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to close sales period",
        variant: "destructive",
      });
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.active && (
      !searchQuery || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    const matchesCategory = selectedCategoryFilter === "all" || 
      product.categoryId === selectedCategoryFilter ||
      (selectedCategoryFilter === "uncategorized" && !product.categoryId);
    
    return matchesSearch && matchesCategory;
  });

  // Get category name by ID
  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "Uncategorized";
    const category = categories.find(c => c.id === categoryId);
    return category?.name || "Unknown";
  };

  // Keyboard shortcut handler for price info
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'i' && !event.ctrlKey && !event.altKey && !event.metaKey) {
        // Only trigger if not typing in an input field
        const target = event.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          event.preventDefault();
          if (filteredProducts.length > 0) {
            setSelectedProductInfo(filteredProducts[0]);
            setShowPriceInfo(true);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [filteredProducts]);

  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const discountAmount = (subtotal * discount) / 100;
  const taxRate = 0; // Could be fetched from settings
  const taxAmount = ((subtotal - discountAmount) * taxRate) / 100;
  const total = subtotal - discountAmount + taxAmount;
  const changeAmount = paidAmount - total;

  const addToCart = (product: OfflineProduct) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    const tierPrice = getPriceForTier(product, pricingTier);
    
    if (existingItem) {
      updateQuantity(product.id, existingItem.quantity + 1);
    } else {
      const newItem: CartItem = {
        product,
        quantity: 1,
        unitPrice: tierPrice,
        totalPrice: tierPrice
      };
      setCart([...cart, newItem]);
    }
  };

  const evaluateQuantityExpression = (expression: string): number => {
    try {
      // Remove spaces and validate the expression
      const cleanExpression = expression.replace(/\s/g, '');
      
      // Only allow numbers, +, -, *, /, (, )
      if (!/^[0-9+\-*/().]+$/.test(cleanExpression)) {
        return NaN;
      }
      
      // Evaluate the expression safely
      const result = Function('"use strict"; return (' + cleanExpression + ')')();
      
      // Ensure result is a positive number
      return typeof result === 'number' && result > 0 ? Math.floor(result) : NaN;
    } catch {
      return NaN;
    }
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(cart.map(item => 
      item.product.id === productId 
        ? { 
            ...item, 
            quantity: newQuantity, 
            totalPrice: item.unitPrice * newQuantity 
          }
        : item
    ));
  };

  const handleQuantityInputChange = (productId: string, value: string) => {
    setQuantityInputs(prev => ({ ...prev, [productId]: value }));
  };

  const handleQuantityInputSubmit = (productId: string, value: string) => {
    const quantity = parseInt(value) || 1;
    updateQuantity(productId, quantity);
    setQuantityInputs(prev => ({ ...prev, [productId]: '' }));
  };

  const handlePriceInputChange = (productId: string, value: string) => {
    setPriceInputs(prev => ({ ...prev, [productId]: value }));
  };

  const handlePriceInputSubmit = (productId: string, value: string) => {
    const newPrice = parseFloat(value);
    const product = products.find(p => p.id === productId);
    
    if (!product || isNaN(newPrice)) {
      setPriceInputs(prev => ({ ...prev, [productId]: '' }));
      return;
    }

    // Validate: price cannot be less than cost price
    if (newPrice < product.costPrice) {
      toast({
        title: "Invalid Price",
        description: `Price cannot be less than cost price ($${product.costPrice.toFixed(2)})`,
        variant: "destructive",
      });
      setPriceInputs(prev => ({ ...prev, [productId]: '' }));
      return;
    }

    // Update the cart item price
    setCart(prevCart => 
      prevCart.map(item => 
        item.product.id === productId 
          ? { 
              ...item, 
              unitPrice: newPrice, 
              totalPrice: newPrice * item.quantity 
            }
          : item
      )
    );
    
    setPriceInputs(prev => ({ ...prev, [productId]: '' }));
    
    toast({
      title: "Price Updated",
      description: `${product.name} price updated to $${newPrice.toFixed(2)}`,
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setDiscount(0);
    setPaidAmount(0);
    setIsCreditPayment(false);
    setQuantityInputs({});
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({
        title: "Error",
        description: "Cart is empty",
        variant: "destructive"
      });
      return;
    }

    // Check payment validation based on payment method
    if (isCreditPayment || paymentMethod === "credit") {
      if (!selectedCustomer || selectedCustomer.name === 'Walk-in Customer') {
        toast({
          title: "Error",
          description: "Please select a customer for credit payment",
          variant: "destructive"
        });
        return;
      }
    } else if (paidAmount < total) {
      toast({
        title: "Error", 
        description: "Insufficient payment amount",
        variant: "destructive"
      });
      return;
    }

    try {
      const saleData = {
        invoiceNumber: `INV-${Date.now()}`,
        date: new Date(),
        customerId: selectedCustomer?.id || null,
        totalAmount: total,
        discountAmount: discountAmount > 0 ? discountAmount : null,
        taxAmount: taxAmount > 0 ? taxAmount : null,
        paidAmount: isCreditPayment ? 0 : paidAmount,
        changeAmount: isCreditPayment ? null : (changeAmount > 0 ? changeAmount : null),
        paymentMethod: isCreditPayment ? "credit" : paymentMethod,
        status: "completed",
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          discount: null
        }))
      };

      const sale = createSale({
        customerId: saleData.customerId,
        totalAmount: saleData.totalAmount,
        discountAmount: saleData.discountAmount,
        taxAmount: saleData.taxAmount,
        paidAmount: saleData.paidAmount,
        changeAmount: saleData.changeAmount,
        paymentMethod: saleData.paymentMethod,
        status: saleData.status,
        notes: null,
        items: []
      }, saleData.items);

      // If it's a credit payment, add to customer's credit balance
      if ((isCreditPayment || paymentMethod === "credit") && selectedCustomer) {
        creditHelpers.addCreditSale(
          selectedCustomer.id,
          total,
          sale.id,
          `Sale ${saleData.invoiceNumber} - Credit Purchase`
        );
      }

      setLastSale(sale);
      setIsCheckoutOpen(false);
      setIsReceiptOpen(true);
      clearCart();

      toast({
        title: "Success",
        description: "Sale completed successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete sale",
        variant: "destructive"
      });
    }
  };

  const handleQuickPay = () => {
    setPaidAmount(total);
    setIsCheckoutOpen(true);
  };

  return (
    <div className="p-6 h-screen flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Point of Sale</h1>
        <div className="flex items-center gap-4">
          {/* Pricing Tier Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Pricing:</span>
            <Select value={pricingTier} onValueChange={(value: 'retail' | 'semi-wholesale' | 'wholesale') => setPricingTier(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="retail">Retail</SelectItem>
                <SelectItem value="semi-wholesale">Semi-Wholesale</SelectItem>
                <SelectItem value="wholesale">Wholesale</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Badge variant="outline" className="text-sm">
            Items: {cart.reduce((sum, item) => sum + item.quantity, 0)}
          </Badge>
          <Badge variant="outline" className="text-sm">
            Total: ${total.toFixed(2)}
          </Badge>
        </div>
      </div>

      {/* Daily Sales Summary */}
      <Card className="mb-6 border-2 border-blue-100">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-lg">Today's Sales</h3>
                  <p className="text-sm text-gray-600">{new Date().toLocaleDateString()}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="flex items-center gap-1">
                    <DollarSign className="w-4 h-4 text-green-600" />
                    <span className="text-2xl font-bold text-green-600">
                      ${todaysSalesData.totalSales.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">Total Sales</p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span className="text-2xl font-bold text-blue-600">
                      {todaysSalesData.totalTransactions}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">Transactions</p>
                </div>
                
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {currentSalesPeriod ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-green-700">Sales Period Open</span>
                    <div className="text-xs text-gray-500">
                      Since {new Date(currentSalesPeriod.openedAt).toLocaleTimeString()}
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowClosePeriodDialog(true)}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <StopCircle className="w-4 h-4 mr-1" />
                    Close Period
                  </Button>
                </div>
              ) : (
                <Button 
                  onClick={() => setShowOpenPeriodDialog(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Open Sales Period
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search and Category Filter */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search products or scan barcode..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="uncategorized">Uncategorized</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
            {filteredProducts.map((product) => (
              <Card 
                key={product.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => addToCart(product)}
              >
                <CardContent className="p-3">
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm truncate">{product.name}</h3>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-lg font-bold text-green-600">
                          ${getPriceForTier(product, pricingTier).toFixed(2)}
                        </span>
                        {pricingTier !== 'retail' && (
                          <span className="text-xs text-gray-500 line-through">
                            ${product.sellingPrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-blue-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            showProductPriceInfo(product);
                          }}
                        >
                          <Info className="w-3 h-3 text-blue-600" />
                        </Button>
                        <Badge variant={product.quantity > 0 ? "default" : "destructive"} className="text-xs">
                          {product.quantity}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {getCategoryName(product.categoryId)}
                      </Badge>
                      {pricingTier !== 'retail' && (
                        <Badge variant="secondary" className="text-xs">
                          {pricingTier === 'semi-wholesale' ? 'Semi-W' : 'Wholesale'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Cart Section */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Cart
                </h2>
                {cart.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearCart}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Customer Selection */}
              <div className="mb-4">
                <Select onValueChange={(value) => {
                  const customer = customers.find(c => c.id === value);
                  setSelectedCustomer(customer || null);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Walk-in Customer</SelectItem>
                    {customers.map((customer) => {
                      const creditInfo = creditHelpers.getCustomerCreditInfo(customer.id);
                      return (
                        <SelectItem key={customer.id} value={customer.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{customer.name}</span>
                            {creditInfo.currentBalance > 0 && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                Credit: ${creditInfo.currentBalance.toFixed(2)}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                
                {/* Show customer credit info if selected */}
                {selectedCustomer && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                    <div className="flex justify-between">
                      <span>Credit Balance:</span>
                      <span className="font-medium">
                        ${creditHelpers.getCustomerCreditInfo(selectedCustomer.id).currentBalance.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Cart Items */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.product.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{item.product.name}</p>
                        <p className="text-xs text-gray-500">Cost: ${item.product.costPrice.toFixed(2)}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center justify-between gap-2">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <Input
                          type="text"
                          value={quantityInputs[item.product.id] || item.quantity.toString()}
                          onChange={(e) => handleQuantityInputChange(item.product.id, e.target.value)}
                          onBlur={(e) => handleQuantityInputSubmit(item.product.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleQuantityInputSubmit(item.product.id, e.currentTarget.value);
                              e.currentTarget.blur();
                            }
                          }}
                          className="w-16 text-center text-sm"
                          placeholder="qty"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>

                      {/* Price Controls */}
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-500">@</span>
                        <Input
                          type="number"
                          step="0.01"
                          min={item.product.costPrice}
                          value={priceInputs[item.product.id] || item.unitPrice.toFixed(2)}
                          onChange={(e) => handlePriceInputChange(item.product.id, e.target.value)}
                          onBlur={(e) => handlePriceInputSubmit(item.product.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handlePriceInputSubmit(item.product.id, e.currentTarget.value);
                              e.currentTarget.blur();
                            }
                          }}
                          className="w-20 text-center text-sm"
                          placeholder="price"
                        />
                      </div>

                      {/* Total */}
                      <div className="text-right">
                        <p className="font-medium text-sm">${item.totalPrice.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {cart.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-8 h-8 mx-auto mb-2" />
                  <p>Cart is empty</p>
                </div>
              )}

              {/* Totals */}
              {cart.length > 0 && (
                <div className="mt-4 space-y-2">
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  
                  {/* Discount Input */}
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Discount (%):</label>
                    <Input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                      className="w-20 h-8 text-right"
                      min="0"
                      max="100"
                    />
                  </div>
                  
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>Discount:</span>
                      <span>-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {taxAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Tax:</span>
                      <span>${taxAmount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                  
                  <div className="space-y-2 mt-4">
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" onClick={handleQuickPay}>
                        <Calculator className="w-4 h-4 mr-2" />
                        Quick Pay
                      </Button>
                      <Button onClick={() => setIsCheckoutOpen(true)}>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Checkout
                      </Button>
                    </div>
                    
                    {/* Credit Payment Option */}
                    {selectedCustomer && selectedCustomer.name !== 'Walk-in Customer' && (
                      <Button 
                        variant="secondary" 
                        className="w-full"
                        onClick={() => {
                          setIsCreditPayment(true);
                          setPaymentMethod("credit");
                          setPaidAmount(0);
                          setIsCheckoutOpen(true);
                        }}
                      >
                        <User className="w-4 h-4 mr-2" />
                        Pay with Credit
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Sale</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Discount:</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>${taxAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              {isCreditPayment ? (
                <div className="bg-blue-50 p-4 rounded">
                  <h3 className="font-semibold text-blue-900 mb-2">Credit Payment</h3>
                  <p className="text-sm text-blue-700 mb-2">
                    This sale will be added to {selectedCustomer?.name}'s credit balance.
                  </p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Current Balance:</span>
                      <span>${selectedCustomer ? creditHelpers.getCustomerCreditInfo(selectedCustomer.id).currentBalance.toFixed(2) : '0.00'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sale Amount:</span>
                      <span>${total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>New Balance:</span>
                      <span>${selectedCustomer ? (creditHelpers.getCustomerCreditInfo(selectedCustomer.id).currentBalance + total).toFixed(2) : total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium">Payment Method</label>
                    <Select value={paymentMethod} onValueChange={(value: 'cash' | 'card' | 'credit') => {
                      setPaymentMethod(value);
                      if (value === "credit") {
                        setIsCreditPayment(true);
                        setPaidAmount(0);
                      } else {
                        setIsCreditPayment(false);
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="mobile">Mobile Payment</SelectItem>
                        {selectedCustomer && selectedCustomer.name !== 'Walk-in Customer' && (
                          <SelectItem value="credit">
                            Credit
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Amount Paid</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={paymentMethod === "credit" ? total : paidAmount}
                      onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      disabled={paymentMethod === "credit"}
                    />
                    {paymentMethod === "credit" && (
                      <p className="text-xs text-gray-500 mt-1">
                        Amount will be added to customer's credit balance
                      </p>
                    )}
                  </div>
                  
                  {paidAmount > total && (
                    <div className="flex justify-between text-sm bg-green-50 p-2 rounded">
                      <span>Change:</span>
                      <span className="font-medium">${changeAmount.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCheckout} disabled={paymentMethod !== "credit" && !isCreditPayment && paidAmount < total}>
              Complete Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receipt Dialog */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Sale Completed
            </DialogTitle>
          </DialogHeader>
          
          {lastSale && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-lg font-semibold">Thank you for your purchase!</p>
                <p className="text-sm text-gray-600">Invoice: {lastSale.invoiceNumber}</p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Amount:</span>
                  <span>${lastSale.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paid Amount:</span>
                  <span>${lastSale.paidAmount.toFixed(2)}</span>
                </div>
                {lastSale.changeAmount && (
                  <div className="flex justify-between font-medium">
                    <span>Change:</span>
                    <span>${lastSale.changeAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReceiptOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              // Could implement receipt printing here
              setIsReceiptOpen(false);
            }}>
              Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Open Sales Period Dialog */}
      <Dialog open={showOpenPeriodDialog} onOpenChange={setShowOpenPeriodDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Open Sales Period</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Opening Balance</label>
              <Input
                type="number"
                step="0.01"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notes (Optional)</label>
              <Input
                value={periodNotes}
                onChange={(e) => setPeriodNotes(e.target.value)}
                placeholder="Opening notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOpenPeriodDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleOpenSalesPeriod} className="bg-green-600 hover:bg-green-700">
              Open Period
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Sales Period Dialog */}
      <Dialog open={showClosePeriodDialog} onOpenChange={setShowClosePeriodDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Sales Period</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Period Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Opening Balance:</span>
                  <span>${currentSalesPeriod?.openingBalance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Sales:</span>
                  <span>${currentSalesPeriod?.totalSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Transactions:</span>
                  <span>{currentSalesPeriod?.totalTransactions}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Expected Balance:</span>
                  <span>${((currentSalesPeriod?.openingBalance || 0) + (currentSalesPeriod?.totalSales || 0)).toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Actual Closing Balance</label>
              <Input
                type="number"
                step="0.01"
                value={closingBalance}
                onChange={(e) => setClosingBalance(e.target.value)}
                placeholder={((currentSalesPeriod?.openingBalance || 0) + (currentSalesPeriod?.totalSales || 0)).toFixed(2)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Closing Notes (Optional)</label>
              <Input
                value={periodNotes}
                onChange={(e) => setPeriodNotes(e.target.value)}
                placeholder="Closing notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClosePeriodDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCloseSalesPeriod} className="bg-red-600 hover:bg-red-700">
              Close Period
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Price Information Modal */}
      <Dialog open={showPriceInfo} onOpenChange={setShowPriceInfo}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Product Price Information
            </DialogTitle>
          </DialogHeader>
          {selectedProductInfo && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-semibold text-lg">{selectedProductInfo.name}</h3>
                <Badge variant="outline" className="mt-1">
                  {getCategoryName(selectedProductInfo.categoryId)}
                </Badge>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-red-600">Cost Price:</span>
                  <span className="font-bold">${selectedProductInfo.costPrice.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="font-medium text-green-600">Retail Price:</span>
                  <span className="font-bold">${selectedProductInfo.sellingPrice.toFixed(2)}</span>
                </div>
                
                {selectedProductInfo.semiWholesalePrice && (
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-blue-600">Semi-Wholesale:</span>
                    <span className="font-bold">${selectedProductInfo.semiWholesalePrice.toFixed(2)}</span>
                  </div>
                )}
                
                {selectedProductInfo.wholesalePrice && (
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-purple-600">Wholesale:</span>
                    <span className="font-bold">${selectedProductInfo.wholesalePrice.toFixed(2)}</span>
                  </div>
                )}
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Stock Quantity:</span>
                  <Badge variant={selectedProductInfo.quantity > 0 ? "default" : "destructive"}>
                    {selectedProductInfo.quantity}
                  </Badge>
                </div>
                
                {selectedProductInfo.barcode && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Barcode:</span>
                    <span className="text-sm font-mono">{selectedProductInfo.barcode}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Profit Margin:</span>
                  <span className="text-sm font-semibold text-green-600">
                    {(((selectedProductInfo.sellingPrice - selectedProductInfo.costPrice) / selectedProductInfo.costPrice) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              
              <div className="text-xs text-gray-500 text-center mt-4">
                Press 'i' key to quickly view price info for the first product
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowPriceInfo(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
