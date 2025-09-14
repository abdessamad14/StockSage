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
import { useOfflineAuth } from '@/hooks/use-offline-auth';
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
  Printer,
  ScanLine,
  LogOut,
  Clock,
  TrendingUp,
  Eye,
  Grid3X3,
  List,
  Calendar
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
  const { user, logout } = useOfflineAuth();
  
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
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit' | 'card'>('cash');
  const [customCashAmount, setCustomCashAmount] = useState<string>('');
  const [numericInput, setNumericInput] = useState<{
    value: string;
    mode: 'price' | 'quantity' | null;
    targetItemId: string | null;
  }>({ value: '', mode: null, targetItemId: null });
  const [quantityInputs, setQuantityInputs] = useState<{[key: string]: string}>({});
  const [paidAmount, setPaidAmount] = useState(0);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastSale, setLastSale] = useState<OfflineSale | null>(null);
  const [loading, setLoading] = useState(true);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('percentage');
  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  const [lastKeyTime, setLastKeyTime] = useState(0);
  
  // Right sidebar state
  const [rightSidebarView, setRightSidebarView] = useState<'orders' | 'products'>('orders');
  const [todaysOrders, setTodaysOrders] = useState<OfflineSale[]>([]);
  const [todaysTurnover, setTodaysTurnover] = useState({
    total: 0,
    paid: 0,
    unpaid: 0,
    credit: 0,
    ordersCount: 0
  });

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
        
        // Debug logging
        console.log('Loaded products:', productsData.length);
        console.log('Loaded categories:', categoriesData);
        console.log('Sample product categoryIds:', productsData.slice(0, 3).map(p => ({ name: p.name, categoryId: p.categoryId })));
        
        // Fix products without categoryId by assigning them to first available category
        if (categoriesData.length > 0) {
          const defaultCategoryId = categoriesData[0].id;
          const updatedProducts = productsData.map(product => ({
            ...product,
            categoryId: product.categoryId || defaultCategoryId
          }));
          setProducts(updatedProducts);
          
          // Update products in database with category IDs
          for (const product of productsData) {
            if (!product.categoryId) {
              try {
                await databaseProductStorage.update(product.id, {
                  categoryId: defaultCategoryId
                });
              } catch (error) {
                console.error('Error updating product category:', error);
              }
            }
          }
        } else {
          setProducts(productsData);
        }
        
        // Load current sales period (commented out - methods don't exist)
        // const currentPeriod = await offlineSalesStorage.getCurrentSalesPeriod();
        // setCurrentSalesPeriod(currentPeriod);
        
        // if (currentPeriod) {
        //   const stats = await offlineSalesStorage.getSalesPeriodStats(currentPeriod.id);
        //   setSalesPeriodStats(stats);
        // }
        
        // Load today's orders and calculate turnover
        await loadTodaysOrders();
        
      } catch (error) {
        console.error('Error loading POS data:', error);
        toast({
          title: "Erreur de chargement",
          description: "Impossible de charger les données du POS",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [toast]);

  // Load today's orders and calculate turnover
  const loadTodaysOrders = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const allSales = await databaseSalesStorage.getAll();
      console.log('All sales from database:', allSales);
      
      const todaysSales = allSales.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= today && saleDate < tomorrow;
      });
      
      console.log('Today\'s sales:', todaysSales);
      console.log('Sample sale items:', todaysSales[0]?.items);
      
      setTodaysOrders(todaysSales);
      
      // Calculate turnover statistics
      const total = todaysSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
      const paid = todaysSales
        .filter(sale => sale.paymentMethod !== 'credit' && sale.paidAmount >= sale.totalAmount)
        .reduce((sum, sale) => sum + sale.totalAmount, 0);
      const credit = todaysSales
        .filter(sale => sale.paymentMethod === 'credit')
        .reduce((sum, sale) => sum + sale.totalAmount, 0);
      const unpaid = total - paid - credit;
      
      setTodaysTurnover({
        total,
        paid,
        unpaid,
        credit,
        ordersCount: todaysSales.length
      });
    } catch (error) {
      console.error('Error loading today\'s orders:', error);
    }
  };

  // Load order into cart
  const loadOrderIntoCart = async (sale: OfflineSale) => {
    console.log('Loading order into cart:', sale);
    try {
      const cartItems: CartItem[] = [];
      
      for (const item of sale.items) {
        console.log('Processing item:', item);
        // Try to find the actual product
        let product = products.find(p => p.id === item.productId);
        
        if (!product) {
          console.log('Product not found, creating minimal product for:', item.productId);
          // Create a minimal product object if not found
          product = {
            id: item.productId,
            name: item.productName,
            sellingPrice: item.unitPrice,
            categoryId: '',
            barcode: '',
            costPrice: 0,
            minStockLevel: 0,
            description: '',
            image: '',
            active: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            quantity: 0
          };
        } else {
          console.log('Found existing product:', product.name);
        }
        
        const cartItem: CartItem = {
          product: product,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        };
        
        console.log('Adding cart item:', cartItem);
        cartItems.push(cartItem);
      }
      
      console.log('Setting cart with items:', cartItems);
      setCart(cartItems);
      setSelectedCustomer(null); // Reset customer selection
      
      toast({
        title: "Commande chargée",
        description: `Commande #${sale.id} chargée dans le panier avec ${cartItems.length} articles`,
      });
    } catch (error) {
      console.error('Error loading order into cart:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la commande: " + (error as Error).message,
        variant: "destructive",
      });
    }
  };

  // USB Barcode Scanner Handler
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const currentTime = Date.now();
      
      // If more than 100ms has passed since last key, start new barcode
      if (currentTime - lastKeyTime > 100) {
        setBarcodeBuffer('');
      }
      
      setLastKeyTime(currentTime);
      
      // Handle Enter key (barcode scan complete)
      if (event.key === 'Enter') {
        event.preventDefault();
        if (barcodeBuffer.length > 0) {
          handleBarcodeScanned(barcodeBuffer);
          setBarcodeBuffer('');
        }
        return;
      }
      
      // Only capture alphanumeric characters and common barcode characters
      if (/^[a-zA-Z0-9\-_]$/.test(event.key)) {
        // Prevent default only if we're not in an input field
        const target = event.target as HTMLElement;
        if (!target.matches('input, textarea, select')) {
          event.preventDefault();
          setBarcodeBuffer(prev => prev + event.key);
        }
      }
    };

    // Add event listener to document
    document.addEventListener('keydown', handleKeyPress);
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [barcodeBuffer, lastKeyTime, products]);

  // Handle barcode scan result
  const handleBarcodeScanned = (barcode: string) => {
    console.log('Barcode scanned:', barcode);
    
    // Find product by barcode
    const product = products.find(p => 
      p.barcode === barcode || 
      p.barcode === barcode.trim() ||
      p.id === barcode
    );
    
    if (product) {
      addToCart(product);
      toast({
        title: "Produit ajouté",
        description: `${product.name} ajouté au panier`,
      });
    } else {
      toast({
        title: "Produit non trouvé",
        description: `Aucun produit trouvé avec le code-barres: ${barcode}`,
        variant: "destructive",
      });
    }
  };

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
    
    // Debug logging
    if (selectedCategory !== 'all') {
      console.log('Filtering - Product:', product.name, 'CategoryId:', product.categoryId, 'Selected:', selectedCategory, 'Matches:', matchesCategory);
    }
    
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
        ? { ...item, quantity, totalPrice: item.unitPrice * quantity }
        : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setDiscountAmount(0);
    setPaidAmount(0);
  };

  const updateCartItemPrice = (productId: string, newPrice: number) => {
    setCart(prevCart => 
      prevCart.map(item => 
        item.product.id === productId 
          ? { ...item, unitPrice: newPrice, totalPrice: newPrice * item.quantity }
          : item
      )
    );
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
  const tax = 0; // No tax
  const total = subtotalAfterDiscount;
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
  const processSale = async (paymentMethodOverride?: 'cash' | 'credit', paidAmountOverride?: number) => {
    const effectivePaymentMethod = paymentMethodOverride || paymentMethod;
    const effectivePaidAmount = paidAmountOverride || paidAmount;
    if (cart.length === 0) {
      toast({
        title: "Error",
        description: "Cart is empty",
        variant: "destructive",
      });
      return;
    }

    if (effectivePaymentMethod === 'cash' && effectivePaidAmount < total) {
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
        paidAmount: effectivePaymentMethod === 'cash' ? effectivePaidAmount : total,
        changeAmount: effectivePaymentMethod === 'cash' ? (effectivePaidAmount - total) : 0,
        paymentMethod: effectivePaymentMethod,
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
      console.log('Creating sale with data:', saleData);
      const createdSale = await databaseSalesStorage.create(saleData);
      console.log('Created sale:', createdSale);

      // Handle credit transaction if payment method is credit
      if (effectivePaymentMethod === 'credit' && selectedCustomer) {
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
      
      // Reload today's orders to show the new order immediately
      await loadTodaysOrders();

      // Auto-print thermal receipt after successful payment
      try {
        const receiptData = {
          invoiceNumber: createdSale.invoiceNumber,
          date: new Date(createdSale.date),
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
          paidAmount: effectivePaymentMethod === 'cash' ? effectivePaidAmount : total,
          changeAmount: effectivePaymentMethod === 'cash' ? (effectivePaidAmount - total) : 0,
          paymentMethod: effectivePaymentMethod
        };
        
        await ThermalReceiptPrinter.printReceipt(receiptData);
        
        toast({
          title: "Paiement réussi",
          description: "Reçu imprimé automatiquement",
        });
      } catch (printError) {
        console.error('Auto-print error:', printError);
        toast({
          title: "Paiement réussi",
          description: "Vente terminée (erreur d'impression)",
        });
      }
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
      <div className="w-[450px] bg-white border-r-2 border-gray-300 flex flex-col h-screen">
        {/* Receipt Header */}
        <div className="bg-blue-600 text-white p-4 flex-shrink-0">
          <h2 className="text-lg font-bold">TICKET DE CAISSE</h2>
          <div className="text-sm opacity-90">#{new Date().getTime().toString().slice(-6)}</div>
        </div>

        {/* Receipt Content - Scrollable */}
        <div className="p-2 bg-gray-50 font-mono text-xs overflow-y-auto" style={{height: 'calc(100vh - 160px - 280px)'}}>
          <div className="bg-white p-3 rounded shadow-sm">
            <div className="text-center border-b pb-1 mb-2">
              <div className="font-bold text-sm">STOCKSAGE POS</div>
              <div className="text-xs text-gray-500">{new Date().toLocaleString('fr-MA')}</div>
            </div>
            
            {/* Payment Method & Customer - Compact */}
            <div className="mb-2 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Mode:</span>
                <span className="font-semibold">
                  {paymentMethod === 'cash' && <span className="text-green-600">💰 ESPÈCES</span>}
                  {paymentMethod === 'credit' && <span className="text-purple-600">📋 CRÉDIT</span>}
                </span>
              </div>
              
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
                <SelectTrigger className="h-6 text-xs">
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
              <div className="text-center text-gray-400 py-3">
                <Receipt className="h-6 w-6 mx-auto mb-1 opacity-50" />
                <p className="text-xs">Aucun article</p>
              </div>
            ) : (
              <div className="space-y-1">
                {cart.map((item, index) => (
                  <div key={item.product.id} className="flex justify-between text-xs border-b border-gray-100 pb-1">
                    <div className="flex-1 pr-2">
                      <div className="font-medium truncate">{item.product.name}</div>
                      <div className="text-gray-500 text-xs flex items-center gap-1">
                        <input
                          type="text"
                          value={quantityInputs[item.product.id] ?? item.quantity.toString()}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Update local input state immediately
                            setQuantityInputs(prev => ({
                              ...prev,
                              [item.product.id]: value
                            }));
                          }}
                          onBlur={(e) => {
                            const value = e.target.value;
                            // Process the value when user finishes editing
                            if (value.includes('*')) {
                              const parts = value.split('*');
                              if (parts.length === 2) {
                                const num1 = parseFloat(parts[0]) || 0;
                                const num2 = parseFloat(parts[1]) || 0;
                                const calculatedQty = num1 * num2;
                                if (calculatedQty > 0) {
                                  updateCartItemQuantity(item.product.id, calculatedQty);
                                  // Clear the local input state
                                  setQuantityInputs(prev => {
                                    const newState = { ...prev };
                                    delete newState[item.product.id];
                                    return newState;
                                  });
                                }
                              }
                            } else {
                              const newQty = parseFloat(value) || 0;
                              if (newQty > 0) {
                                updateCartItemQuantity(item.product.id, newQty);
                                // Clear the local input state
                                setQuantityInputs(prev => {
                                  const newState = { ...prev };
                                  delete newState[item.product.id];
                                  return newState;
                                });
                              }
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                          className="w-16 px-1 py-0 text-xs border border-gray-300 rounded bg-white text-center"
                          placeholder="qty"
                        />
                        x 
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => {
                            const newPrice = parseFloat(e.target.value) || 0;
                            updateCartItemPrice(item.product.id, newPrice);
                          }}
                          className="w-12 px-1 py-0 text-xs border border-gray-300 rounded bg-white text-center"
                          step="0.01"
                          min="0"
                        />
                        DH
                      </div>
                    </div>
                    <div className="font-bold text-right">{item.totalPrice.toFixed(2)} DH</div>
                  </div>
                ))}
                
                <div className="border-t pt-2 mt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Sous-total:</span>
                    <span>{subtotal.toFixed(2)} DH</span>
                  </div>
                  {discountValue > 0 && (
                    <div className="flex justify-between text-red-600 text-xs">
                      <span>Remise:</span>
                      <span>-{discountValue.toFixed(2)} DH</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm border-t pt-1 bg-blue-50 px-2 py-1 rounded">
                    <span>TOTAL:</span>
                    <span>{total.toFixed(2)} DH</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Action Buttons - Compact Fixed Bottom */}
        <div className="bg-white border-t flex-shrink-0" style={{height: '280px', padding: '12px'}}>
          {/* Quick Cash Payment Buttons */}
          <div className="mb-3">
            <div className="text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Paiement Rapide</div>
            <div className="grid grid-cols-2 gap-1 mb-2">
              {[20, 50, 100, 200].map((amount) => {
                const getBanknoteColor = (value: number) => {
                  switch(value) {
                    case 20: return 'from-green-500 to-green-600 border-green-700';
                    case 50: return 'from-blue-500 to-blue-600 border-blue-700';
                    case 100: return 'from-red-500 to-red-600 border-red-700';
                    case 200: return 'from-purple-500 to-purple-600 border-purple-700';
                    default: return 'from-gray-500 to-gray-600 border-gray-700';
                  }
                };

                return (
                  <Button
                    key={amount}
                    onClick={async () => {
                      if (cart.length === 0) {
                        toast({
                          title: "Panier vide",
                          description: "Ajoutez des articles avant de procéder au paiement",
                          variant: "destructive",
                        });
                        return;
                      }
                      
                      if (amount < total) {
                        toast({
                          title: "Montant insuffisant",
                          description: `${amount} DH < ${total.toFixed(2)} DH requis`,
                          variant: "destructive",
                        });
                        return;
                      }
                      
                      // Set cash payment with this amount
                      setPaymentMethod('cash');
                      setPaidAmount(amount);
                      
                      const changeAmount = amount - total;
                      
                      // Show change notification
                      if (changeAmount > 0) {
                        toast({
                          title: "Monnaie à rendre",
                          description: `${changeAmount.toFixed(2)} DH`,
                          duration: 5000,
                        });
                      }
                      
                      // Process the sale immediately
                      await processSale('cash', amount);
                    }}
                    className={`h-14 p-0 border-2 border-gray-300 transition-all relative overflow-hidden rounded-lg ${
                      amount < total ? 'opacity-50' : 'hover:scale-105 hover:shadow-lg'
                    }`}
                    disabled={amount < total}
                  >
                    {/* Full Banknote Background */}
                    <img 
                      src={`/images/banknotes/${amount}-dh.jpg`} 
                      alt={`${amount} DH`}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    
                    {/* Dark overlay for text readability */}
                    <div className="absolute inset-0 bg-black/20"></div>
                    
                    {/* Content overlay */}
                    <div className="relative z-10 flex items-center justify-between w-full h-full p-2">
                      {/* Amount Info */}
                      <div className="text-left">
                        <div className="text-lg font-bold text-white drop-shadow-lg">{amount} DH</div>
                      </div>
                      
                      {/* Payment Icon */}
                      <div className="text-white/80">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/>
                          <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd"/>
                        </svg>
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>
            
            {/* Custom Amount Input */}
            <div className="flex gap-1">
              <input
                type="number"
                placeholder="Autre montant"
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                value={customCashAmount}
                onChange={(e) => setCustomCashAmount(e.target.value)}
                min={total}
                step="0.01"
              />
              <Button
                onClick={async () => {
                  const amount = parseFloat(customCashAmount);
                  if (!amount || amount < total) {
                    toast({
                      title: "Montant invalide",
                      description: `Minimum ${total.toFixed(2)} DH requis`,
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  setPaymentMethod('cash');
                  setPaidAmount(amount);
                  
                  const changeAmount = amount - total;
                  if (changeAmount > 0) {
                    toast({
                      title: "Monnaie à rendre",
                      description: `${changeAmount.toFixed(2)} DH`,
                      duration: 5000,
                    });
                  }
                  
                  await processSale('cash', amount);
                  setCustomCashAmount('');
                }}
                className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded"
                disabled={!customCashAmount || parseFloat(customCashAmount) < total}
              >
                OK
              </Button>
            </div>
          </div>

          {/* Other Payment Methods */}
          <div className="grid grid-cols-3 gap-1 mb-2">
            <Button
              onClick={async () => {
                if (cart.length === 0) {
                  toast({
                    title: "Panier vide",
                    description: "Ajoutez des articles avant de procéder au paiement",
                    variant: "destructive",
                  });
                  return;
                }
                
                if (selectedCustomer) {
                  // Process credit sale immediately
                  await processSale('credit');
                } else {
                  toast({
                    title: "Erreur",
                    description: "Veuillez sélectionner un client pour le paiement à crédit",
                    variant: "destructive",
                  });
                }
              }}
              className={`h-10 text-xs font-bold border-2 transition-all ${
                paymentMethod === 'credit' 
                  ? 'bg-purple-600 border-purple-800 shadow-lg transform scale-105' 
                  : 'bg-purple-500 border-purple-600 hover:bg-purple-600'
              } text-white ${
                !selectedCustomer ? 'opacity-50' : ''
              }`}
            >
              📋 CRÉDIT
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
              className={`h-10 text-xs font-bold border-2 transition-all ${
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
              className="h-10 text-xs font-bold bg-red-500 hover:bg-red-700 text-white border-2 border-red-600 transition-all hover:shadow-lg"
            >
              🗑️ EFFACER
            </Button>
          </div>
          
          
        </div>
      </div>
      
      {/* Middle Panel - Products */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar with Search and Toggle */}
        <div className="bg-white p-4 border-b shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder={rightSidebarView === 'products' ? "Rechercher produits ou scanner code-barres..." : "Rechercher dans les commandes..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
            </div>
            <div className="flex items-center space-x-2">
              {/* View Toggle */}
              <div className="flex bg-gray-200 rounded-lg p-1">
                <Button
                  variant={rightSidebarView === 'products' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setRightSidebarView('products')}
                  className="px-4 py-2"
                >
                  <Grid3X3 className="h-4 w-4 mr-2" />
                  Produits
                </Button>
                <Button
                  variant={rightSidebarView === 'orders' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setRightSidebarView('orders')}
                  className="px-4 py-2"
                >
                  <List className="h-4 w-4 mr-2" />
                  Commandes
                </Button>
              </div>
              <div className="flex items-center space-x-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                <ScanLine className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">Scanner USB Actif</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-sm text-gray-500">Vendeur: {user?.name || 'Unknown'}</div>
                  <div className="text-sm font-medium">{new Date().toLocaleDateString('fr-MA')}</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  className="flex items-center space-x-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  title="Se déconnecter"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            </div>
          </div>
          
          {/* Turnover Statistics - Only show in orders view */}
          {rightSidebarView === 'orders' && (
            <div className="mt-4 grid grid-cols-4 gap-3">
              <div className="bg-blue-100 p-3 rounded-lg text-center">
                <div className="text-blue-600 font-bold text-lg">{todaysTurnover.ordersCount}</div>
                <div className="text-blue-500 text-sm">Commandes</div>
              </div>
              <div className="bg-green-100 p-3 rounded-lg text-center">
                <div className="text-green-600 font-bold text-lg">{todaysTurnover.total.toFixed(0)} DH</div>
                <div className="text-green-500 text-sm">CA Total</div>
              </div>
              <div className="bg-emerald-100 p-3 rounded-lg text-center">
                <div className="text-emerald-600 font-bold text-lg">{todaysTurnover.paid.toFixed(0)} DH</div>
                <div className="text-emerald-500 text-sm">Payé</div>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg text-center">
                <div className="text-purple-600 font-bold text-lg">{todaysTurnover.credit.toFixed(0)} DH</div>
                <div className="text-purple-500 text-sm">Crédit</div>
              </div>
            </div>
          )}
          
          {/* Barcode Buffer Display (for debugging) */}
          {barcodeBuffer && (
            <div className="mt-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded text-sm">
              <span className="text-blue-600 font-medium">Scan en cours: </span>
              <span className="font-mono">{barcodeBuffer}</span>
            </div>
          )}
        </div>
        
        {/* Content Area - Products or Orders */}
        <div className="flex-1 overflow-y-auto">
          {rightSidebarView === 'products' ? (
            <>
              {/* Horizontal Categories */}
              <div className="bg-white border-b p-4">
                <div className="flex space-x-6 overflow-x-auto pb-2">
                  <div
                    onClick={() => setSelectedCategory('all')}
                    className="flex flex-col items-center space-y-2 cursor-pointer min-w-[60px]"
                  >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-sm ${
                      selectedCategory === 'all' ? 'bg-blue-500' : 'bg-gray-100'
                    }`}>
                      <span className={`text-2xl ${selectedCategory === 'all' ? 'text-white' : 'text-gray-600'}`}>🍽️</span>
                    </div>
                    <span className={`text-xs font-medium ${
                      selectedCategory === 'all' ? 'text-blue-600' : 'text-gray-600'
                    }`}>TOUS</span>
                  </div>
                  {categories.map(category => {
                    console.log('Category:', category.name, 'Has image:', !!category.image, 'Image length:', category.image?.length);
                    return (
                    <div
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className="flex flex-col items-center space-y-2 cursor-pointer min-w-[60px]"
                    >
                      {category.image && category.image.trim() !== '' ? (
                        <div className={`w-14 h-14 rounded-full overflow-hidden shadow-sm ${
                          selectedCategory === category.id ? 'ring-2 ring-blue-500' : ''
                        }`}>
                          <img 
                            src={decodeURIComponent(category.image)} 
                            alt={category.name}
                            className="w-full h-full object-cover"
                            onLoad={() => console.log('Image loaded for', category.name)}
                            onError={(e) => console.log('Image error for', category.name, e)}
                          />
                        </div>
                      ) : (
                        <div 
                          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-sm ${
                            selectedCategory === category.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          <span className="text-2xl">🏷️</span>
                        </div>
                      )}
                      <span className={`text-xs font-medium text-center ${
                        selectedCategory === category.id ? 'text-blue-600' : 'text-gray-600'
                      }`}>{category.name.toUpperCase()}</span>
                    </div>
                    );
                  })}
                </div>
              </div>

              {/* Products Grid */}
              <div className="p-4">
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
                        className={`${bgColor} text-white rounded-xl p-4 cursor-pointer hover:shadow-lg transform hover:scale-105 transition-all duration-200 active:scale-95 relative overflow-hidden`}
                      >
                        <div className="text-center">
                          {product.image ? (
                            <div className="mb-2 relative">
                              <img 
                                src={product.image} 
                                alt={product.name}
                                className="w-full h-16 object-cover rounded-lg mx-auto"
                              />
                            </div>
                          ) : (
                            <div className="text-3xl mb-2">🍽️</div>
                          )}
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
            </>
          ) : (
            /* Orders View */
            <div className="p-4">
              {todaysOrders.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <Clock className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Aucune commande aujourd'hui</h3>
                  <p className="text-sm">Les commandes apparaîtront ici une fois créées</p>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  {/* Table Header */}
                  <div className="bg-gray-50 border-b border-gray-200 px-4 py-3">
                    <div className="grid grid-cols-6 gap-4 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      <div>N° Commande</div>
                      <div>Heure</div>
                      <div>Articles</div>
                      <div>Montant</div>
                      <div>Paiement</div>
                      <div>Statut</div>
                    </div>
                  </div>
                  
                  {/* Table Body */}
                  <div className="divide-y divide-gray-200">
                    {todaysOrders.map((order) => (
                      <div
                        key={order.id}
                        className="grid grid-cols-6 gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => loadOrderIntoCart(order)}
                      >
                        <div className="text-sm font-medium text-blue-600">
                          #{order.id}
                        </div>
                        <div className="text-sm text-gray-900">
                          {new Date(order.date).toLocaleTimeString('fr-FR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                        <div className="text-sm text-gray-900">
                          {order.items.length} article{order.items.length > 1 ? 's' : ''}
                        </div>
                        <div className="text-sm font-semibold text-green-600">
                          {order.totalAmount.toFixed(0)} DH
                        </div>
                        <div className="text-sm text-gray-900 capitalize">
                          {order.paymentMethod === 'cash' ? 'Espèces' : 
                           order.paymentMethod === 'credit' ? 'Crédit' : 
                           order.paymentMethod === 'card' ? 'Carte' : order.paymentMethod}
                        </div>
                        <div>
                          <Badge 
                            variant={
                              order.paymentMethod === 'credit' ? 'secondary' :
                              order.paidAmount >= order.totalAmount ? 'default' : 'destructive'
                            }
                            className="text-xs"
                          >
                            {order.paymentMethod === 'credit' ? 'Crédit' :
                             order.paidAmount >= order.totalAmount ? 'Payé' : 'Impayé'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
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
              onClick={() => {}} 
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
