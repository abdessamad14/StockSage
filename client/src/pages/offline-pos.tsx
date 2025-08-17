import { useState, useEffect } from "react";
import { useOfflineProducts } from "@/hooks/use-offline-products";
import { useOfflineCustomers } from "@/hooks/use-offline-customers";
import { useOfflineSales } from "@/hooks/use-offline-sales";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { OfflineProduct, OfflineCustomer, OfflineCategory, offlineCategoryStorage, creditHelpers } from "@/lib/offline-storage";
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
  DollarSign,
  Receipt,
  User,
  Package
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
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paidAmount, setPaidAmount] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);
  const [isCreditPayment, setIsCreditPayment] = useState(false);
  const [quantityInputs, setQuantityInputs] = useState<{[key: string]: string}>({});
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [categories, setCategories] = useState<OfflineCategory[]>([]);

  // Load categories
  useEffect(() => {
    setCategories(offlineCategoryStorage.getAll());
  }, []);

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

  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const discountAmount = (subtotal * discount) / 100;
  const taxRate = 0; // Could be fetched from settings
  const taxAmount = ((subtotal - discountAmount) * taxRate) / 100;
  const total = subtotal - discountAmount + taxAmount;
  const changeAmount = paidAmount - total;

  const addToCart = (product: OfflineProduct) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      updateQuantity(product.id, existingItem.quantity + 1);
    } else {
      const newItem: CartItem = {
        product,
        quantity: 1,
        unitPrice: product.sellingPrice,
        totalPrice: product.sellingPrice
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
    const evaluatedQuantity = evaluateQuantityExpression(value);
    
    if (!isNaN(evaluatedQuantity)) {
      updateQuantity(productId, evaluatedQuantity);
      setQuantityInputs(prev => ({ ...prev, [productId]: evaluatedQuantity.toString() }));
    } else {
      // Reset to current quantity if invalid
      const currentItem = cart.find(item => item.product.id === productId);
      if (currentItem) {
        setQuantityInputs(prev => ({ ...prev, [productId]: currentItem.quantity.toString() }));
      }
    }
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
          <Badge variant="outline" className="text-sm">
            Items: {cart.reduce((sum, item) => sum + item.quantity, 0)}
          </Badge>
          <Badge variant="outline" className="text-sm">
            Total: ${total.toFixed(2)}
          </Badge>
        </div>
      </div>

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
                      <span className="text-lg font-bold text-green-600">
                        ${product.sellingPrice.toFixed(2)}
                      </span>
                      <Badge variant={product.quantity > 0 ? "default" : "destructive"} className="text-xs">
                        {product.quantity}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {getCategoryName(product.categoryId)}
                    </Badge>
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
                  <div key={item.product.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.product.name}</p>
                      <p className="text-xs text-gray-600">${item.unitPrice.toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center gap-2">
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(item.product.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
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
                    <Select value={paymentMethod} onValueChange={(value) => {
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
    </div>
  );
}
