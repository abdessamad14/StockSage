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
  offlineProductStorage,
  offlineCustomerStorage,
  offlineSalesStorage,
  offlineSettingsStorage,
  offlineStockLocationStorage,
  offlineProductStockStorage,
  offlineCategoryStorage,
  databaseProductStorage,
  databaseSalesStorage,
  databaseCustomerStorage
} from '@/lib/offline-storage';
import { creditHelpers } from '@/lib/database-storage';

interface CartItem {
  product: OfflineProduct;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface NumericInputState {
  value: string;
  mode: 'quantity' | 'price' | 'discount' | null;
  targetItemId: string | null;
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
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit'>('cash');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [paidAmount, setPaidAmount] = useState(0);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastSale, setLastSale] = useState<OfflineSale | null>(null);
  const [loading, setLoading] = useState(true);
  const [numericInput, setNumericInput] = useState<NumericInputState>({
    value: '',
    mode: null,
    targetItemId: null
  });
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('percentage');

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
      // Simple sales period implementation without external helpers
      const today = new Date().toISOString().split('T')[0];
      const todaysSales = await databaseSalesStorage.getAll();
      const todaysSalesFiltered = todaysSales.filter(sale => 
        sale.date.startsWith(today)
      );
      
      const totalSales = todaysSalesFiltered.reduce((sum, sale) => sum + sale.totalAmount, 0);
      const totalTransactions = todaysSalesFiltered.length;
      
      setSalesPeriodStats({
        totalSales,
        totalTransactions,
        averageTransaction: totalTransactions > 0 ? totalSales / totalTransactions : 0
      });
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
    setDiscountAmount(0);
    setNumericInput({ value: '', mode: null, targetItemId: null });
  };

  // Numeric keypad functions
  const handleNumericInput = (digit: string) => {
    if (digit === 'clear') {
      setNumericInput({ value: '', mode: null, targetItemId: null });
      return;
    }
    
    if (digit === 'backspace') {
      setNumericInput(prev => ({ ...prev, value: prev.value.slice(0, -1) }));
      return;
    }
    
    if (digit === 'enter') {
      applyNumericInput();
      return;
    }
    
    setNumericInput(prev => ({ ...prev, value: prev.value + digit }));
  };

  const applyNumericInput = () => {
    const value = parseFloat(numericInput.value);
    if (isNaN(value)) return;

    switch (numericInput.mode) {
      case 'quantity':
        if (numericInput.targetItemId) {
          updateCartItemQuantity(numericInput.targetItemId, value);
        }
        break;
      case 'price':
        if (numericInput.targetItemId) {
          setCart(cart.map(item => 
            item.product.id === numericInput.targetItemId
              ? { ...item, unitPrice: value, totalPrice: value * item.quantity }
              : item
          ));
        }
        break;
      case 'discount':
        setDiscountAmount(value);
        break;
    }
    
    setNumericInput({ value: '', mode: null, targetItemId: null });
  };

  // Function button handlers
  const handleVoidLastItem = () => {
    if (cart.length > 0) {
      const newCart = [...cart];
      newCart.pop();
      setCart(newCart);
    }
  };

  const handleDiscountMode = () => {
    setNumericInput({ value: '', mode: 'discount', targetItemId: null });
  };

  const handleQuantityMode = (itemId?: string) => {
    if (itemId) {
      setNumericInput({ value: '', mode: 'quantity', targetItemId: itemId });
    }
  };

  const handlePriceMode = (itemId?: string) => {
    if (itemId) {
      setNumericInput({ value: '', mode: 'price', targetItemId: itemId });
    }
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const discountValue = discountType === 'percentage' 
    ? (subtotal * discountAmount / 100)
    : discountAmount;
  const subtotalAfterDiscount = Math.max(0, subtotal - discountValue);
  const tax = subtotalAfterDiscount * 0.2; // 20% TVA for Morocco
  const total = subtotalAfterDiscount + tax;
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
        discountAmount: discountValue,
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
        notes: discountValue > 0 ? `Remise appliquée: ${discountType === 'percentage' ? `${discountAmount}%` : `${discountAmount} DH`}` : undefined
      };

