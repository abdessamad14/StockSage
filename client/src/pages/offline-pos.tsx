import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ThermalReceiptPrinter, ReceiptData } from '@/lib/thermal-receipt-printer';
import { useOfflineAuth } from '@/hooks/use-offline-auth';
import { useOfflineSales } from '@/hooks/use-offline-sales';
import { useI18n } from '@/lib/i18n';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
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
  Calendar,
  CreditCard,
  Settings,
  Home,
  Users,
  Truck,
  BarChart3,
  FileText,
  Warehouse,
  ShoppingBag,
  Info
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
import WeighableProductDialog from '@/components/WeighableProductDialog';

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
  const { user, logout, canDeleteSales } = useOfflineAuth();
  const { deleteSale } = useOfflineSales();
  const { t } = useI18n();
  
  // State variables
  const [products, setProducts] = useState<OfflineProduct[]>([]);
  const [customers, setCustomers] = useState<OfflineCustomer[]>([]);
  const [categories, setCategories] = useState<OfflineCategory[]>([]);
  const [stockLocations, setStockLocations] = useState<OfflineStockLocation[]>([]);
  const [productStocks, setProductStocks] = useState<Record<string, number>>({});
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
    mode: 'price' | 'quantity' | 'discount' | 'payment' | 'barcode' | null;
    targetItemId: string | null;
  }>({ value: '', mode: 'barcode', targetItemId: null });
  const [quantityInputs, setQuantityInputs] = useState<{[key: string]: string}>({});
  const [priceInputs, setPriceInputs] = useState<{[key: string]: string}>({});
  const [paidAmount, setPaidAmount] = useState(0);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastSale, setLastSale] = useState<OfflineSale | null>(null);
  const [loading, setLoading] = useState(true);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('percentage');
  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('today');
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<OfflineSale | null>(null);
  const [lastKeyTime, setLastKeyTime] = useState(Date.now());
  const [rightSidebarView, setRightSidebarView] = useState<'orders' | 'products'>('orders');
  const [todaysOrders, setTodaysOrders] = useState<OfflineSale[]>([]);
  const [todaysTurnover, setTodaysTurnover] = useState({
    total: 0,
    paid: 0,
    unpaid: 0,
    credit: 0,
    ordersCount: 0
  });
  const [weighableDialogOpen, setWeighableDialogOpen] = useState(false);
  const [selectedWeighableProduct, setSelectedWeighableProduct] = useState<OfflineProduct | null>(null);

  // Credit management state
  const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false);
  const [creditInfo, setCreditInfo] = useState<any>(null);
  const [loadingCreditInfo, setLoadingCreditInfo] = useState(false);
  const [creditAmount, setCreditAmount] = useState(0);
  const [creditNote, setCreditNote] = useState('');

  // Product info modal state
  const [productInfoOpen, setProductInfoOpen] = useState(false);
  const [selectedProductInfo, setSelectedProductInfo] = useState<OfflineProduct | null>(null);
  const [quickSearchTerm, setQuickSearchTerm] = useState('');

  const quickSearchResults = useMemo(() => {
    if (!quickSearchTerm.trim()) {
      return [];
    }

    const normalizedQuery = quickSearchTerm.toLowerCase();
    return products
      .filter((product) => {
        const matchesName = product.name.toLowerCase().includes(normalizedQuery);
        const matchesBarcode = product.barcode?.toLowerCase().includes(normalizedQuery);
        const isActive = product.active !== false; // Only show active products
        return (matchesName || matchesBarcode) && isActive;
      })
      .slice(0, 8);
  }, [quickSearchTerm, products]);

  // Filter orders by date
  const filteredOrders = useMemo(() => {
    if (!todaysOrders) return [];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return todaysOrders.filter((order: OfflineSale) => {
      const orderDate = new Date(order.date);
      const orderDay = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());

      switch (dateFilter) {
        case 'today':
          return orderDay.getTime() === today.getTime();
        
        case 'yesterday':
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          return orderDay.getTime() === yesterday.getTime();
        
        case 'this_week':
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          return orderDay >= startOfWeek;
        
        case 'last_week':
          const startOfLastWeek = new Date(today);
          startOfLastWeek.setDate(today.getDate() - today.getDay() - 7);
          const endOfLastWeek = new Date(startOfLastWeek);
          endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
          return orderDay >= startOfLastWeek && orderDay <= endOfLastWeek;
        
        case 'this_month':
          return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
        
        case 'last_month':
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          return orderDate.getMonth() === lastMonth.getMonth() && orderDate.getFullYear() === lastMonth.getFullYear();
        
        case 'last_3_months':
          const threeMonthsAgo = new Date(now);
          threeMonthsAgo.setMonth(now.getMonth() - 3);
          return orderDate >= threeMonthsAgo;
        
        case 'this_year':
          return orderDate.getFullYear() === now.getFullYear();
        
        case 'custom':
          if (!customStartDate || !customEndDate) return true;
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999); // Include full end day
          return orderDate >= start && orderDate <= end;
        
        default:
          return true;
      }
    });
  }, [todaysOrders, dateFilter, customStartDate, customEndDate]);

  // Calculate turnover stats from filtered orders
  const filteredTurnover = useMemo(() => {
    const total = filteredOrders.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const paid = filteredOrders
      .filter(sale => sale.paymentMethod !== 'credit' && sale.paidAmount >= sale.totalAmount)
      .reduce((sum, sale) => sum + sale.totalAmount, 0);
    const credit = filteredOrders
      .filter(sale => sale.paymentMethod === 'credit')
      .reduce((sum, sale) => sum + sale.totalAmount, 0);
    const unpaid = total - paid - credit;
    
    return {
      total,
      paid,
      unpaid,
      credit,
      ordersCount: filteredOrders.length
    };
  }, [filteredOrders]);

  // Function to refresh product stocks from primary warehouse
  const refreshProductStocks = async (productsData: OfflineProduct[], locations: OfflineStockLocation[]) => {
    const primaryWarehouse = locations.find(loc => loc.isPrimary) || locations[0];
    if (!primaryWarehouse) return;
    
    const stockMap: Record<string, number> = {};
    
    for (const product of productsData) {
      try {
        const stock = await offlineProductStockStorage.getByProductAndLocation(
          product.id,
          String(primaryWarehouse.id)
        );
        stockMap[product.id] = stock?.quantity || 0;
      } catch (error) {
        console.warn(`Failed to fetch stock for product ${product.id}:`, error);
        stockMap[product.id] = 0;
      }
    }
    
    setProductStocks(stockMap);
  };

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
        
        // Fetch product stocks from primary warehouse
        await refreshProductStocks(productsData, stockLocationsData);
        
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
          title: t('error'),
          description: t('pos_data_load_error'),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [toast]);

  // Load credit info when customer is selected
  useEffect(() => {
    if (selectedCustomer) {
      loadCustomerCreditInfo(selectedCustomer.id);
    } else {
      setCreditInfo(null);
    }
  }, [selectedCustomer]);

  // Helper function to get product stock quantity
  const getProductStock = (productId: string): number => {
    return productStocks[productId] || 0;
  };

  // Load customer credit info
  const loadCustomerCreditInfo = async (customerId: string) => {
    try {
      setLoadingCreditInfo(true);
      const creditData = await creditHelpers.getCustomerCreditInfo(customerId);
      console.log('Credit info loaded:', creditData);
      setCreditInfo(creditData);
    } catch (error) {
      console.error('Error loading credit info:', error);
      toast({
        title: t('error'),
        description: t('credit_info_load_error'),
        variant: 'destructive'
      });
    } finally {
      setLoadingCreditInfo(false);
    }
  };

  // Handle credit payment
  const handleCreditPayment = async () => {
    if (!selectedCustomer || creditAmount <= 0) return;
    
    try {
      await creditHelpers.addCreditPayment(selectedCustomer.id, creditAmount, creditNote);
      
      // Update customer balance in local state
      const updatedCustomer = await databaseCustomerStorage.getById(selectedCustomer.id);
      if (updatedCustomer) {
        setSelectedCustomer(updatedCustomer);
        setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? updatedCustomer : c));
      }
      
      // Reload credit info
      await loadCustomerCreditInfo(selectedCustomer.id);
      
      // Reset form
      setCreditAmount(0);
      setCreditNote('');
      
      toast({
        title: t('success'),
        description: t('credit_payment_recorded', { amount: creditAmount.toFixed(2) }),
        variant: 'default'
      });
    } catch (error) {
      console.error('Error recording credit payment:', error);
      toast({
        title: t('error'),
        description: t('credit_payment_error'),
        variant: 'destructive'
      });
    }
  };

  // Load all orders (not just today's) for filtering
  const loadTodaysOrders = async () => {
    try {
      const allSales = await databaseSalesStorage.getAll();
      console.log('All sales from database:', allSales);
      
      // Store all orders, filtering will happen in useMemo
      setTodaysOrders(allSales);
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
        // Try to find the actual product (handle both string and number IDs)
        let product = products.find(p => p.id === String(item.productId));
        
        if (!product) {
          console.log('Product not found, creating minimal product for:', item.productId);
          // Create a minimal product object if not found
          product = {
            id: String(item.productId),
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
          console.log('Found existing product:', product.name, 'with barcode:', product.barcode);
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
        title: t('order_loaded'),
        description: t('order_loaded_description', { id: sale.id, count: cartItems.length }),
      });
    } catch (error) {
      console.error('Error loading order into cart:', error);
      toast({
        title: t('error'),
        description: t('order_load_error') + ": " + (error as Error).message,
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
  const handleBarcodeScanned = async (barcode: string) => {
    const trimmedBarcode = barcode.trim();
    console.log('Barcode scanned:', trimmedBarcode, 'Length:', trimmedBarcode.length);
    
    // Extract invoice number from various formats
    let invoiceNumber = trimmedBarcode;
    
    // Check if it's an invoice barcode (format: INVOICE:invoice_number or INVOICEINV-xxx)
    if (trimmedBarcode.startsWith('INVOICE:')) {
      invoiceNumber = trimmedBarcode.replace('INVOICE:', '');
      console.log('Detected INVOICE: format, extracted invoice:', invoiceNumber);
      await loadInvoiceToCart(invoiceNumber);
      return;
    }
    
    // Handle INVOICEINV- format (thermal printer adds INVOICE prefix)
    if (trimmedBarcode.startsWith('INVOICEINV-')) {
      invoiceNumber = trimmedBarcode.replace('INVOICE', '');
      console.log('Detected INVOICEINV- format, extracted invoice:', invoiceNumber);
      await loadInvoiceToCart(invoiceNumber);
      return;
    }
    
    // Check if it's an invoice number (starts with INV- or contains INV-)
    if (trimmedBarcode.startsWith('INV-') || trimmedBarcode.includes('INV-')) {
      console.log('Detected invoice number format, loading invoice:', trimmedBarcode);
      await loadInvoiceToCart(trimmedBarcode);
      return;
    }
    
    // Check if it's just an invoice number (from barcode) in today's orders
    const sale = todaysOrders.find(s => s.invoiceNumber === trimmedBarcode);
    if (sale) {
      console.log('Found sale in todays orders, loading invoice:', trimmedBarcode);
      await loadInvoiceToCart(trimmedBarcode);
      return;
    }
    
    // Find product by barcode
    const product = products.find(p => 
      p.barcode === trimmedBarcode || 
      p.barcode === barcode ||
      p.id === trimmedBarcode
    );
    
    if (product) {
      console.log('Found product by barcode:', product.name);
      addToCart(product);
      toast({
        title: t('product_added'),
        description: t('product_added_to_cart', { name: product.name }),
      });
    } else {
      console.log('No product or invoice found for barcode:', trimmedBarcode);
      toast({
        title: t('product_not_found'),
        description: t('barcode_not_found', { barcode: trimmedBarcode }),
        variant: "destructive",
      });
    }
  };
  
  // Load invoice to cart by scanning receipt barcode
  const loadInvoiceToCart = async (invoiceNumber: string) => {
    try {
      const trimmedInvoice = invoiceNumber.trim();
      console.log('Loading invoice to cart:', trimmedInvoice);
      console.log('Today\'s orders count:', todaysOrders.length);
      
      // First check in today's orders
      let sale = todaysOrders.find(s => s.invoiceNumber === trimmedInvoice);
      console.log('Found in today\'s orders:', !!sale);
      
      // If not found in today's orders, fetch from database
      if (!sale) {
        try {
          console.log('Fetching all sales from database...');
          const allSales = await databaseSalesStorage.getAll();
          console.log('Total sales in database:', allSales.length);
          sale = allSales.find(s => s.invoiceNumber === trimmedInvoice);
          console.log('Found in database:', !!sale);
          
          if (sale) {
            console.log('Sale found:', sale.invoiceNumber, 'Items:', sale.items?.length);
          }
        } catch (error) {
          console.error('Error fetching sales from database:', error);
        }
      }
      
      if (!sale) {
        console.log('Invoice not found:', trimmedInvoice);
        toast({
          title: t('invoice_not_found'),
          description: `Facture ${trimmedInvoice} introuvable`,
          variant: "destructive",
        });
        return;
      }
      
      // Clear current cart
      setCart([]);
      
      // Load sale items into cart with full product data
      const cartItems: CartItem[] = sale.items.map(item => {
        // Find the actual product to get all its data including barcode
        const actualProduct = products.find(p => p.id === String(item.productId));
        
        return {
          product: actualProduct || {
            id: String(item.productId),
            name: item.productName,
            sellingPrice: item.unitPrice,
            categoryId: '',
            barcode: '',
            costPrice: 0,
            minStockLevel: 0,
            description: '',
            quantity: 0,
            unit: '',
            semiWholesalePrice: undefined,
            wholesalePrice: undefined,
            image: undefined,
            active: true,
            tenantId: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice
        };
      });
      
      setCart(cartItems);
      
      // Set customer if available
      if (sale.customerId) {
        const customer = customers.find(c => parseInt(c.id) === sale.customerId);
        if (customer) {
          setSelectedCustomer(customer);
        }
      }
      
      // Set discount if available
      if (sale.discountAmount) {
        setDiscountAmount(sale.discountAmount);
        setDiscountType('amount');
      }
      
      toast({
        title: t('invoice_loaded'),
        description: `Facture ${invoiceNumber} chargée avec ${sale.items.length} articles`,
        duration: 3000,
      });
      
    } catch (error) {
      console.error('Error loading invoice:', error);
      toast({
        title: t('error'),
        description: t('failed_to_load_invoice'),
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
    
    // Handle both categoryId (ID) and category name for backwards compatibility
    let matchesCategory = false;
    if (selectedCategory === 'all') {
      matchesCategory = true;
    } else {
      // Check if product's categoryId matches by ID or by category name
      const selectedCat = categories.find(c => c.id === selectedCategory);
      matchesCategory = product.categoryId === selectedCategory || 
                       (!!selectedCat && product.categoryId === selectedCat.name);
    }
    
    const isActive = product.active !== false; // Only show active products
    
    // Debug logging
    if (selectedCategory !== 'all') {
      console.log('Filtering - Product:', product.name, 'CategoryId:', product.categoryId, 'Selected:', selectedCategory, 'Matches:', matchesCategory);
    }
    
    return matchesSearch && matchesCategory && isActive;
  });

  // Cart functions
  const addToCart = (product: OfflineProduct, customQuantity?: number, customPrice?: number) => {
    // Check if product is weighable
    if ((product as any).weighable && !customQuantity) {
      setSelectedWeighableProduct(product);
      setWeighableDialogOpen(true);
      return;
    }
    
    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem && !customQuantity) {
      setCart(cart.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.unitPrice }
          : item
      ));
    } else {
      const quantity = customQuantity || 1;
      const unitPrice = customPrice ? customPrice / quantity : (product.sellingPrice || 0);
      const newItem: CartItem = {
        product,
        quantity,
        unitPrice,
        totalPrice: customPrice || (quantity * unitPrice)
      };
      setCart([...cart, newItem]);
    }
  };
  
  const handleWeighableConfirm = (quantity: number, price: number) => {
    if (selectedWeighableProduct) {
      addToCart(selectedWeighableProduct, quantity, price);
      toast({
        title: t('product_added'),
        description: `${selectedWeighableProduct.name} - ${quantity.toFixed(3)}kg ajouté`
      });
    }
  };

  const handleQuickAdd = (product: OfflineProduct) => {
    addToCart(product);
    setQuickSearchTerm('');
    toast({
      title: t('product_added'),
      description: t('product_added_to_cart', { name: product.name })
    });
  };

  const handleDeleteSaleOrder = async () => {
    if (!orderToDelete) return;

    try {
      await deleteSale(orderToDelete.id);
      await loadTodaysOrders();
      
      toast({
        title: t('success'),
        description: t('order_deleted_successfully')
      });
      
      setDeleteConfirmOpen(false);
      setOrderToDelete(null);
    } catch (error) {
      console.error('Error deleting order:', error);
      toast({
        title: t('error'),
        description: t('failed_to_delete_order'),
        variant: 'destructive'
      });
    }
  };

  const formatPriceValue = (value?: number | null) => {
    const safeValue = typeof value === 'number' ? value : 0;
    return `${safeValue.toFixed(2)} ${t('currency')}`;
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



  const handlePriceMode = (itemId?: string) => {
    if (itemId) {
      setNumericInput({ value: '', mode: 'price', targetItemId: itemId });
    }
  };

  const handleVoidLastItem = () => {
    if (cart.length > 0) {
      setCart(cart.slice(0, -1));
      toast({ title: t('last_item_voided') });
    }
  };

  const handleNumericInput = (input: string) => {
    if (input === 'clear') {
      setNumericInput(prev => ({ ...prev, value: '' }));
      return;
    }
    
    if (input === 'enter') {
      const value = parseFloat(numericInput.value) || 0;
      
      switch (numericInput.mode) {
        case 'barcode':
          // Search for product by barcode
          const product = products.find(p => p.barcode === numericInput.value);
          if (product) {
            addToCart(product);
            toast({ title: t('product_added_short', { name: product.name }) });
          } else {
            toast({ title: t('product_not_found'), variant: 'destructive' });
          }
          setNumericInput({ value: '', mode: 'barcode', targetItemId: null });
          break;
          
        case 'quantity':
          if (numericInput.targetItemId) {
            setCart(cart.map(item => 
              item.product.id === numericInput.targetItemId
                ? { ...item, quantity: value, totalPrice: value * item.unitPrice }
                : item
            ));
          } else if (cart.length > 0) {
            // Apply to last item if no target
            const lastItem = cart[cart.length - 1];
            setCart(cart.map(item => 
              item.product.id === lastItem.product.id
                ? { ...item, quantity: value, totalPrice: value * item.unitPrice }
                : item
            ));
          }
          setNumericInput({ value: '', mode: 'barcode', targetItemId: null });
          break;
          
        case 'price':
          if (numericInput.targetItemId) {
            setCart(cart.map(item => 
              item.product.id === numericInput.targetItemId
                ? { ...item, unitPrice: value, totalPrice: item.quantity * value }
                : item
            ));
          } else if (cart.length > 0) {
            // Apply to last item if no target
            const lastItem = cart[cart.length - 1];
            setCart(cart.map(item => 
              item.product.id === lastItem.product.id
                ? { ...item, unitPrice: value, totalPrice: item.quantity * value }
                : item
            ));
          }
          setNumericInput({ value: '', mode: 'barcode', targetItemId: null });
          break;
          
        case 'discount':
          setDiscountAmount(value);
          setDiscountType('amount');
          setNumericInput({ value: '', mode: 'barcode', targetItemId: null });
          break;
          
        case 'payment':
          setPaidAmount(value);
          setNumericInput({ value: '', mode: 'barcode', targetItemId: null });
          break;
      }
      return;
    }
    
    // Add digit or decimal point
    if (input === '.' && numericInput.value.includes('.')) {
      return; // Don't allow multiple decimal points
    }
    
    setNumericInput(prev => ({
      ...prev,
      value: prev.value + input
    }));
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

  // Process sale
  const processSale = async (paymentMethodOverride?: 'cash' | 'credit', paidAmountOverride?: number) => {
    const effectivePaymentMethod = paymentMethodOverride || paymentMethod;
    const effectivePaidAmount = paidAmountOverride || paidAmount;
    if (cart.length === 0) {
      toast({
        title: t('error'),
        description: t('cart_empty'),
        variant: "destructive",
      });
      return;
    }

    // Check credit limit for credit sales
    if (effectivePaymentMethod === 'credit' && selectedCustomer) {
      const currentBalance = selectedCustomer.creditBalance || 0;
      const creditLimit = selectedCustomer.creditLimit || 0;
      const availableCredit = creditLimit - currentBalance;
      
      if (creditLimit > 0 && total > availableCredit) {
        toast({
          title: t('error'),
          description: t('credit_limit_exceeded', {
            available: availableCredit.toFixed(2),
            required: total.toFixed(2),
            limit: creditLimit.toFixed(2)
          }),
          variant: "destructive",
        });
        return;
      }
    }

    if (effectivePaymentMethod === 'cash' && effectivePaidAmount < total) {
      toast({
        title: t('error'),
        description: t('insufficient_amount'),
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
            title: t('warning'),
            description: t('offline_pos_credit_record_warning'),
            variant: "destructive",
          });
        }
      }

      // Update product stock quantities and create stock history entries
      console.log('Starting inventory updates for cart items:', cart);
      for (const item of cart) {
        try {
          console.log('Processing inventory update for item:', item);
          
          // Get current stock from single source of truth (product_stock table)
          const previousQuantity = getProductStock(item.product.id);
          const newQuantity = previousQuantity - item.quantity;
          
          console.log(`Updating product ${item.product.id} quantity from ${previousQuantity} to ${newQuantity}`);
          
          // Update only product quantity, not all fields
          await databaseProductStorage.updateQuantity(item.product.id, newQuantity);
          console.log('Product quantity updated successfully');

          // Update primary warehouse stock to keep in sync
          if (primaryWarehouse) {
            console.log('Updating warehouse stock for primary warehouse:', primaryWarehouse.id);
            await offlineProductStockStorage.upsert({
              productId: item.product.id,
              locationId: primaryWarehouse.id,
              quantity: newQuantity,
              minStockLevel: 0
            });
            console.log('Warehouse stock updated successfully');
          }

          // Create stock transaction entry for sale
          try {
            console.log('Creating stock transaction entry');
            // Dynamic API URL for network access
            const apiBase = typeof window !== 'undefined' 
              ? `${window.location.protocol}//${window.location.hostname}:5003`
              : 'http://localhost:5003';
            const response = await fetch(`${apiBase}/api/offline/stock-transactions`, {
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
              } else {
                console.log('Stock transaction created successfully');
              }
            } catch (stockError) {
              console.error('Error creating stock transaction:', stockError);
            }
        } catch (itemError) {
          console.error('Error processing inventory update for item:', item, itemError);
          throw itemError; // Re-throw to catch in main error handler
        }
      }
      console.log('Completed inventory updates');

      // Reload products to reflect updated quantities
      console.log('Reloading products to reflect updated quantities');
      const updatedProducts = await databaseProductStorage.getAll();
      setProducts(updatedProducts);
      console.log('Products reloaded successfully');

      setLastSale(createdSale);
      setIsCheckoutOpen(false);
      setIsReceiptOpen(true);
      clearCart();

      // Reload sales period stats
      console.log('Reloading sales period data');
      await loadSalesPeriodData();
      console.log('Sales period data reloaded successfully');
      
      // Reload today's orders to show the new order immediately
      console.log('Reloading todays orders');
      await loadTodaysOrders();
      console.log('Todays orders reloaded successfully');
      
      // Refresh product stocks to show updated quantities
      console.log('Refreshing product stocks');
      await refreshProductStocks(products, stockLocations);
      console.log('Product stocks refreshed successfully');

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
        title: t('sale_completed'),
        description: t('offline_pos_receipt_auto_printed'),
      });
    } catch (printError) {
      console.error('Auto-print error:', printError);
      toast({
        title: t('sale_completed'),
        description: t('offline_pos_sale_completed_print_error'),
      });
    }
  } catch (error) {
    console.error('Error processing sale:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error
    });
    toast({
      title: t('error'),
      description: t('offline_pos_sale_error', {
        message: error instanceof Error ? error.message : String(error),
      }),
      variant: "destructive",
    });
  }
  };

  const getNumericModeLabel = (mode: typeof numericInput.mode) => {
    switch (mode) {
      case 'quantity':
        return t('offline_pos_mode_quantity');
      case 'price':
        return t('offline_pos_mode_price');
      case 'discount':
        return t('offline_pos_mode_discount');
      case 'payment':
        return t('offline_pos_mode_payment');
      case 'barcode':
      default:
        return t('offline_pos_mode_barcode');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">{t('loading')}</div>
      </div>
    );
  }

  return (
    <>
    <div className="h-screen bg-gradient-to-br from-[#fff3e6] via-[#f5f7ff] to-[#e8f6f0]">
      <PanelGroup direction="horizontal">
      {/* Left Panel - Invoice Table */}
      <Panel defaultSize={50} minSize={30}>
      <div className="bg-white/85 backdrop-blur shadow-xl flex flex-col h-full">
        {/* Invoice Header */}
        <div className="bg-gradient-to-r from-[#c1121f] via-[#f4a259] to-[#0f866c] text-white p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">{t('offline_pos_receipt_title').toUpperCase()}</h2>
              <div className="text-sm opacity-90">#{new Date().getTime().toString().slice(-6)}</div>
            </div>
            <Receipt className="h-8 w-8 opacity-80" />
          </div>
        </div>

        {/* Receipt Content - Scrollable Items Only */}
        <div className="flex-1 flex flex-col bg-[#fdf5ec] font-mono text-xs overflow-hidden">
          <div className="bg-white/90 rounded-t-xl shadow-md border border-[#f4c36a]/60 p-3 overflow-y-auto flex-1">
            <div className="text-center border-b pb-1 mb-2">
              <div className="font-bold text-sm">IGOODAR POS</div>
              <div className="text-xs text-gray-500">{new Date().toLocaleString('fr-MA')}</div>
            </div>
            
            {/* Payment Method & Customer - Compact */}
            <div className="mb-2 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">{t('offline_pos_mode_label')}:</span>
                <span className="font-semibold">
                  {paymentMethod === 'cash' && <span className="text-green-600">💰 {t('cash')}</span>}
                  {paymentMethod === 'credit' && <span className="text-purple-600">📋 {t('credit')}</span>}
                  {paymentMethod === 'card' && <span className="text-blue-600">💳 {t('card_payment')}</span>}
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
                  <SelectValue placeholder={t('select_customer')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in">🚶 {t('walk_in_customer')}</SelectItem>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      👤 {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Customer Credit Display */}
              {selectedCustomer && (
                <div className="mt-2 p-2 bg-gradient-to-br from-[#dff6ff] to-[#ccffe1] rounded-xl border border-[#0f866c]/30 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <CreditCard className="h-3 w-3 text-[#0f866c]" />
                      <span className="text-xs font-semibold text-[#0f866c]">{t('offline_pos_customer_credit')}</span>
                    </div>
                    <Button
                      onClick={() => setIsCreditDialogOpen(true)}
                      size="sm"
                      variant="outline"
                      className="h-5 px-2 text-xs bg-white/70 border border-[#0f866c]/30 hover:bg-[#0f866c]/10 text-[#0f866c]"
                    >
                      <Settings className="h-3 w-3 mr-1" />
                      {t('offline_pos_settle')}
                    </Button>
                  </div>
                  {loadingCreditInfo ? (
                    <div className="text-xs text-gray-500">{t('loading')}</div>
                  ) : creditInfo ? (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-600">{t('current_balance')}:</span>
                        <span className={`font-medium ${creditInfo.currentBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {creditInfo.currentBalance?.toFixed(2) || '0.00'} DH
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500">{t('offline_pos_no_credit_info')}</div>
                  )}
                </div>
              )}
            </div>

            {/* Quick product picker */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-[#0f866c] uppercase tracking-wide">
                  {t('add_product')}
                </span>
                {quickSearchTerm && quickSearchResults.length > 0 && (
                  <span className="text-[10px] text-slate-500">
                    {t('offline_pos_quick_add_hint') || 'Enter to add first match'}
                  </span>
                )}
              </div>
              <div className="relative">
                <Input
                  value={quickSearchTerm}
                  onChange={(event) => setQuickSearchTerm(event.target.value)}
                  placeholder={t('offline_pos_search_products_placeholder')}
                  className="h-8 text-xs border-[#0f866c]/40 focus:border-[#0f866c] focus:ring-[#0f866c]/40"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && quickSearchResults.length > 0) {
                      event.preventDefault();
                      handleQuickAdd(quickSearchResults[0]);
                    }
                  }}
                />
                {quickSearchTerm && (
                  <div className="absolute z-30 mt-1 w-full rounded-md border border-[#0f866c]/30 bg-white shadow-lg">
                    {quickSearchResults.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-slate-500">
                        {t('product_not_found')}
                      </div>
                    ) : (
                      quickSearchResults.map((product) => (
                        <button
                          key={product.id}
                          type="button"
                          className="w-full px-3 py-2 text-left text-xs hover:bg-[#0f866c]/10 flex items-center justify-between gap-2"
                          onMouseDown={(event) => {
                            event.preventDefault();
                            handleQuickAdd(product);
                          }}
                        >
                          <div>
                            <div className="font-semibold text-slate-800 line-clamp-1">
                              {product.name}
                              <span className="ml-2 text-xs font-normal text-slate-500">
                                ({(product as any).weighable ? getProductStock(product.id).toFixed(2) : Math.floor(getProductStock(product.id))} {t('available')})
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {product.barcode || t('offline_pos_barcode_missing')}
                            </div>
                          </div>
                          <div className="text-[11px] font-semibold text-[#0f866c]">
                            {formatPriceValue(product.sellingPrice)}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              {/* Invoice Table - Always visible with empty rows */}
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-[#0f866c]/10 via-[#f4a259]/10 to-[#c1121f]/10 border-b-2 border-[#0f866c]">
                    <th className="text-left px-2 py-2 text-xs font-bold text-slate-700 uppercase">{t('barcode')}</th>
                    <th className="text-left px-2 py-2 text-xs font-bold text-slate-700 uppercase">{t('product')}</th>
                    <th className="text-center px-2 py-2 text-xs font-bold text-slate-700 uppercase">{t('quantity')}</th>
                    <th className="text-right px-2 py-2 text-xs font-bold text-slate-700 uppercase">{t('price')}</th>
                    <th className="text-right px-2 py-2 text-xs font-bold text-slate-700 uppercase">{t('total')}</th>
                    <th className="text-center px-2 py-2 text-xs font-bold text-slate-700 uppercase w-16"></th>
                  </tr>
                </thead>
                <tbody>
              {cart.map((item, index) => (
                  <tr key={item.product.id} className="border-b border-gray-200 hover:bg-[#fff4e3] transition-colors">
                    <td className="px-2 py-2 text-xs text-gray-600 font-mono">
                      {item.product.barcode || '-'}
                    </td>
                    <td className="px-2 py-2">
                      <div className="font-medium text-sm truncate flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedProductInfo(item.product);
                            setProductInfoOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 flex-shrink-0"
                          title={t('view_product_info')}
                        >
                          <Info className="w-4 h-4" />
                        </button>
                        {item.product.name}
                        {item.unitPrice < item.product.costPrice && (
                          <span
                            className="text-red-500 text-xs"
                            title={t('offline_pos_price_below_cost', {
                              price: item.unitPrice.toFixed(2),
                              cost: item.product.costPrice.toFixed(2),
                            })}
                          >
                            ⚠️
                          </span>
                        )}
                      </div>
                      {item.unitPrice < item.product.costPrice && (
                        <div className="text-red-500 text-[10px] mt-0.5">
                          {t('offline_pos_loss_per_unit', {
                            amount: (item.product.costPrice - item.unitPrice).toFixed(2),
                          })}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <input
                          type="text"
                          value={quantityInputs[item.product.id] ?? ((item.product as any).weighable ? item.quantity.toFixed(3) : item.quantity.toString())}
                          onChange={(e) => {
                            const value = e.target.value;
                            
                            // For non-weighable products: only allow whole numbers
                            if (!(item.product as any).weighable) {
                              // Check if value contains decimal point
                              if (value.includes('.') || value.includes(',')) {
                                // Don't allow decimal input
                                return;
                              }
                            }
                            
                            // Update local input state immediately
                            setQuantityInputs(prev => ({
                              ...prev,
                              [item.product.id]: value
                            }));
                            
                            // For weighable products, recalculate immediately
                            if ((item.product as any).weighable) {
                              const newQty = parseFloat(value);
                              if (!isNaN(newQty) && newQty > 0) {
                                updateCartItemQuantity(item.product.id, newQty);
                                // Clear price input state so it shows the fresh calculated value
                                setPriceInputs(prev => {
                                  const newState = { ...prev };
                                  delete newState[item.product.id];
                                  return newState;
                                });
                              }
                            }
                          }}
                          onBlur={(e) => {
                            const value = e.target.value;
                            // Process the value when user finishes editing (for non-weighable)
                            if (!(item.product as any).weighable) {
                              if (value.includes('*')) {
                                const parts = value.split('*');
                                if (parts.length === 2) {
                                  const num1 = parseFloat(parts[0]) || 0;
                                  const num2 = parseFloat(parts[1]) || 0;
                                  const calculatedQty = num1 * num2;
                                  if (calculatedQty > 0) {
                                    updateCartItemQuantity(item.product.id, calculatedQty);
                                  }
                                }
                              } else {
                                const newQty = parseFloat(value) || 0;
                                if (newQty > 0) {
                                  updateCartItemQuantity(item.product.id, newQty);
                                }
                              }
                            }
                            // Clear the local input state
                            setQuantityInputs(prev => {
                              const newState = { ...prev };
                              delete newState[item.product.id];
                              return newState;
                            });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                          className="w-20 px-2 py-1 text-sm border border-[#0f866c]/30 rounded focus:border-[#0f866c] focus:ring-1 focus:ring-[#0f866c]/20 bg-white text-center font-medium"
                          placeholder={(item.product as any).weighable ? "kg" : "Qty"}
                        />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <input
                          type="text"
                          value={priceInputs[item.product.id] ?? ((item.product as any).weighable ? item.totalPrice.toFixed(2) : item.unitPrice.toString())}
                          onChange={(e) => {
                            const value = e.target.value;
                            // Update local input state immediately
                            setPriceInputs(prev => ({
                              ...prev,
                              [item.product.id]: value
                            }));
                            
                            // For weighable products, recalculate quantity immediately
                            if ((item.product as any).weighable) {
                              const newValue = parseFloat(value);
                              if (!isNaN(newValue) && newValue >= 0) {
                                const pricePerKg = item.product.sellingPrice;
                                if (pricePerKg > 0) {
                                  const newQuantity = newValue / pricePerKg;
                                  updateCartItemQuantity(item.product.id, newQuantity);
                                  // Clear quantity input state so it shows the fresh calculated value
                                  setQuantityInputs(prev => {
                                    const newState = { ...prev };
                                    delete newState[item.product.id];
                                    return newState;
                                  });
                                }
                              }
                            }
                          }}
                          onBlur={(e) => {
                            const value = e.target.value;
                            const newValue = parseFloat(value) || 0;
                            
                            // For regular products: update unit price on blur
                            if (!(item.product as any).weighable && newValue >= 0) {
                              updateCartItemPrice(item.product.id, newValue);
                            }
                            
                            // Clear the local input state
                            setPriceInputs(prev => {
                              const newState = { ...prev };
                              delete newState[item.product.id];
                              return newState;
                            });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          }}
                          className={`w-24 px-2 py-1 text-sm border rounded focus:ring-1 bg-white text-right font-medium ${
                            item.unitPrice < item.product.costPrice 
                              ? 'border-red-500 bg-red-50 text-red-700 focus:border-red-600 focus:ring-red-200' 
                              : 'border-[#0f866c]/30 focus:border-[#0f866c] focus:ring-[#0f866c]/20'
                          }`}
                          placeholder={(item.product as any).weighable ? "Total" : "Price"}
                        />
                        <span className="ml-1 text-xs text-gray-500">DH{(item.product as any).weighable ? '' : '/kg'}</span>
                    </td>
                    <td className="px-2 py-2 text-right font-bold text-sm text-[#0f866c]">
                      {item.totalPrice.toFixed(2)} DH
                    </td>
                    <td className="px-2 py-2 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromCart(item.product.id)}
                        className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {/* Empty rows to fill out invoice (show at least 5 empty rows) */}
                {Array.from({ length: Math.max(5, 10 - cart.length) }).map((_, index) => (
                  <tr key={`empty-${index}`} className="border-b border-gray-100">
                    <td className="px-2 py-3 text-xs text-gray-300">-</td>
                    <td className="px-2 py-3 text-xs text-gray-300"></td>
                    <td className="px-2 py-3 text-center text-xs text-gray-300"></td>
                    <td className="px-2 py-3 text-right text-xs text-gray-300"></td>
                    <td className="px-2 py-3 text-right text-xs text-gray-300"></td>
                    <td className="px-2 py-3"></td>
                  </tr>
                ))}
                  </tbody>
                </table>
              </div>
          </div>
          
          {/* Fixed Totals Section at Bottom */}
          <div className="bg-white/90 rounded-b-xl shadow-md border border-t-0 border-[#f4c36a]/60 p-3 flex-shrink-0">
            <div className="border-t-2 border-[#0f866c] pt-3 space-y-2">
              <div className="flex justify-between text-xs">
                <span>{t('subtotal')}:</span>
                <span>{subtotal.toFixed(2)} DH</span>
              </div>
              {discountValue > 0 && (
                <div className="flex justify-between text-red-600 text-xs">
                  <span>{t('discount')}:</span>
                  <span>-{discountValue.toFixed(2)} DH</span>
                </div>
              )}
              <div className="space-y-1">
                {/* Product count */}
                <div className="flex justify-between text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded">
                  <span>{t('items_in_cart')}:</span>
                  <span className="font-semibold">{cart.reduce((sum, item) => sum + (item.product.weighable ? 1 : item.quantity), 0)} {t('items')}</span>
                </div>
                
                {/* Total */}
                <div className="flex justify-between font-bold text-sm border-t pt-1 bg-gradient-to-r from-[#06d6a0]/20 via-[#118ab2]/20 to-[#4cc9f0]/20 px-2 py-1 rounded-lg border-[#0f866c]/20">
                  <span>{t('total').toUpperCase()}:</span>
                  <span>{total.toFixed(2)} DH</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Action Buttons - Compact Fixed Bottom */}
        <div className="bg-gradient-to-t from-[#fff1d6] via-[#fde2e4] to-white border-t border-[#f4c36a] flex-shrink-0" style={{height: '280px', padding: '12px'}}>
          {/* Quick Cash Payment Buttons */}
          <div className="mb-3">
            <div className="text-xs font-semibold text-[#0f866c] mb-1 uppercase tracking-wide tracking-[0.2em]">{t('offline_pos_quick_payment')}</div>
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
                          title: t('cart_empty'),
                          description: t('offline_pos_add_items_before_payment'),
                          variant: "destructive",
                        });
                        return;
                      }
                      
                      if (amount < total) {
                        toast({
                          title: t('insufficient_amount'),
                          description: t('insufficient_amount_desc', { amount, required: total.toFixed(2) }),
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
                          title: t('offline_pos_change_title'),
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
                placeholder={t('offline_pos_other_amount')}
                className="flex-1 px-2 py-1 border-2 border-[#f4c36a]/60 focus:border-[#0f866c] focus:ring-[#0f866c]/40 rounded text-xs bg-white/90"
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
                      title: t('invalid_amount'),
                      description: t('minimum_required', { amount: total.toFixed(2) }),
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  setPaymentMethod('cash');
                  setPaidAmount(amount);
                  
                  const changeAmount = amount - total;
                  if (changeAmount > 0) {
                    toast({
                      title: t('offline_pos_change_title'),
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
                {t('confirm')}
              </Button>
            </div>
          </div>

          {/* Other Payment Methods */}
          <div className="grid grid-cols-3 gap-1 mb-2">
            <Button
              onClick={async () => {
                if (cart.length === 0) {
                  toast({
                    title: t('cart_empty'),
                    description: t('offline_pos_add_items_before_payment'),
                    variant: "destructive",
                  });
                  return;
                }

                if (selectedCustomer) {
                  // Process credit sale immediately
                  await processSale('credit');
                } else {
                  toast({
                    title: t('error'),
                    description: t('offline_pos_select_customer_credit'),
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
              📋 {t('credit').toUpperCase()}
            </Button>
            <Button
              onClick={() => {
                if (cart.length === 0) {
                  toast({
                    title: t('cart_empty'),
                    description: t('offline_pos_add_items_print_receipt'),
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
                      title: t('success'),
                      description: t('offline_sales_print_success'),
                    });
                  } catch (error) {
                    console.error('Print error:', error);
                    // Handle specific printer errors with user-friendly messages
                    let errorMessage = t('offline_pos_print_unknown_error');

                    if (error instanceof Error) {
                      if (error.message.includes('USB device not found')) {
                        errorMessage = t('offline_pos_printer_not_connected');
                      } else if (error.message.includes('Receipt print failed')) {
                        errorMessage = t('offline_pos_printer_failed');
                      } else {
                        errorMessage = error.message;
                      }
                    }

                    toast({
                      title: t('offline_pos_print_issue_title'),
                      description: errorMessage,
                      variant: "destructive",
                    });
                  }
                })();
              }}
              disabled={cart.length === 0}
              className={`h-10 text-xs font-bold border-2 transition-all ${
                cart.length > 0 
                  ? 'bg-gradient-to-r from-[#0f866c] via-[#1b998b] to-[#118ab2] hover:shadow-xl border-transparent'
                  : 'bg-gray-400 border-gray-500'
              } text-white`}
            >
              🖨️ {t('print_receipt')}
            </Button>
            <Button
              onClick={() => {
                clearCart();
                toast({
                  title: t('offline_pos_cart_cleared_title'),
                  description: t('offline_pos_cart_cleared_desc'),
                });
              }}
              className="h-10 text-xs font-bold bg-gradient-to-r from-[#d00000] via-[#ef233c] to-[#f94144] text-white border-2 border-[#b7094c]/60 transition-all hover:shadow-xl"
            >
              🗑️ {t('clear').toUpperCase()}
            </Button>
          </div>
          
          
        </div>
      </div>
      </Panel>
      
      {/* Resize Handle */}
      <PanelResizeHandle className="w-2 bg-gradient-to-r from-[#f4a259] to-[#0f866c] hover:w-3 transition-all cursor-col-resize flex items-center justify-center group">
        <div className="w-1 h-8 bg-white/50 rounded-full group-hover:bg-white/80 transition-colors"></div>
      </PanelResizeHandle>
      
      {/* Right Panel - Products */}
      <Panel defaultSize={50} minSize={30}>
      <div className="flex-1 flex flex-col h-full">
        {/* Top Bar with Search and Toggle */}
        <div className="bg-white/85 border-b border-[#f4c36a]/40 shadow-sm p-4 backdrop-blur">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#0f866c] h-5 w-5" />
              <Input
                placeholder={rightSidebarView === 'products'
                  ? t('offline_pos_search_products_placeholder')
                  : t('offline_pos_search_orders_placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 text-lg border-2 border-[#f4c36a]/50 focus:border-[#0f866c] focus:ring-[#0f866c]"
              />
            </div>
            <div className="flex items-center space-x-2">
              {/* View Toggle */}
              <div className="flex bg-gradient-to-r from-[#fde2e4] via-[#fff1d6] to-[#dff6ff] rounded-lg p-1 border border-[#f4c36a]/50 shadow-inner">
                <Button
                  variant={rightSidebarView === 'products' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setRightSidebarView('products')}
                  className={`px-4 py-2 ${rightSidebarView === 'products' ? 'bg-[#0f866c] text-white shadow-md border border-[#0f866c]/50' : 'text-slate-600 hover:text-[#0f866c]'}`}
                >
                  <Grid3X3 className="h-4 w-4 mr-2" />
                  {t('products')}
                </Button>
                <Button
                  variant={rightSidebarView === 'orders' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setRightSidebarView('orders')}
                  className={`px-4 py-2 ${rightSidebarView === 'orders' ? 'bg-[#c1121f] text-white shadow-md border border-[#c1121f]/50' : 'text-slate-600 hover:text-[#c1121f]'}`}
                >
                  <List className="h-4 w-4 mr-2" />
                  {t('orders')}
                </Button>
              </div>
              <div className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-[#06d6a0]/20 via-[#118ab2]/15 to-[#0f866c]/20 border border-[#0f866c]/30 rounded-lg shadow-sm">
                <ScanLine className="h-4 w-4 text-[#0f866c]" />
                <span className="text-sm font-semibold text-[#0f866c]">{t('offline_pos_usb_scanner_active')}</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="text-sm text-gray-500">{t('offline_pos_seller_label')}: {user?.name || t('unknown_customer')}</div>
                  <div className="text-sm font-medium">{new Date().toLocaleDateString('fr-MA')}</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={logout}
                  className="flex items-center space-x-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  title={t('logout')}
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('logout')}</span>
                </Button>
              </div>
            </div>
          </div>
          
          {/* Turnover Statistics - Only show in orders view */}
          {rightSidebarView === 'orders' && (
            <div className="mt-4 grid grid-cols-4 gap-3">
              {[{
                value: filteredTurnover.ordersCount,
                label: t('offline_pos_orders_stat_label'),
                gradient: 'from-[#3a86ff] via-[#4cc9f0] to-[#4895ef]'
              }, {
                value: `${filteredTurnover.total.toFixed(0)} DH`,
                label: t('offline_pos_total_revenue_label'),
                gradient: 'from-[#0f866c] via-[#14b8a6] to-[#0ea5e9]'
              }, {
                value: `${filteredTurnover.paid.toFixed(0)} DH`,
                label: t('offline_pos_paid_stat_label'),
                gradient: 'from-[#f4a259] via-[#f76c5e] to-[#ef476f]'
              }, {
                value: `${filteredTurnover.credit.toFixed(0)} DH`,
                label: t('offline_pos_credit_stat_label'),
                gradient: 'from-[#ff9f1c] via-[#ff6d00] to-[#d00000]'
              }].map((card, index) => (
                <div key={index} className="relative overflow-hidden rounded-2xl shadow-lg">
                  <div className={`h-full w-full bg-gradient-to-r ${card.gradient} p-[1px]`}
                  >
                    <div className="h-full w-full rounded-[1.1rem] bg-white/85 px-4 py-3 text-center">
                      <div className="text-lg font-bold text-slate-900">
                        {card.value}
                      </div>
                      <div className="text-xs font-semibold text-slate-600 tracking-wide uppercase">
                        {card.label}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Barcode Buffer Display (for debugging) */}
          {barcodeBuffer && (
            <div className="mt-2 px-3 py-1 bg-gradient-to-r from-[#dff6ff] via-[#ccffe1] to-[#fff1d6] border border-[#0f866c]/30 rounded text-sm shadow-sm">
              <span className="text-[#0f866c] font-semibold">{t('offline_pos_scan_in_progress')}: </span>
              <span className="font-mono">{barcodeBuffer}</span>
            </div>
          )}
        </div>

        {/* Colorful Function Buttons (Classic POS Style) - Moved to Top */}
        <div className="bg-gradient-to-r from-[#fff1d6]/90 via-[#fde2e4]/90 to-[#dff6ff]/90 border-b border-[#f4c36a] p-3 shadow-inner">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#c1121f] via-[#f4a259] to-[#0f866c] text-white shadow-md">
              <ShoppingCart className="h-4 w-4" />
            </div>
            <span className="font-bold text-sm tracking-widest text-slate-800">
              {t('offline_pos_system_functions').toUpperCase()}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Button
              onClick={() => window.location.href = '/products'}
              className="h-12 bg-gradient-to-br from-[#06d6a0] via-[#1b998b] to-[#0f866c] text-white font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-lg border border-[#0f866c]/40"
            >
              <Package className="h-4 w-4" />
              {t('products').toUpperCase()}
            </Button>
            <Button
              onClick={() => window.location.href = '/customers'}
              className="h-12 bg-gradient-to-br from-[#5a189a] via-[#7209b7] to-[#560bad] text-white font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-lg border border-[#560bad]/40"
            >
              <Users className="h-4 w-4" />
              {t('customers').toUpperCase()}
            </Button>
            <Button
              onClick={() => window.location.href = '/suppliers'}
              className="h-12 bg-gradient-to-br from-[#ff9f1c] via-[#ff6d00] to-[#f3722c] text-white font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-lg border border-[#ff6d00]/40"
            >
              <Truck className="h-4 w-4" />
              {t('suppliers').toUpperCase()}
            </Button>
            <Button
              onClick={() => window.location.href = '/inventory'}
              className="h-12 bg-gradient-to-br from-[#ffd166] via-[#f9c74f] to-[#f4a259] text-slate-900 font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-lg border border-[#f4a259]/40"
            >
              <Warehouse className="h-4 w-4" />
              {t('inventory').toUpperCase()}
            </Button>
            <Button
              onClick={() => window.location.href = '/reports'}
              className="h-12 bg-gradient-to-br from-[#4361ee] via-[#4895ef] to-[#3a0ca3] text-white font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-lg border border-[#3a0ca3]/40"
            >
              <BarChart3 className="h-4 w-4" />
              {t('reports').toUpperCase()}
            </Button>
            <Button
              onClick={() => window.location.href = '/settings'}
              className="h-12 bg-gradient-to-br from-[#495057] via-[#2f3e46] to-[#1b262c] text-white font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-lg border border-[#1b262c]/40"
            >
              <Settings className="h-4 w-4" />
              {t('settings').toUpperCase()}
            </Button>
          </div>
        </div>

        {/* Content Area - Products or Orders with Numeric Keypad */}
        <div className="flex-1 flex">
          {/* Products/Orders Section */}
          <div className="flex-1 overflow-y-auto">
            {rightSidebarView === 'products' ? (
            <>
              {/* Horizontal Categories */}
              <div className="bg-white/90 border-b border-[#f4c36a]/40 p-4 backdrop-blur">
                <div className="flex space-x-6 overflow-x-auto pb-2">
                  <div
                    onClick={() => setSelectedCategory('all')}
                    className="flex flex-col items-center space-y-2 cursor-pointer min-w-[60px]"
                  >
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md border ${
                      selectedCategory === 'all'
                        ? 'bg-gradient-to-br from-[#f77f00] via-[#fcbf49] to-[#ff9f1c] border-[#f77f00]/50'
                        : 'bg-white/70 border-[#f4c36a]/40'
                    }`}>
                      <span className={`text-2xl ${selectedCategory === 'all' ? 'text-white' : 'text-slate-500'}`}>📦</span>
                    </div>
                    <span className={`text-xs font-medium ${
                      selectedCategory === 'all' ? 'text-[#b3541e]' : 'text-slate-600'
                    }`}>{t('offline_pos_all').toUpperCase()}</span>
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
                        <div className={`w-14 h-14 rounded-full overflow-hidden shadow-md border ${
                          selectedCategory === category.id
                            ? 'ring-2 ring-white/80 bg-gradient-to-br from-[#06d6a0] via-[#1b998b] to-[#118ab2] border-[#118ab2]/40'
                            : 'border-[#e0f2f1]'
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
                          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md border ${
                            selectedCategory === category.id
                              ? 'bg-gradient-to-br from-[#06d6a0] via-[#1b998b] to-[#118ab2] text-white border-[#118ab2]/50'
                              : 'bg-white/70 text-slate-500 border-[#e0f2f1]'
                          }`}
                        >
                          <span className="text-2xl">🏷️</span>
                        </div>
                      )}
                      <span className={`text-xs font-medium text-center ${
                        selectedCategory === category.id ? 'text-[#0f866c]' : 'text-slate-600'
                      }`}>{category.name.toUpperCase()}</span>
                    </div>
                    );
                  })}
                </div>
              </div>

              {/* Products Grid */}
              <div className="p-4 overflow-y-auto pb-64" style={{ maxHeight: 'calc(100vh - 180px)' }}>
                <div className="grid grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filteredProducts.map((product, index) => {
                    const colors = [
                      'bg-gradient-to-br from-[#f94144] via-[#f3722c] to-[#f8961e]',
                      'bg-gradient-to-br from-[#06d6a0] via-[#1b998b] to-[#118ab2]',
                      'bg-gradient-to-br from-[#3a86ff] via-[#4361ee] to-[#7209b7]',
                      'bg-gradient-to-br from-[#ffbe0b] via-[#fb8500] to-[#ff6d00]',
                      'bg-gradient-to-br from-[#ef233c] via-[#d00000] to-[#9d0208]',
                      'bg-gradient-to-br from-[#8338ec] via-[#9d4edd] to-[#7209b7]',
                      'bg-gradient-to-br from-[#118ab2] via-[#06d6a0] to-[#4cc9f0]',
                      'bg-gradient-to-br from-[#f4a259] via-[#f77f00] to-[#e85d04]',
                      'bg-gradient-to-br from-[#ff9f1c] via-[#ffbf69] to-[#ffd6a5]',
                      'bg-gradient-to-br from-[#06d6a0] via-[#0f866c] to-[#1b998b]',
                      'bg-gradient-to-br from-[#c1121f] via-[#ef233c] to-[#f72585]',
                      'bg-gradient-to-br from-[#4cc9f0] via-[#4895ef] to-[#4361ee]'
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
                            <div className="mb-2 relative">
                              <img 
                                src={product.image} 
                                alt={product.name}
                                className="w-full h-16 object-cover rounded-lg mx-auto"
                              />
                            </div>
                          ) : (
                            <div className="text-3xl mb-2">📦</div>
                          )}
                          <h3 className="font-bold text-sm mb-1 line-clamp-2 leading-tight">
                            {product.name}
                          </h3>
                          <div className="text-xs text-white/80 mb-1">
                            {product.weighable 
                              ? Math.round(getProductStock(product.id) * 100) / 100 
                              : getProductStock(product.id)
                            } {t('available')}
                          </div>
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
            <div className="p-4 space-y-4">
              {/* Date Filter */}
              <div className="bg-white rounded-xl shadow-sm border p-4">
                <h3 className="font-bold text-sm mb-3 text-slate-700">{t('filter_by_date')}</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Button
                    size="sm"
                    variant={dateFilter === 'today' ? 'default' : 'outline'}
                    onClick={() => setDateFilter('today')}
                    className="text-xs"
                  >
                    {t('filter_today')}
                  </Button>
                  <Button
                    size="sm"
                    variant={dateFilter === 'yesterday' ? 'default' : 'outline'}
                    onClick={() => setDateFilter('yesterday')}
                    className="text-xs"
                  >
                    {t('filter_yesterday')}
                  </Button>
                  <Button
                    size="sm"
                    variant={dateFilter === 'this_week' ? 'default' : 'outline'}
                    onClick={() => setDateFilter('this_week')}
                    className="text-xs"
                  >
                    {t('filter_this_week')}
                  </Button>
                  <Button
                    size="sm"
                    variant={dateFilter === 'last_week' ? 'default' : 'outline'}
                    onClick={() => setDateFilter('last_week')}
                    className="text-xs"
                  >
                    {t('filter_last_week')}
                  </Button>
                  <Button
                    size="sm"
                    variant={dateFilter === 'this_month' ? 'default' : 'outline'}
                    onClick={() => setDateFilter('this_month')}
                    className="text-xs"
                  >
                    {t('filter_this_month')}
                  </Button>
                  <Button
                    size="sm"
                    variant={dateFilter === 'last_month' ? 'default' : 'outline'}
                    onClick={() => setDateFilter('last_month')}
                    className="text-xs"
                  >
                    {t('filter_last_month')}
                  </Button>
                  <Button
                    size="sm"
                    variant={dateFilter === 'last_3_months' ? 'default' : 'outline'}
                    onClick={() => setDateFilter('last_3_months')}
                    className="text-xs"
                  >
                    {t('filter_last_3_months')}
                  </Button>
                  <Button
                    size="sm"
                    variant={dateFilter === 'this_year' ? 'default' : 'outline'}
                    onClick={() => setDateFilter('this_year')}
                    className="text-xs"
                  >
                    {t('filter_this_year')}
                  </Button>
                  <Button
                    size="sm"
                    variant={dateFilter === 'custom' ? 'default' : 'outline'}
                    onClick={() => setDateFilter('custom')}
                    className="text-xs"
                  >
                    {t('filter_custom')}
                  </Button>
                </div>
                
                {/* Custom Date Range */}
                {dateFilter === 'custom' && (
                  <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t">
                    <div>
                      <label className="text-xs text-slate-600 mb-1 block">{t('date_start')}</label>
                      <Input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-600 mb-1 block">{t('date_end')}</label>
                      <Input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {filteredOrders.length === 0 ? (
                <div className="text-center py-16 text-[#0f866c] bg-white/80 border border-[#f4c36a]/40 rounded-2xl">
                  <Clock className="h-16 w-16 mx-auto mb-4 text-[#f4a259]" />
                  <h3 className="text-lg font-semibold mb-2">{t('offline_pos_no_orders_today_title')}</h3>
                  <p className="text-sm text-slate-600">{t('offline_pos_no_orders_today_desc')}</p>
                </div>
              ) : (
                <div className="bg-white/95 rounded-2xl border border-[#f4c36a]/40 overflow-hidden shadow-lg">
                  {/* Table Header */}
                  <div className="bg-gradient-to-r from-[#0f866c]/15 via-[#f4a259]/15 to-[#c1121f]/15 border-b border-[#f4c36a]/30 px-4 py-3">
                    <div className="grid grid-cols-7 gap-4 text-xs font-semibold text-slate-700 uppercase tracking-wide">
                      <div>{t('pos_order_number')}</div>
                      <div>{t('time')}</div>
                      <div>{t('items')}</div>
                      <div>{t('amount')}</div>
                      <div>{t('payment')}</div>
                      <div>{t('status')}</div>
                      <div>{t('actions')}</div>
                    </div>
                  </div>
                  
                  {/* Table Body */}
                  <div className="divide-y divide-[#f4c36a]/30">
                    {filteredOrders.map((order) => (
                      <div
                        key={order.id}
                        className="grid grid-cols-7 gap-4 px-4 py-3 hover:bg-[#fff4e3] transition-colors cursor-pointer"
                        onClick={() => loadOrderIntoCart(order)}
                      >
                        <div 
                          className="text-sm font-bold text-[#0f866c]"
                        >
                          #{order.id}
                        </div>
                        <div className="text-sm text-slate-800">
                          {new Date(order.date).toLocaleTimeString('fr-FR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                        <div className="text-sm text-slate-800">
                          {order.items.length} {t('items')}
                        </div>
                        <div className="text-sm font-semibold text-[#c1121f]">
                          {order.totalAmount.toFixed(0)} DH
                        </div>
                        <div className="text-sm text-slate-800 capitalize">
                          {order.paymentMethod === 'cash' ? t('cash') : 
                           order.paymentMethod === 'credit' ? t('credit') : 
                           order.paymentMethod === 'card' ? t('card_payment') : 
                           order.paymentMethod === 'bank_check' ? t('bank_check') : 
                           order.paymentMethod}
                        </div>
                        <div>
                          <Badge 
                            className={`text-xs font-semibold border-0 ${
                              order.paymentMethod === 'credit'
                                ? 'bg-[#ffd166] text-[#8d5800]'
                                : order.paidAmount >= order.totalAmount
                                  ? 'bg-[#06d6a0] text-white'
                                  : 'bg-[#ef476f] text-white'
                            }`}
                          >
                            {order.paymentMethod === 'credit' ? t('credit') :
                             order.paidAmount >= order.totalAmount ? t('payment_status_paid') : t('payment_status_unpaid')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {canDeleteSales && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOrderToDelete(order);
                                setDeleteConfirmOpen(true);
                              }}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
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
      </div>
      </Panel>
      </PanelGroup>
    </div>

    {/* Receipt Dialog */}
    <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t('offline_pos_receipt_dialog_title')}</DialogTitle>
          </DialogHeader>
          {lastSale && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-bold">igoodar POS</h3>
                <p className="text-sm text-gray-500">{t('offline_pos_sale_number', { id: lastSale.id })}</p>
                <p className="text-sm text-gray-500">{new Date(lastSale.date).toLocaleString()}</p>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-2">{t('items')}:</h4>
                {lastSale.items.map(item => {
                  // Find the original product to check if it's weighable
                  const product = products.find(p => p.id === item.productId.toString());
                  const roundedQty = product?.weighable 
                    ? Math.round(item.quantity * 100) / 100 
                    : item.quantity;
                  
                  return (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.productName || 'Article'} x{roundedQty}</span>
                      <span>{item.totalPrice.toFixed(2)} DH</span>
                    </div>
                  );
                })}
              </div>
              
              <Separator />
              
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>{t('subtotal')}:</span>
                  <span>{(lastSale.totalAmount - (lastSale.taxAmount || 0)).toFixed(2)} DH</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('offline_pos_tax_label')}:</span>
                  <span>{(lastSale.taxAmount || 0).toFixed(2)} DH</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>{t('total')}:</span>
                  <span>{lastSale.totalAmount.toFixed(2)} DH</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('offline_pos_paid_label')} ({lastSale.paymentMethod}):</span>
                  <span>{lastSale.paidAmount.toFixed(2)} DH</span>
                </div>
                {(lastSale.changeAmount || 0) > 0 && (
                  <div className="flex justify-between">
                    <span>{t('offline_pos_change_label')}:</span>
                    <span>{(lastSale.changeAmount || 0).toFixed(2)} DH</span>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={async () => {
                if (lastSale) {
                  try {
                    await ThermalReceiptPrinter.printReceipt({
                      invoiceNumber: lastSale.id,
                      date: new Date(lastSale.date),
                      items: lastSale.items,
                      subtotal: lastSale.totalAmount - (lastSale.taxAmount || 0),
                      taxAmount: lastSale.taxAmount || 0,
                      total: lastSale.totalAmount,
                      paidAmount: lastSale.paidAmount,
                      changeAmount: lastSale.changeAmount || 0,
                      paymentMethod: lastSale.paymentMethod
                    });
                    toast({
                      title: t('success'),
                      description: t('offline_sales_print_success'),
                    });
                  } catch (error) {
                    console.error('Print failed:', error);
                    toast({
                      title: t('offline_sales_print_error_title'),
                      description: error instanceof Error ? error.message : t('offline_sales_print_error_desc'),
                      variant: "destructive",
                    });
                  }
                }
              }}
              disabled={!lastSale}
            >
              <Printer className="h-4 w-4 mr-2" />
              {t('print_receipt')}
            </Button>
            <Button onClick={() => setIsReceiptOpen(false)}>
              <Receipt className="h-4 w-4 mr-2" />
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credit Management Dialog */}
      <Dialog open={isCreditDialogOpen} onOpenChange={setIsCreditDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t('credit_management')} - {selectedCustomer?.name}</DialogTitle>
            <div className="text-sm text-gray-600">
              {t('credit_management_desc')}
            </div>
          </DialogHeader>
          
          {selectedCustomer && (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">{t('overview')}</TabsTrigger>
                <TabsTrigger value="payment">{t('record_payment')}</TabsTrigger>
                <TabsTrigger value="history">{t('history')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                {loadingCreditInfo ? (
                  <div className="text-center py-8">
                    <div className="text-lg">{t('loading_credit_info')}</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-5 h-5 text-red-500" />
                        <h3 className="font-semibold">{t('current_balance')}</h3>
                      </div>
                      <p className="text-2xl font-bold text-red-600">
                        {(creditInfo?.currentBalance || 0).toFixed(2)} DH
                      </p>
                    </Card>
                    
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="w-5 h-5 text-blue-500" />
                        <h3 className="font-semibold">{t('credit_limit')}</h3>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">
                        {(creditInfo?.creditLimit || 0).toFixed(2)} DH
                      </p>
                    </Card>
                    
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-5 h-5 text-green-500" />
                        <h3 className="font-semibold">{t('available_credit')}</h3>
                      </div>
                      <p className="text-2xl font-bold text-green-600">
                        {Math.max(0, (creditInfo?.creditLimit || 0) - (creditInfo?.currentBalance || 0)).toFixed(2)} DH
                      </p>
                    </Card>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="payment" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">{t('payment_amount')}</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">{t('notes')}</label>
                      <Textarea
                        value={creditNote}
                        onChange={(e) => setCreditNote(e.target.value)}
                        placeholder={t('optional_note_placeholder')}
                        className="mt-1"
                        rows={3}
                      />
                    </div>
                    
                    <Button 
                      onClick={handleCreditPayment}
                      disabled={creditAmount <= 0}
                      className="w-full"
                    >
                      {t('record_payment')}
                    </Button>
                  </div>
                  
                  <div className="bg-gray-50 p-4 rounded">
                    <h3 className="font-semibold mb-2">{t('current_status')}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>{t('current_balance')}:</span>
                        <span className="font-medium text-red-600">
                          {(creditInfo?.currentBalance || 0).toFixed(2)} DH
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('credit_limit')}:</span>
                        <span className="font-medium text-blue-600">
                          {(creditInfo?.creditLimit || 0).toFixed(2)} DH
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="history" className="space-y-4">
                <div className="max-h-96 overflow-y-auto">
                  {creditInfo?.transactions && creditInfo.transactions.length > 0 ? (
                    <div className="space-y-2">
                      {creditInfo.transactions.map((transaction: any, index: number) => (
                        <div key={index} className="border rounded p-3 bg-gray-50">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium">
                                {transaction.type === 'credit_sale' ? t('offline_pos_credit_sale_label') : t('offline_pos_credit_payment_label')}
                              </div>
                              <div className="text-sm text-gray-600">
                                {new Date(transaction.date).toLocaleString('fr-MA')}
                              </div>
                              {transaction.note && (
                                <div className="text-sm text-gray-500 mt-1">{transaction.note}</div>
                              )}
                            </div>
                            <div className={`font-bold ${
                              transaction.type === 'credit_sale' ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {transaction.type === 'credit_sale' ? '+' : '-'}{transaction.amount.toFixed(2)} DH
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>{t('offline_pos_no_credit_transactions')}</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
    </Dialog>

    {/* Weighable Product Dialog */}
    {selectedWeighableProduct && (
      <WeighableProductDialog
        open={weighableDialogOpen}
        onOpenChange={setWeighableDialogOpen}
        product={{
          id: selectedWeighableProduct.id,
          name: selectedWeighableProduct.name,
          sellingPrice: selectedWeighableProduct.sellingPrice
        }}
        onConfirm={handleWeighableConfirm}
      />
    )}

    {/* Product Info Modal */}
    <Dialog open={productInfoOpen} onOpenChange={setProductInfoOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Package className="w-5 h-5" />
            {selectedProductInfo?.name}
          </DialogTitle>
        </DialogHeader>
        {selectedProductInfo && (
          <div className="space-y-4">
            {/* Barcode */}
            {selectedProductInfo.barcode && (
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm text-gray-600">{t('barcode')}:</span>
                <span className="font-mono font-medium">{selectedProductInfo.barcode}</span>
              </div>
            )}

            {/* Cost Price */}
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm text-gray-600">{t('cost_price')}:</span>
              <span className="font-semibold">{selectedProductInfo.costPrice.toFixed(2)} DH</span>
            </div>

            {/* Selling Price */}
            <div className="flex justify-between items-center py-2 border-b bg-blue-50 px-3 rounded">
              <span className="text-sm font-medium text-blue-900">{t('selling_price')}:</span>
              <div className="text-right">
                <div className="font-bold text-lg text-blue-900">{selectedProductInfo.sellingPrice.toFixed(2)} DH</div>
                <div className="text-xs text-green-600">
                  {t('margin')}: {((selectedProductInfo.sellingPrice - selectedProductInfo.costPrice) / selectedProductInfo.costPrice * 100).toFixed(1)}%
                  ({(selectedProductInfo.sellingPrice - selectedProductInfo.costPrice).toFixed(2)} DH)
                </div>
              </div>
            </div>

            {/* Semi-Wholesale Price */}
            {selectedProductInfo.semiWholesalePrice && selectedProductInfo.semiWholesalePrice > 0 && (
              <div className="flex justify-between items-center py-2 border-b bg-amber-50 px-3 rounded">
                <span className="text-sm font-medium text-amber-900">{t('semi_wholesale_price')}:</span>
                <div className="text-right">
                  <div className="font-bold text-lg text-amber-900">{selectedProductInfo.semiWholesalePrice.toFixed(2)} DH</div>
                  <div className="text-xs text-green-600">
                    {t('margin')}: {((selectedProductInfo.semiWholesalePrice - selectedProductInfo.costPrice) / selectedProductInfo.costPrice * 100).toFixed(1)}%
                    ({(selectedProductInfo.semiWholesalePrice - selectedProductInfo.costPrice).toFixed(2)} DH)
                  </div>
                </div>
              </div>
            )}

            {/* Wholesale Price */}
            {selectedProductInfo.wholesalePrice && selectedProductInfo.wholesalePrice > 0 && (
              <div className="flex justify-between items-center py-2 border-b bg-purple-50 px-3 rounded">
                <span className="text-sm font-medium text-purple-900">{t('wholesale_price')}:</span>
                <div className="text-right">
                  <div className="font-bold text-lg text-purple-900">{selectedProductInfo.wholesalePrice.toFixed(2)} DH</div>
                  <div className="text-xs text-green-600">
                    {t('margin')}: {((selectedProductInfo.wholesalePrice - selectedProductInfo.costPrice) / selectedProductInfo.costPrice * 100).toFixed(1)}%
                    ({(selectedProductInfo.wholesalePrice - selectedProductInfo.costPrice).toFixed(2)} DH)
                  </div>
                </div>
              </div>
            )}

            {/* Warning if any price is below cost */}
            {(selectedProductInfo.sellingPrice < selectedProductInfo.costPrice || 
              (selectedProductInfo.semiWholesalePrice && selectedProductInfo.semiWholesalePrice < selectedProductInfo.costPrice) ||
              (selectedProductInfo.wholesalePrice && selectedProductInfo.wholesalePrice < selectedProductInfo.costPrice)) && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <div className="flex items-center gap-2 text-red-700">
                  <span className="text-xl">⚠️</span>
                  <span className="text-sm font-medium">{t('price_below_cost_warning')}</span>
                </div>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setProductInfoOpen(false)}>
            {t('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('confirm_delete')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('confirm_delete_order_message')}
            {orderToDelete && ` #${orderToDelete.id}`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeleteSaleOrder} className="bg-red-600 hover:bg-red-700">
            {t('delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
