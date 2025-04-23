import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ProductWithStockStatus, Customer } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check } from "lucide-react";
import { 
  Search, FileScan, ShoppingCart, Plus, Minus, Trash2, 
  User, CreditCard, DollarSign, Smartphone, Banknote, Printer, ChevronsRight
} from "lucide-react";
import BarcodeScannerModal from "@/components/BarcodeScannerModal";

export default function POS() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { 
    cart, addToCart, updateCartItem, removeFromCart, 
    setCartCustomer, setCartDiscountAmount, setCartPaymentMethod, clearCart
  } = useStore();

  // State variables
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [completedSale, setCompletedSale] = useState<any>(null);

  // Fetch products
  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ['/api/products'],
  });

  // Fetch customers
  const { data: customers, isLoading: loadingCustomers } = useQuery({
    queryKey: ['/api/customers'],
  });

  // Categories derived from products
  const categories = products 
    ? Array.from(new Set(products.map(p => p.category).filter(Boolean))) 
    : [];

  // Complete sale mutation
  const completeSaleMutation = useMutation({
    mutationFn: async (saleData: any) => {
      const res = await apiRequest('POST', '/api/sales', saleData);
      return res.json();
    },
    onSuccess: (data) => {
      setCompletedSale(data);
      clearCart();
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      toast({
        title: t('success'),
        description: t('sale_completed_successfully'),
      });
      setProcessingPayment(false);
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : t('complete_sale_error'),
        variant: "destructive",
      });
      setProcessingPayment(false);
    },
  });

  // Filter products by search and category
  const filteredProducts = () => {
    if (!products) return [];
    
    let filtered = [...products];
    
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        p => p.name.toLowerCase().includes(searchLower) || 
             (p.barcode && p.barcode.toLowerCase().includes(searchLower))
      );
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    
    return filtered;
  };

  // Calculate cart totals
  const subtotal = cart.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const total = subtotal - cart.discountAmount;
  const change = Math.max(0, amountPaid - total);

  // Set amount paid to total by default when opening payment dialog
  useEffect(() => {
    if (showPaymentDialog) {
      setAmountPaid(total);
    }
  }, [showPaymentDialog, total]);

  // Handle add to cart
  const handleAddToCart = (product: ProductWithStockStatus) => {
    addToCart(product, 1);
  };

  // Handle completing sale
  const handleCompleteSale = () => {
    if (cart.items.length === 0) {
      toast({
        title: t('error'),
        description: t('cart_is_empty'),
        variant: "destructive",
      });
      return;
    }

    setProcessingPayment(true);

    const saleData = {
      sale: {
        invoiceNumber: `INV-${Date.now()}`,
        date: new Date(),
        customerId: cart.customer?.id,
        totalAmount: total,
        discountAmount: cart.discountAmount,
        taxAmount: 0,
        paidAmount: amountPaid,
        changeAmount: change,
        paymentMethod: cart.paymentMethod,
        status: 'completed',
        notes: '',
      },
      items: cart.items.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.price,
        totalPrice: item.price * item.quantity,
        discount: item.discount,
      })),
    };

    completeSaleMutation.mutate(saleData);
    setShowPaymentDialog(false);
  };

  // Handle print receipt
  const handlePrintReceipt = () => {
    // In a real app, this would connect to a printer
    toast({
      title: t('print_receipt'),
      description: t('print_receipt_not_implemented'),
    });
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
        {/* Left Panel - Products */}
        <div className="md:col-span-2">
          {/* Search and Scanner */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="search"
              placeholder={t('search_products')}
              className="pl-10 pr-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowScanner(true)}
            >
              <FileScan className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Categories */}
          <Tabs defaultValue="all" className="w-full mb-4">
            <TabsList className="w-full grid grid-flow-col auto-cols-fr mb-2 p-0 h-full overflow-x-auto">
              <TabsTrigger 
                value="all" 
                className="text-xs py-1 px-2 data-[state=active]:bg-primary data-[state=active]:text-white rounded-md"
                onClick={() => setSelectedCategory(null)}
              >
                {t('all_categories')}
              </TabsTrigger>
              {categories.map(category => (
                <TabsTrigger 
                  key={category} 
                  value={category}
                  className="text-xs py-1 px-2 data-[state=active]:bg-primary data-[state=active]:text-white rounded-md min-w-max"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          
          {/* Products Grid */}
          {loadingProducts ? (
            <div className="grid grid-cols-2 gap-3">
              {Array(8).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : filteredProducts().length === 0 ? (
            <div className="text-center p-8">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-3" />
              <h3 className="font-medium text-muted-foreground">{t('no_products_found')}</h3>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts().map(product => (
                <Card 
                  key={product.id} 
                  className={`card cursor-pointer ${product.stockStatus === 'out_of_stock' ? 'opacity-60' : ''}`}
                  onClick={() => product.stockStatus !== 'out_of_stock' && handleAddToCart(product)}
                >
                  <CardContent className="p-3">
                    <div className="text-sm font-medium">{product.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{product.barcode}</div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="font-bold">{product.sellingPrice.toFixed(2)} {t('currency')}</span>
                      <span className={`text-xs px-2 py-1 rounded-full 
                        ${product.stockStatus === 'in_stock' ? 'bg-green-100 text-success' : 
                          product.stockStatus === 'low_stock' ? 'bg-orange-100 text-orange-600' : 
                          'bg-red-100 text-error'}`}
                      >
                        {product.quantity} {t(product.unit || 'piece')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        
        {/* Right Panel - Cart */}
        <div className="md:col-span-1">
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-lg">{t('cart')}</h2>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs"
                  onClick={() => clearCart()}
                  disabled={cart.items.length === 0}
                >
                  {t('clear')}
                </Button>
              </div>
              
              {/* Customer Selection */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t('customer')}</span>
                </div>
                <Select
                  value={cart.customer?.id?.toString() || ""}
                  onValueChange={(value) => {
                    if (value === "") {
                      setCartCustomer(null);
                    } else {
                      const customer = customers?.find(c => c.id === parseInt(value));
                      if (customer) setCartCustomer(customer);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('select_customer')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{t('cash_customer')}</SelectItem>
                    {loadingCustomers ? (
                      <SelectItem value="" disabled>{t('loading')}</SelectItem>
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
              
              {/* Cart Items */}
              <div className="max-h-60 overflow-y-auto mb-4">
                {cart.items.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">{t('cart_empty')}</p>
                  </div>
                ) : (
                  cart.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.product.name}</p>
                        <p className="text-xs text-muted-foreground">{item.price.toFixed(2)} × {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">{(item.price * item.quantity).toFixed(2)}</span>
                        <div className="flex items-center ml-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateCartItem(item.product.id, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="mx-1 text-sm w-6 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateCartItem(item.product.id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive ml-1"
                            onClick={() => removeFromCart(item.product.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {/* Totals */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span>{t('subtotal')}</span>
                  <span>{subtotal.toFixed(2)} {t('currency')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{t('discount')}</span>
                  <div className="flex items-center">
                    <Input 
                      type="number"
                      min="0"
                      max={subtotal}
                      className="w-20 h-6 text-right"
                      value={cart.discountAmount}
                      onChange={(e) => setCartDiscountAmount(parseFloat(e.target.value) || 0)}
                    />
                    <span className="ml-1">{t('currency')}</span>
                  </div>
                </div>
                <div className="flex justify-between font-bold">
                  <span>{t('total')}</span>
                  <span>{total.toFixed(2)} {t('currency')}</span>
                </div>
              </div>
              
              {/* Payment Button */}
              <Button 
                className="w-full" 
                size="lg"
                disabled={cart.items.length === 0}
                onClick={() => setShowPaymentDialog(true)}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {t('payment')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onProductScanned={(product) => {
          addToCart(product, 1);
          setShowScanner(false);
        }}
      />
      
      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('payment')}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium mb-2">{t('payment_method')}</label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant={cart.paymentMethod === 'cash' ? 'default' : 'outline'}
                  className="justify-start"
                  onClick={() => setCartPaymentMethod('cash')}
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  {t('cash')}
                </Button>
                <Button
                  type="button"
                  variant={cart.paymentMethod === 'credit' ? 'default' : 'outline'}
                  className="justify-start"
                  onClick={() => setCartPaymentMethod('credit')}
                  disabled={!cart.customer}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  {t('credit')}
                </Button>
                <Button
                  type="button"
                  variant={cart.paymentMethod === 'bank_transfer' ? 'default' : 'outline'}
                  className="justify-start"
                  onClick={() => setCartPaymentMethod('bank_transfer')}
                >
                  <Banknote className="mr-2 h-4 w-4" />
                  {t('bank_transfer')}
                </Button>
                <Button
                  type="button"
                  variant={cart.paymentMethod === 'mobile_payment' ? 'default' : 'outline'}
                  className="justify-start"
                  onClick={() => setCartPaymentMethod('mobile_payment')}
                >
                  <Smartphone className="mr-2 h-4 w-4" />
                  {t('mobile_payment')}
                </Button>
              </div>
            </div>
            
            {/* Amount Paid */}
            <div>
              <label className="block text-sm font-medium mb-2">{t('amount_paid')}</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amountPaid}
                onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                disabled={cart.paymentMethod === 'credit'}
              />
              {cart.paymentMethod === 'credit' && (
                <p className="text-xs text-muted-foreground mt-1">{t('credit_payment_info')}</p>
              )}
            </div>
            
            {/* Change */}
            {cart.paymentMethod === 'cash' && (
              <div>
                <label className="block text-sm font-medium mb-2">{t('change')}</label>
                <div className="p-2 bg-muted rounded text-right font-bold">
                  {change.toFixed(2)} {t('currency')}
                </div>
              </div>
            )}
            
            {/* Summary */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex justify-between text-sm">
                <span>{t('subtotal')}</span>
                <span>{subtotal.toFixed(2)} {t('currency')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>{t('discount')}</span>
                <span>-{cart.discountAmount.toFixed(2)} {t('currency')}</span>
              </div>
              <div className="flex justify-between font-bold mt-1 pt-1 border-t border-blue-200">
                <span>{t('total')}</span>
                <span>{total.toFixed(2)} {t('currency')}</span>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowPaymentDialog(false)}
            >
              {t('cancel')}
            </Button>
            <Button 
              type="button" 
              onClick={handleCompleteSale}
              disabled={
                (cart.paymentMethod !== 'credit' && amountPaid < total) || 
                processingPayment
              }
            >
              {processingPayment ? t('processing') : t('complete_sale')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Completed Sale Dialog */}
      <Dialog open={!!completedSale} onOpenChange={() => setCompletedSale(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('sale_completed')}</DialogTitle>
          </DialogHeader>
          
          <div className="py-4 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-success" />
            </div>
            <h3 className="text-xl font-bold mb-1">{t('thank_you')}</h3>
            <p className="text-muted-foreground">{t('sale_success_message')}</p>
            
            <div className="mt-6 p-3 bg-gray-50 rounded-lg text-sm text-left">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-muted-foreground">{t('invoice')}:</div>
                <div className="font-medium">{completedSale?.invoiceNumber}</div>
                
                <div className="text-muted-foreground">{t('date')}:</div>
                <div className="font-medium">
                  {new Date().toLocaleDateString()}
                </div>
                
                <div className="text-muted-foreground">{t('items')}:</div>
                <div className="font-medium">{completedSale?.items?.length}</div>
                
                <div className="text-muted-foreground">{t('total')}:</div>
                <div className="font-medium">{completedSale?.totalAmount?.toFixed(2)} {t('currency')}</div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handlePrintReceipt}
              className="flex-1"
            >
              <Printer className="mr-2 h-4 w-4" />
              {t('print_receipt')}
            </Button>
            <Button 
              type="button" 
              onClick={() => setCompletedSale(null)}
              className="flex-1"
            >
              <ChevronsRight className="mr-2 h-4 w-4" />
              {t('continue')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