      // Save sale to database
      const createdSale = await databaseSalesStorage.create(saleData);

      // Handle credit transaction if payment method is credit
      if (paymentMethod === 'credit' && selectedCustomer) {
        try {
          console.log('Processing credit sale for customer:', selectedCustomer.id, 'Amount:', total);
          
          // Update customer credit balance
          const currentBalance = selectedCustomer.creditBalance || 0;
          const newBalance = currentBalance + total;
          
          await databaseCustomerStorage.update(selectedCustomer.id, {
            creditBalance: newBalance
          });
          
          // Record credit transaction via API
          await creditHelpers.addCreditSale(selectedCustomer.id, total, createdSale.id?.toString() || '');
          
          console.log('Credit sale recorded successfully. New balance:', newBalance);
          
          // Update local customer state to reflect new balance
          setCustomers(prevCustomers => 
            prevCustomers.map(c => 
              c.id === selectedCustomer.id 
                ? { ...c, creditBalance: newBalance }
                : c
            )
          );
          
        } catch (creditError) {
          console.error('Error processing credit transaction:', creditError);
          toast({
            title: "Warning",
            description: "Sale completed but credit recording failed",
            variant: "destructive",
          });
        }
      }

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

          // Update primary warehouse stock to keep in sync
          if (primaryWarehouse) {
            await offlineProductStockStorage.upsert({
              productId: item.product.id,
              locationId: primaryWarehouse.id,
              quantity: newQuantity,
              minStockLevel: 0
            });
          }

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
    <div className="flex h-screen bg-gray-100">
      {/* Left Panel - Thermal Printer Receipt */}
      <div className="w-96 bg-white border-r-2 border-gray-300 flex flex-col h-screen">
        {/* Receipt Header */}
        <div className="bg-blue-600 text-white p-4 flex-shrink-0">
          <h2 className="text-lg font-bold">TICKET DE CAISSE</h2>
          <div className="text-sm opacity-90">#{new Date().getTime().toString().slice(-6)}</div>
        </div>

        {/* Receipt Content - Scrollable */}
        <div className="p-4 bg-gray-50 font-mono text-sm overflow-y-auto" style={{height: 'calc(100vh - 160px - 380px)'}}>
          <div className="bg-white p-4 rounded shadow-sm">
            <div className="text-center border-b pb-2 mb-4">
              <div className="font-bold">STOCKSAGE POS</div>
              <div className="text-xs text-gray-500">Restaurant & Commerce</div>
              <div className="text-xs text-gray-500">{new Date().toLocaleString('fr-MA')}</div>
            </div>
            
            {/* Payment Method Display */}
            <div className="mb-4 p-2 bg-gray-100 rounded">
              <div className="text-xs font-semibold mb-1">MODE DE PAIEMENT:</div>
              <div className="flex items-center space-x-1">
                {paymentMethod === 'cash' && <span className="text-green-600 font-bold">💰 ESPÈCES</span>}
                {paymentMethod === 'credit' && <span className="text-purple-600 font-bold">📋 CRÉDIT</span>}
              </div>
            </div>
            
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
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in">🚶 Client de passage</SelectItem>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      👤 {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {cart.length === 0 ? (
              <div className="text-center text-gray-400 py-4">
                <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Aucun article</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item, index) => (
                  <div key={item.product.id} className="flex justify-between text-xs">
                    <div className="flex-1">
                      <div>{item.product.name}</div>
                      <div className="text-gray-500">{item.quantity} x {item.unitPrice.toFixed(2)} DH</div>
                    </div>
                    <div className="font-bold">{item.totalPrice.toFixed(2)} DH</div>
                  </div>
                ))}
                
                <div className="border-t pt-2 mt-4">
                  <div className="flex justify-between">
                    <span>Sous-total:</span>
                    <span>{subtotal.toFixed(2)} DH</span>
                  </div>
                  {discountValue > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Remise:</span>
                      <span>-{discountValue.toFixed(2)} DH</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>TVA (20%):</span>
                    <span>{tax.toFixed(2)} DH</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-1">
                    <span>TOTAL:</span>
                    <span>{total.toFixed(2)} DH</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Action Buttons - Fixed at bottom with specific height */}
        <div className="bg-white border-t flex-shrink-0" style={{height: '380px', padding: '16px'}}>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Button
              onClick={() => {
                setPaymentMethod('cash');
                toast({
                  title: "Mode de paiement",
                  description: "Espèces sélectionné",
                });
              }}
              className={`h-12 text-xs font-bold border-2 transition-all ${
                paymentMethod === 'cash' 
                  ? 'bg-green-600 border-green-800 shadow-lg transform scale-105' 
                  : 'bg-green-500 border-green-600 hover:bg-green-600'
              } text-white`}
            >
              💰 ESPÈCES
              {paymentMethod === 'cash' && <div className="text-xs">✓ ACTIF</div>}
            </Button>
            <Button
              onClick={() => {
                if (selectedCustomer) {
                  setPaymentMethod('credit');
                  toast({
                    title: "Mode de paiement",
                    description: `Crédit pour ${selectedCustomer.name}`,
                  });
                } else {
                  toast({
                    title: "Erreur",
                    description: "Veuillez sélectionner un client pour le paiement à crédit",
                    variant: "destructive",
                  });
                }
              }}
              className={`h-12 text-xs font-bold border-2 transition-all ${
                paymentMethod === 'credit' 
                  ? 'bg-purple-600 border-purple-800 shadow-lg transform scale-105' 
                  : 'bg-purple-500 border-purple-600 hover:bg-purple-600'
              } text-white ${
                !selectedCustomer ? 'opacity-50' : ''
              }`}
            >
              📋 CRÉDIT
              {paymentMethod === 'credit' && <div className="text-xs">✓ ACTIF</div>}
            </Button>
            <Button
              onClick={() => {
                if (cart.length === 0) {
                  toast({
                    title: "Panier vide",
                    description: "Ajoutez des articles pour imprimer un reçu",
                    variant: "destructive",
                  });
                  return;
                }
                
                // Create a temporary receipt for current cart
                const tempReceiptData = {
                  invoiceNumber: `TEMP-${Date.now()}`,
                  date: new Date(),
                  customerName: selectedCustomer?.name,
                  items: cart.map(item => ({
                    name: item.product.name,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalPrice: item.totalPrice
                  })),
                  subtotal: subtotal,
                  discountAmount: discountValue,
                  taxAmount: tax,
                  total: total,
                  paidAmount: paymentMethod === 'cash' ? paidAmount : total,
                  changeAmount: paymentMethod === 'cash' ? change : 0,
                  paymentMethod: paymentMethod
                };
                
                // Use async/await with proper error handling
                (async () => {
                  try {
                    await ThermalReceiptPrinter.printReceipt(tempReceiptData);
                    toast({
                      title: "Impression réussie",
                      description: "Reçu imprimé avec succès",
                    });
                  } catch (error) {
                    console.error('Print error:', error);
                    // Handle specific printer errors with user-friendly messages
                    let errorMessage = "Erreur d'impression inconnue";
                    
                    if (error instanceof Error) {
                      if (error.message.includes('USB device not found')) {
                        errorMessage = "Imprimante non connectée. Vérifiez la connexion USB.";
                      } else if (error.message.includes('Receipt print failed')) {
                        errorMessage = "Impression échouée. Vérifiez l'imprimante.";
                      } else {
                        errorMessage = error.message;
                      }
                    }
                    
                    toast({
                      title: "Problème d'impression",
                      description: errorMessage,
                      variant: "destructive",
                    });
                  }
                })();
              }}
              disabled={cart.length === 0}
              className={`h-12 text-xs font-bold border-2 transition-all ${
                cart.length > 0 
                  ? 'bg-blue-500 hover:bg-blue-600 border-blue-600' 
                  : 'bg-gray-400 border-gray-500'
              } text-white`}
            >
              🖨️ IMPRIMER
            </Button>
            <Button
              onClick={() => {
                clearCart();
                toast({
                  title: "Panier effacé",
                  description: "Tous les articles ont été supprimés",
                });
              }}
              className="h-12 text-xs font-bold bg-red-500 hover:bg-red-700 text-white border-2 border-red-600 transition-all hover:shadow-lg"
            >
              🗑️ EFFACER
            </Button>
          </div>
          
          {/* Cash Amount Input for Cash Payment */}
          {paymentMethod === 'cash' && cart.length > 0 && (
            <div className="mb-3 p-3 bg-green-50 border-2 border-green-200 rounded">
              <label className="block text-xs font-semibold mb-2 text-green-800">MONTANT REÇU:</label>
              <Input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="h-10 text-lg font-bold text-center border-2 border-green-300"
              />
              {paidAmount >= total && paidAmount > 0 && (
                <div className="mt-2 p-2 bg-green-100 rounded text-center">
                  <div className="text-xs font-semibold text-green-800">MONNAIE:</div>
                  <div className="text-lg font-bold text-green-700">{change.toFixed(2)} DH</div>
                </div>
              )}
            </div>
          )}
          
          <Button
            onClick={() => {
              if (cart.length === 0) {
                toast({
                  title: "Panier vide",
                  description: "Ajoutez des articles avant d'encaisser",
                  variant: "destructive",
                });
                return;
              }
              if (paymentMethod === 'credit' && !selectedCustomer) {
                toast({
                  title: "Client requis",
                  description: "Sélectionnez un client pour le paiement à crédit",
                  variant: "destructive",
                });
                return;
              }
              if (paymentMethod === 'cash' && paidAmount < total) {
                toast({
                  title: "Montant insuffisant",
                  description: `Veuillez saisir au moins ${total.toFixed(2)} DH`,
                  variant: "destructive",
                });
                return;
              }
              // Process sale directly
              processSale();
            }}
            disabled={cart.length === 0}
            className={`w-full h-14 text-lg font-bold transition-all ${
              cart.length > 0 
                ? 'bg-orange-500 hover:bg-orange-600 shadow-lg hover:shadow-xl transform hover:scale-105' 
                : 'bg-gray-400 cursor-not-allowed'
            } text-white border-2 border-orange-600`}
          >
            🛒 ENCAISSER ({cart.length})
            {cart.length > 0 && (
              <div className="ml-2 text-sm">
                {total.toFixed(2)} DH
              </div>
            )}
          </Button>
        </div>
      </div>
      
      {/* Right Panel - Products */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar with Search */}
        <div className="bg-white p-4 border-b shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Rechercher produits..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Vendeur: Admin</div>
              <div className="text-sm font-medium">{new Date().toLocaleDateString('fr-MA')}</div>
            </div>
          </div>
        </div>
        
        {/* Horizontal Categories */}
        <div className="bg-white border-b p-2">
          <div className="flex space-x-2 overflow-x-auto">
            <Button
              onClick={() => setSelectedCategory('all')}
              className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap ${
                selectedCategory === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              🍽️ TOUS
            </Button>
            {categories.map(category => (
              <Button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                🏷️ {category.name.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="grid grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredProducts.map((product, index) => {
              const colors = [
                'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
                'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-orange-500',
                'bg-teal-500', 'bg-cyan-500', 'bg-lime-500', 'bg-amber-500'
              ];
              const bgColor = colors[index % colors.length];
              
              return (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className={`${bgColor} text-white rounded-xl p-4 cursor-pointer hover:shadow-lg transform hover:scale-105 transition-all duration-200 active:scale-95`}
                >
                  <div className="text-center">
                    <div className="text-3xl mb-2">🍽️</div>
                    <h3 className="font-bold text-sm mb-2 line-clamp-2">
                      {product.name}
                    </h3>
                    <div className="bg-white bg-opacity-20 rounded-lg py-1 px-2">
                      <div className="font-bold text-lg">
                        {(product.sellingPrice || 0).toFixed(0)} DH
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>



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
