import { useState, useEffect } from "react";
import { useOfflineProducts } from "@/hooks/use-offline-products";
import { useOfflineStockTransactions } from "@/hooks/use-offline-stock-transactions";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { 
  OfflineProduct, 
  OfflineStockLocation, 
  offlineStockLocationStorage,
  offlineProductStockStorage,
  databaseProductStorage
} from "@/lib/offline-storage";
import { OfflineStockTransaction } from "../../../shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Package, 
  Search, 
  AlertTriangle, 
  TrendingDown, 
  Edit,
  Plus,
  Minus,
  Warehouse,
  Building2,
  Settings,
  Trash2,
  Star,
  ArrowRightLeft,
  PackagePlus,
  PackageMinus,
  History,
  TrendingUp,
  ShoppingCart,
  FileText,
  Loader2
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function OfflineInventory() {
  const { products, loading, updateProduct, ensureStockRecordExists } = useOfflineProducts();
  const { getTransactionsByProduct, createTransaction } = useOfflineStockTransactions();
  const { t } = useI18n();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<OfflineProduct | null>(null);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [adjustmentQuantity, setAdjustmentQuantity] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [stockLocations, setStockLocations] = useState<OfflineStockLocation[]>([]);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [editingLocation, setEditingLocation] = useState<OfflineStockLocation | null>(null);
  const [locationForm, setLocationForm] = useState({
    name: '',
    description: '',
    address: '',
    isPrimary: false
  });
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [transferQuantity, setTransferQuantity] = useState(0);
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [isStockEntryOpen, setIsStockEntryOpen] = useState(false);
  const [isStockExitOpen, setIsStockExitOpen] = useState(false);
  const [entryQuantity, setEntryQuantity] = useState(0);
  const [exitQuantity, setExitQuantity] = useState(0);
  const [entryReason, setEntryReason] = useState("");
  const [exitReason, setExitReason] = useState("");
  const [selectedLocationForEntry, setSelectedLocationForEntry] = useState("");
  const [showStockHistory, setShowStockHistory] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<OfflineProduct | null>(null);
  const [productTransactions, setProductTransactions] = useState<OfflineStockTransaction[]>([]);
  const [productStocks, setProductStocks] = useState<any[]>([]);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isAddingStock, setIsAddingStock] = useState(false);
  const [isRemovingStock, setIsRemovingStock] = useState(false);

  // Function to reload product stocks
  const reloadProductStocks = async () => {
    try {
      const stocks = await offlineProductStockStorage.getAll();
      setProductStocks(stocks);
    } catch (error) {
      console.error('Error reloading product stocks:', error);
    }
  };

  // Load stock locations and set primary as default
  useEffect(() => {
    const loadLocations = async () => {
      try {
        const locations = await offlineStockLocationStorage.getAll();
        setStockLocations(locations);
        
        // Set primary location as default
        const primaryLocation = locations.find(location => location.isPrimary);
        if (primaryLocation && !selectedLocation) {
          setSelectedLocation(primaryLocation.id);
        }

        // Load product stock data
        await reloadProductStocks();

        // Automatically ensure stock records exist for all products
        if (products.length > 0) {
          for (const product of products) {
            if (product.quantity > 0) {
              await ensureStockRecordExists(product);
            }
          }
        }
      } catch (error) {
        console.error('Error loading locations:', error);
        // Set empty array as fallback
        setStockLocations([]);
      }
    };
    
    loadLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Load product transactions when history dialog opens
  useEffect(() => {
    if (showStockHistory && historyProduct) {
      const loadTransactions = async () => {
        try {
          const allTransactions = await getTransactionsByProduct(historyProduct.id);
          
          // Filter transactions based on selected location
          let filteredTransactions = allTransactions as any[];
          if (selectedLocation !== "all") {
            filteredTransactions = filteredTransactions.filter(
              transaction => transaction.warehouseId === selectedLocation
            );
          }
          
          // Sort transactions by date in descending order (most recent first)
          filteredTransactions.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.date || 0);
            const dateB = new Date(b.createdAt || b.date || 0);
            return dateB.getTime() - dateA.getTime();
          });
          
          setProductTransactions(filteredTransactions);
        } catch (error) {
          console.error('Error loading product transactions:', error);
          setProductTransactions([]);
        }
      };
      loadTransactions();
    }
  }, [showStockHistory, historyProduct, selectedLocation, getTransactionsByProduct]);

  const getProductStockInLocation = (productId: string, locationId: string): number => {
    // Look up actual warehouse-specific stock quantity
    const stockRecord = productStocks.find(stock => 
      stock.productId === productId && stock.locationId === locationId
    );
    return stockRecord?.quantity || 0;
  };

  // Calculate total stock across all locations for a product
  const getTotalStockAcrossAllLocations = (productId: string): number => {
    // Sum stock from all locations for this product
    const totalFromLocations = productStocks
      .filter(stock => stock.productId === productId)
      .reduce((sum, stock) => sum + (stock.quantity || 0), 0);
    
    // If no location-specific stock found, fall back to product's base quantity
    return totalFromLocations > 0 ? totalFromLocations : (products.find(p => p.id === productId)?.quantity || 0);
  };

  const getTotalProductStock = (productId: string): number => {
    // Use the same logic as getTotalStockAcrossAllLocations for consistency
    return getTotalStockAcrossAllLocations(productId);
  };

  const loadStockLocations = async () => {
    const locations = await offlineStockLocationStorage.getAll();
    setStockLocations(locations);
  };

  const resetLocationForm = () => {
    setLocationForm({
      name: '',
      description: '',
      address: '',
      isPrimary: false
    });
    setEditingLocation(null);
  };

  const handleCreateLocation = async () => {
    if (!locationForm.name.trim()) {
      toast({
        title: t('error'),
        description: t('location_name_required'),
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingLocation) {
        await offlineStockLocationStorage.update(editingLocation.id, locationForm);
        toast({
          title: t('success'),
          description: t('stock_location_updated'),
        });
      } else {
        await offlineStockLocationStorage.create({
          name: locationForm.name,
          description: locationForm.description,
          isPrimary: locationForm.isPrimary
        });
        toast({
          title: t('success'),
          description: t('stock_location_created'),
        });
      }
      
      loadStockLocations();
      setShowLocationDialog(false);
      resetLocationForm();
    } catch (error) {
      toast({
        title: t('error'),
        description: t('failed_to_save_location'),
        variant: "destructive",
      });
    }
  };

  const handleEditLocation = (location: OfflineStockLocation) => {
    setEditingLocation(location);
    setLocationForm({
      name: location.name,
      description: location.description || '',
      address: location.address || '',
      isPrimary: location.isPrimary
    });
    setShowLocationDialog(true);
  };

  const handleDeleteLocation = (location: OfflineStockLocation) => {
    if (location.isPrimary) {
      toast({
        title: "Error",
        description: "Cannot delete the primary stock location",
        variant: "destructive",
      });
      return;
    }

    const success = offlineStockLocationStorage.delete(location.id);
    if (success) {
      toast({
        title: "Success",
        description: "Stock location deleted successfully",
      });
      loadStockLocations();
      if (selectedLocation === location.id) {
        setSelectedLocation("all");
      }
    } else {
      toast({
        title: "Error",
        description: "Failed to delete stock location",
        variant: "destructive",
      });
    }
  };

  const handleStockAdjustmentForLocation = (product: OfflineProduct, locationId: string) => {
    setSelectedProduct(product);
    const currentStock = locationId === "all" ? product.quantity : getProductStockInLocation(product.id, locationId);
    setAdjustmentQuantity(0);
    setAdjustmentReason("");
    setIsAdjustmentOpen(true);
  };

  const filteredProducts = products.filter(product => 
    !searchQuery || 
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.barcode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate metrics based on selected location
  const getLocationAwareMetrics = () => {
    if (selectedLocation === "all") {
      // Show combined metrics across all locations
      const lowStockProducts = products.filter(product => {
        const totalStock = getTotalStockAcrossAllLocations(product.id);
        return totalStock <= (product.minStockLevel || 10);
      });
      
      const totalValue = products.reduce((sum, product) => {
        const totalStock = getTotalStockAcrossAllLocations(product.id);
        return sum + (totalStock * product.costPrice);
      }, 0);

      // Count products that have stock in any location
      const productsWithStock = products.filter(product => {
        const totalStock = getTotalStockAcrossAllLocations(product.id);
        return totalStock > 0;
      });

      return {
        lowStockProducts,
        totalProducts: productsWithStock.length,
        totalValue,
        lowStockCount: lowStockProducts.length
      };
    } else {
      // Show metrics for specific location
      const productsInLocation = products.filter(product => {
        const stockInLocation = getProductStockInLocation(product.id, selectedLocation);
        return stockInLocation > 0;
      });

      const lowStockProducts = products.filter(product => {
        const stockInLocation = getProductStockInLocation(product.id, selectedLocation);
        return stockInLocation <= (product.minStockLevel || 10);
      });
      
      const totalValue = products.reduce((sum, product) => {
        const stockInLocation = getProductStockInLocation(product.id, selectedLocation);
        return sum + (stockInLocation * product.costPrice);
      }, 0);

      return {
        lowStockProducts,
        totalProducts: productsInLocation.length,
        totalValue,
        lowStockCount: lowStockProducts.length
      };
    }
  };

  const { lowStockProducts, totalProducts, totalValue, lowStockCount } = getLocationAwareMetrics();

  const handleStockAdjustment = (product: OfflineProduct) => {
    setSelectedProduct(product);
    setAdjustmentQuantity(0);
    setAdjustmentReason("");
    setIsAdjustmentOpen(true);
  };

  const handleStockTransfer = (product: OfflineProduct) => {
    setSelectedProduct(product);
    setTransferQuantity(0);
    setFromLocation("");
    setToLocation("");
    setIsTransferOpen(true);
  };

  const applyStockTransfer = async () => {
    if (!selectedProduct || !fromLocation || !toLocation || transferQuantity <= 0) {
      toast({
        title: "Error",
        description: "Please fill all transfer details",
        variant: "destructive"
      });
      return;
    }

    if (fromLocation === toLocation) {
      toast({
        title: "Error", 
        description: "Source and destination locations cannot be the same",
        variant: "destructive"
      });
      return;
    }

    setIsTransferring(true);
    try {
      const fromPreviousQuantity = getProductStockInLocation(selectedProduct.id, fromLocation);
      const toPreviousQuantity = getProductStockInLocation(selectedProduct.id, toLocation);

      const result = await offlineProductStockStorage.transferStock(
        selectedProduct.id,
        fromLocation,
        toLocation,
        transferQuantity
      );

      if (result.success) {
        // Record transfer out transaction
        createTransaction({
          productId: selectedProduct.id,
          warehouseId: fromLocation,
          type: 'transfer',
          quantity: -transferQuantity,
          previousQuantity: fromPreviousQuantity,
          newQuantity: fromPreviousQuantity - transferQuantity,
          reason: `Transfer to ${stockLocations.find(l => l.id === toLocation)?.name}`,
          reference: `TRANSFER-OUT-${toLocation}`
        });

        // Record transfer in transaction
        createTransaction({
          productId: selectedProduct.id,
          warehouseId: toLocation,
          type: 'transfer',
          quantity: transferQuantity,
          previousQuantity: toPreviousQuantity,
          newQuantity: toPreviousQuantity + transferQuantity,
          reason: `Transfer from ${stockLocations.find(l => l.id === fromLocation)?.name}`,
          reference: `TRANSFER-IN-${fromLocation}`
        });

        // Reload product stocks to show updated quantities immediately
        await reloadProductStocks();

        toast({
          title: "Success",
          description: result.message
        });
        setIsTransferOpen(false);
        setSelectedProduct(null);
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to transfer stock",
        variant: "destructive"
      });
    } finally {
      setIsTransferring(false);
    }
  };

  const handleStockEntry = (product: OfflineProduct) => {
    setSelectedProduct(product);
    setEntryQuantity(0);
    setEntryReason("");
    setSelectedLocationForEntry("");
    setIsStockEntryOpen(true);
  };

  const handleStockExit = (product: OfflineProduct) => {
    setSelectedProduct(product);
    setExitQuantity(0);
    setExitReason("");
    setSelectedLocationForEntry("");
    setIsStockExitOpen(true);
  };

  const handleViewStockHistory = (product: OfflineProduct) => {
    setHistoryProduct(product);
    setShowStockHistory(true);
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'purchase': return 'Purchase Order';
      case 'sale': return 'Sale';
      case 'adjustment': return 'Stock Adjustment';
      case 'transfer': return 'Stock Transfer';
      case 'entry': return 'Stock Entry';
      case 'exit': return 'Stock Exit';
      default: return type;
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase': return <PackagePlus className="w-4 h-4 text-green-600" />;
      case 'sale': return <ShoppingCart className="w-4 h-4 text-blue-600" />;
      case 'adjustment': return <Edit className="w-4 h-4 text-orange-600" />;
      case 'transfer': return <ArrowRightLeft className="w-4 h-4 text-blue-600" />;
      case 'entry': return <Plus className="w-4 h-4 text-green-600" />;
      case 'exit': return <Minus className="w-4 h-4 text-red-600" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const applyStockEntry = async () => {
    if (!selectedProduct || !selectedLocationForEntry || entryQuantity <= 0) {
      toast({
        title: "Error",
        description: "Please fill all entry details",
        variant: "destructive"
      });
      return;
    }

    setIsAddingStock(true);
    try {
      const previousQuantity = getProductStockInLocation(selectedProduct.id, selectedLocationForEntry);
      
      // Add stock to the selected location
      await offlineProductStockStorage.addStock(
        selectedProduct.id,
        selectedLocationForEntry,
        entryQuantity
      );

      // If this is the primary warehouse, also update the products table
      const primaryLocation = stockLocations.find(loc => loc.isPrimary);
      if (primaryLocation && selectedLocationForEntry === primaryLocation.id) {
        const newQuantity = previousQuantity + entryQuantity;
        await databaseProductStorage.updateQuantity(selectedProduct.id, newQuantity);
      }

      // Record stock transaction
      createTransaction({
        productId: selectedProduct.id,
        warehouseId: selectedLocationForEntry,
        type: 'entry',
        quantity: entryQuantity,
        previousQuantity,
        newQuantity: previousQuantity + entryQuantity,
        reason: entryReason || 'Stock entry'
      });

      // Reload product stocks to show updated quantities immediately
      await reloadProductStocks();

      toast({
        title: "Success",
        description: "Stock added successfully"
      });
      setIsStockEntryOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add stock",
        variant: "destructive"
      });
    } finally {
      setIsAddingStock(false);
    }
  };

  const applyStockExit = async () => {
    if (!selectedProduct || !selectedLocationForEntry || exitQuantity <= 0) {
      toast({
        title: "Error",
        description: "Please fill all exit details",
        variant: "destructive"
      });
      return;
    }

    setIsRemovingStock(true);
    try {
      const previousQuantity = getProductStockInLocation(selectedProduct.id, selectedLocationForEntry);
      
      // Remove stock from the selected location
      await offlineProductStockStorage.removeStock(
        selectedProduct.id,
        selectedLocationForEntry,
        exitQuantity
      );

      // If this is the primary warehouse, also update the products table
      const primaryLocation = stockLocations.find(loc => loc.isPrimary);
      if (primaryLocation && selectedLocationForEntry === primaryLocation.id) {
        const newQuantity = Math.max(0, previousQuantity - exitQuantity);
        await databaseProductStorage.updateQuantity(selectedProduct.id, newQuantity);
      }

      // Record stock transaction
      createTransaction({
        productId: selectedProduct.id,
        warehouseId: selectedLocationForEntry,
        type: 'exit',
        quantity: -exitQuantity,
        previousQuantity,
        newQuantity: previousQuantity - exitQuantity,
        reason: exitReason || 'Stock exit'
      });

      // Reload product stocks to show updated quantities immediately
      await reloadProductStocks();

      toast({
        title: "Success",
        description: "Stock removed successfully"
      });
      setIsStockExitOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove stock",
        variant: "destructive"
      });
    } finally {
      setIsRemovingStock(false);
    }
  };

  const applyStockAdjustment = () => {
    if (!selectedProduct) return;

    if (selectedLocation === "all") {
      // Adjust primary stock
      const previousQuantity = selectedProduct.quantity;
      const newQuantity = selectedProduct.quantity + adjustmentQuantity;
      if (newQuantity < 0) {
        toast({
          title: "Error",
          description: "Stock quantity cannot be negative",
          variant: "destructive"
        });
        return;
      }

      updateProduct(selectedProduct.id, { quantity: newQuantity });
      
      // Record stock transaction for primary location
      const primaryLocation = stockLocations.find(l => l.isPrimary);
      if (primaryLocation) {
        createTransaction({
          productId: selectedProduct.id,
          warehouseId: primaryLocation.id,
          type: 'adjustment',
          quantity: adjustmentQuantity,
          previousQuantity,
          newQuantity,
          reason: adjustmentReason || 'Stock adjustment'
        });
      }
    } else {
      // Adjust stock for specific location
      const currentStock = getProductStockInLocation(selectedProduct.id, selectedLocation);
      const newQuantity = currentStock + adjustmentQuantity;
      
      if (newQuantity < 0) {
        toast({
          title: "Error",
          description: "Stock quantity cannot be negative",
          variant: "destructive"
        });
        return;
      }

      // Update or create product stock for this location
      offlineProductStockStorage.upsert({
        productId: selectedProduct.id,
        locationId: selectedLocation,
        quantity: newQuantity,
        minStockLevel: selectedProduct.minStockLevel
      });

      // Record stock transaction
      createTransaction({
        productId: selectedProduct.id,
        warehouseId: selectedLocation,
        type: 'adjustment',
        quantity: adjustmentQuantity,
        previousQuantity: currentStock,
        newQuantity,
        reason: adjustmentReason || 'Stock adjustment'
      });
    }
    
    toast({
      title: "Success",
      description: `Stock adjusted for ${selectedProduct.name}`
    });

    setIsAdjustmentOpen(false);
    setSelectedProduct(null);
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
        <h1 className="text-3xl font-bold">{t('inventory_management')}</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Warehouse className="w-5 h-5" />
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder={t('select_location')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_locations')}</SelectItem>
                {stockLocations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      {location.name}
                      {location.isPrimary && " (Primary)"}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowLocationDialog(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t('add_location')}
          </Button>
          {selectedLocation !== "all" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const location = stockLocations.find(l => l.id === selectedLocation);
                if (location) handleEditLocation(location);
              }}
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('total_products')}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              {t('active_products_in_inventory')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('inventory_value')}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalValue.toFixed(2)} MAD</div>
            <p className="text-xs text-muted-foreground">
              {t('total_cost_value_of_stock')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('low_stock_items')}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground">
              {t('items_below_minimum_level')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {lowStockCount > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              {t('low_stock_alert')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockProducts.slice(0, 5).map((product) => (
                <div key={product.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium">{product.name}</span>
                  <Badge variant="destructive">
                    {selectedLocation === "all" 
                      ? `${getTotalProductStock(product.id)} left` 
                      : `${getProductStockInLocation(product.id, selectedLocation)} left`
                    }
                  </Badge>
                </div>
              ))}
              {lowStockCount > 5 && (
                <p className="text-sm text-red-600">
                  And {lowStockCount - 5} more items...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder={t('search_products')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('product')}</TableHead>
                <TableHead>{t('category')}</TableHead>
                <TableHead>{t('barcode')}</TableHead>
                <TableHead className="text-center">{t('current_stock')}</TableHead>
                <TableHead className="text-center">{t('min_level')}</TableHead>
                <TableHead className="text-right">{t('cost_price')}</TableHead>
                <TableHead className="text-right">{t('stock_value')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead className="w-20">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const currentStock = selectedLocation === "all" 
                  ? getTotalProductStock(product.id)
                  : getProductStockInLocation(product.id, selectedLocation);
                const isLowStock = currentStock <= (product.minStockLevel || 10);
                const stockValue = currentStock * product.costPrice;
                
                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      {product.name}
                    </TableCell>
                    <TableCell>
                      {product.categoryId && (
                        <Badge variant="outline">{t('category')}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {product.barcode || "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={isLowStock ? "text-red-600 font-bold" : ""}>
                        {currentStock}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {product.minStockLevel || 10}
                    </TableCell>
                    <TableCell className="text-right">
                      {product.costPrice.toFixed(2)} MAD
                    </TableCell>
                    <TableCell className="text-right">
                      {stockValue.toFixed(2)} MAD
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={isLowStock ? "destructive" : "default"}
                        className="flex items-center gap-1"
                      >
                        {isLowStock && <TrendingDown className="w-3 h-3" />}
                        {isLowStock ? t('low_stock') : t('in_stock')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStockAdjustment(product)}
                          className="h-8 w-8 p-0"
                          title="Adjust Stock"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStockTransfer(product)}
                          className="h-8 w-8 p-0"
                          title="Transfer Stock"
                        >
                          <ArrowRightLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStockEntry(product)}
                          className="h-8 w-8 p-0"
                          title="Add Stock (Entry)"
                        >
                          <PackagePlus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStockExit(product)}
                          className="h-8 w-8 p-0"
                          title="Remove Stock (Exit)"
                        >
                          <PackageMinus className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewStockHistory(product)}
                          className="h-8 w-8 p-0"
                          title="View Stock History"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-600">
                {searchQuery ? "Try adjusting your search" : "No products in inventory"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock Adjustment Dialog */}
      <Dialog open={isAdjustmentOpen} onOpenChange={setIsAdjustmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('adjust_stock')}</DialogTitle>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">{selectedProduct.name}</h3>
                <p className="text-sm text-gray-600">
                  {t('current_stock')}: {selectedLocation === "all" 
                    ? `${selectedProduct.quantity} units (Primary)` 
                    : `${getProductStockInLocation(selectedProduct.id, selectedLocation)} units (${stockLocations.find(l => l.id === selectedLocation)?.name})`
                  }
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('adjustment_quantity')}</label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAdjustmentQuantity(Math.max(-selectedProduct.quantity, adjustmentQuantity - 1))}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    value={adjustmentQuantity}
                    onChange={(e) => setAdjustmentQuantity(parseInt(e.target.value) || 0)}
                    className="w-24 text-center"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAdjustmentQuantity(adjustmentQuantity + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  {t('new_stock_level')}: {selectedLocation === "all" 
                    ? selectedProduct.quantity + adjustmentQuantity 
                    : getProductStockInLocation(selectedProduct.id, selectedLocation) + adjustmentQuantity
                  } units
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('reason_optional')}</label>
                <Input
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder={t('adjustment_reason_placeholder')}
                />
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdjustmentOpen(false)}>
              {t('cancel')}
            </Button>
            <Button 
              onClick={applyStockAdjustment}
              disabled={adjustmentQuantity === 0}
            >
              {t('apply_adjustment')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Transfer Dialog */}
      <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Stock</DialogTitle>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">{selectedProduct.name}</h3>
                <p className="text-sm text-gray-600">
                  Transfer inventory between stock locations
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">From Location *</label>
                  <Select value={fromLocation} onValueChange={setFromLocation}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('select_source_location')} />
                    </SelectTrigger>
                    <SelectContent>
                      {stockLocations.map((location) => {
                        const stock = getProductStockInLocation(selectedProduct.id, location.id);
                        return (
                          <SelectItem key={location.id} value={location.id} disabled={stock === 0}>
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4" />
                                {location.name}
                                {location.isPrimary && " (Primary)"}
                              </div>
                              <span className="text-xs text-gray-500 ml-2">
                                {stock} units
                              </span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {fromLocation && (
                    <p className="text-xs text-gray-500">
                      Available: {getProductStockInLocation(selectedProduct.id, fromLocation)} units
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">To Location *</label>
                  <Select value={toLocation} onValueChange={setToLocation}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('select_destination_location')} />
                    </SelectTrigger>
                    <SelectContent>
                      {stockLocations.map((location) => (
                        <SelectItem 
                          key={location.id} 
                          value={location.id}
                          disabled={location.id === fromLocation}
                        >
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            {location.name}
                            {location.isPrimary && " (Primary)"}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {toLocation && (
                    <p className="text-xs text-gray-500">
                      Current stock: {getProductStockInLocation(selectedProduct.id, toLocation)} units
                    </p>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Transfer Quantity *</label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTransferQuantity(Math.max(0, transferQuantity - 1))}
                    disabled={transferQuantity <= 0}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    value={transferQuantity}
                    onChange={(e) => setTransferQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                    className="text-center"
                    min="0"
                    max={fromLocation ? getProductStockInLocation(selectedProduct.id, fromLocation) : undefined}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const maxQuantity = fromLocation ? getProductStockInLocation(selectedProduct.id, fromLocation) : 0;
                      setTransferQuantity(Math.min(maxQuantity, transferQuantity + 1));
                    }}
                    disabled={!fromLocation || transferQuantity >= getProductStockInLocation(selectedProduct.id, fromLocation)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {fromLocation && (
                  <p className="text-xs text-gray-500">
                    Max available: {getProductStockInLocation(selectedProduct.id, fromLocation)} units
                  </p>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransferOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={applyStockTransfer}
              disabled={!fromLocation || !toLocation || transferQuantity <= 0 || isTransferring}
            >
              {isTransferring ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Transferring...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-4 h-4 mr-2" />
                  Transfer Stock
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Entry Dialog */}
      <Dialog open={isStockEntryOpen} onOpenChange={setIsStockEntryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Stock (Entry)</DialogTitle>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">{selectedProduct.name}</h3>
                <p className="text-sm text-gray-600">
                  Add inventory to a stock location
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Location *</label>
                <Select value={selectedLocationForEntry} onValueChange={setSelectedLocationForEntry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {stockLocations.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            {location.name}
                            {location.isPrimary && " (Primary)"}
                          </div>
                          <span className="text-xs text-gray-500 ml-2">
                            {getProductStockInLocation(selectedProduct.id, location.id)} units
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedLocationForEntry && (
                  <p className="text-xs text-gray-500">
                    Current stock: {getProductStockInLocation(selectedProduct.id, selectedLocationForEntry)} units
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Quantity to Add *</label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEntryQuantity(Math.max(0, entryQuantity - 1))}
                    disabled={entryQuantity <= 0}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    value={entryQuantity}
                    onChange={(e) => setEntryQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                    className="text-center"
                    min="0"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEntryQuantity(entryQuantity + 1)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {selectedLocationForEntry && entryQuantity > 0 && (
                  <p className="text-xs text-gray-500">
                    New stock level: {getProductStockInLocation(selectedProduct.id, selectedLocationForEntry) + entryQuantity} units
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason</label>
                <Select value={entryReason} onValueChange={setEntryReason}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('select_reason_optional')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">New Purchase</SelectItem>
                    <SelectItem value="return">Customer Return</SelectItem>
                    <SelectItem value="correction">Stock Correction</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStockEntryOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={applyStockEntry}
              disabled={!selectedLocationForEntry || entryQuantity <= 0 || isAddingStock}
            >
              {isAddingStock ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <PackagePlus className="w-4 h-4 mr-2" />
                  Add Stock
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Exit Dialog */}
      <Dialog open={isStockExitOpen} onOpenChange={setIsStockExitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Stock (Exit)</DialogTitle>
          </DialogHeader>
          
          {selectedProduct && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">{selectedProduct.name}</h3>
                <p className="text-sm text-gray-600">
                  Remove inventory from a stock location
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Location *</label>
                <Select value={selectedLocationForEntry} onValueChange={setSelectedLocationForEntry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {stockLocations.map((location) => {
                      const stock = getProductStockInLocation(selectedProduct.id, location.id);
                      return (
                        <SelectItem key={location.id} value={location.id} disabled={stock === 0}>
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4" />
                              {location.name}
                              {location.isPrimary && " (Primary)"}
                            </div>
                            <span className="text-xs text-gray-500 ml-2">
                              {stock} units
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {selectedLocationForEntry && (
                  <p className="text-xs text-gray-500">
                    Available stock: {getProductStockInLocation(selectedProduct.id, selectedLocationForEntry)} units
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Quantity to Remove *</label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExitQuantity(Math.max(0, exitQuantity - 1))}
                    disabled={exitQuantity <= 0}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <Input
                    type="number"
                    value={exitQuantity}
                    onChange={(e) => setExitQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                    className="text-center"
                    min="0"
                    max={selectedLocationForEntry ? getProductStockInLocation(selectedProduct.id, selectedLocationForEntry) : undefined}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const maxQuantity = selectedLocationForEntry ? getProductStockInLocation(selectedProduct.id, selectedLocationForEntry) : 0;
                      setExitQuantity(Math.min(maxQuantity, exitQuantity + 1));
                    }}
                    disabled={!selectedLocationForEntry || exitQuantity >= getProductStockInLocation(selectedProduct.id, selectedLocationForEntry)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {selectedLocationForEntry && exitQuantity > 0 && (
                  <p className="text-xs text-gray-500">
                    Remaining stock: {getProductStockInLocation(selectedProduct.id, selectedLocationForEntry) - exitQuantity} units
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason</label>
                <Select value={exitReason} onValueChange={setExitReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="damaged">Damaged Goods</SelectItem>
                    <SelectItem value="expired">Expired Items</SelectItem>
                    <SelectItem value="theft">Theft/Loss</SelectItem>
                    <SelectItem value="sample">Sample/Demo</SelectItem>
                    <SelectItem value="correction">Stock Correction</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStockExitOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={applyStockExit}
              disabled={!selectedLocationForEntry || exitQuantity <= 0 || isRemovingStock}
            >
              {isRemovingStock ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                <>
                  <PackageMinus className="w-4 h-4 mr-2" />
                  Remove Stock
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock History Dialog */}
      <Dialog open={showStockHistory} onOpenChange={setShowStockHistory}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Stock History - {historyProduct?.name}
            </DialogTitle>
          </DialogHeader>
          
          {historyProduct && (
            <div className="space-y-4">
              {/* Current Stock Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Current Stock Levels</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {selectedLocation === "all" ? (
                    <>
                      <div>
                        <span className="text-gray-600">Total Stock:</span>
                        <div className="font-bold">{getTotalProductStock(historyProduct.id)} units</div>
                      </div>
                      {stockLocations.map(location => {
                        const stock = getProductStockInLocation(historyProduct.id, location.id);
                        return (
                          <div key={location.id}>
                            <span className="text-gray-600">{location.name}:</span>
                            <div className="font-bold">{stock} units</div>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <div>
                      <span className="text-gray-600">
                        {stockLocations.find(l => l.id === selectedLocation)?.name || 'Selected Location'}:
                      </span>
                      <div className="font-bold">
                        {getProductStockInLocation(historyProduct.id, selectedLocation)} units
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Transaction History */}
              <div>
                <h4 className="font-medium mb-3">Transaction History</h4>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead className="text-center">Quantity</TableHead>
                        <TableHead className="text-center">Previous</TableHead>
                        <TableHead className="text-center">New</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Reference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        let filteredTransactions = productTransactions;
                        
                        // Filter by selected warehouse if not "all"
                        if (selectedLocation && selectedLocation !== "all") {
                          filteredTransactions = productTransactions.filter((t: any) => t.warehouseId === selectedLocation);
                        }
                        
                        if (productTransactions.length === 0) {
                          return (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                                No stock transactions found for this product
                                {selectedLocation && selectedLocation !== "all" && (
                                  <div className="text-xs mt-1">
                                    in {stockLocations.find(l => l.id === selectedLocation)?.name || 'selected location'}
                                  </div>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        }

                        return productTransactions.map((transaction) => {
                          const location = stockLocations.find(l => l.id === transaction.warehouseId);
                          const isIncrease = transaction.quantity > 0;
                          
                          return (
                            <TableRow key={transaction.id}>
                              <TableCell className="text-sm">
                                {(() => {
                                  // Handle different date formats from database
                                  if (!transaction.createdAt || transaction.createdAt === 'CURRENT_TIMESTAMP') {
                                    return 'Just now';
                                  }
                                  
                                  const date = new Date(transaction.createdAt);
                                  if (isNaN(date.getTime())) {
                                    // If date is invalid, show a fallback
                                    return 'Recent';
                                  }
                                  
                                  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
                                })()}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {getTransactionIcon(transaction.type)}
                                  <span className="text-sm">{getTransactionTypeLabel(transaction.type)}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">
                                {location?.name || 'Unknown Location'}
                              </TableCell>
                              <TableCell className="text-center">
                                <span className={`font-medium ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
                                  {isIncrease ? '+' : ''}{transaction.quantity}
                                </span>
                              </TableCell>
                              <TableCell className="text-center text-sm">
                                {transaction.previousQuantity}
                              </TableCell>
                              <TableCell className="text-center text-sm font-medium">
                                {transaction.newQuantity}
                              </TableCell>
                              <TableCell className="text-sm">
                                {transaction.reason || '-'}
                              </TableCell>
                              <TableCell className="text-sm">
                                {transaction.reference || '-'}
                              </TableCell>
                            </TableRow>
                          );
                        });
                      })()}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStockHistory(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stock Location Management Dialog */}
      <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? t('edit_stock_location') : t('add_new_stock_location')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{t('location_name')} *</label>
              <Input
                value={locationForm.name}
                onChange={(e) => setLocationForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('location_name_placeholder')}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('description')}</label>
              <Input
                value={locationForm.description}
                onChange={(e) => setLocationForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder={t('location_description_placeholder')}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{t('address')}</label>
              <Input
                value={locationForm.address}
                onChange={(e) => setLocationForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder={t('physical_address_placeholder')}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPrimary"
                checked={locationForm.isPrimary}
                onChange={(e) => setLocationForm(prev => ({ ...prev, isPrimary: e.target.checked }))}
              />
              <label htmlFor="isPrimary" className="text-sm font-medium">
                {t('set_as_primary_location')}
              </label>
            </div>
            {locationForm.isPrimary && (
              <p className="text-xs text-blue-600">
                The primary location will be used as the default for POS and other operations.
              </p>
            )}
            
            {/* Location Management Actions */}
            {editingLocation && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{t('location_actions')}</h4>
                    <p className="text-sm text-gray-600">{t('manage_this_stock_location')}</p>
                  </div>
                  {!editingLocation.isPrimary && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        handleDeleteLocation(editingLocation);
                        setShowLocationDialog(false);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
                
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span>Products in this location:</span>
                    <span className="font-medium">
                      {productStocks.filter(stock => stock.locationId === editingLocation.id).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span>Total stock value:</span>
                    <span className="font-medium text-green-600">
                      {(() => {
                        const locationStocks = productStocks.filter(stock => stock.locationId === editingLocation.id);
                        const totalValue = locationStocks.reduce((total, stock) => {
                          const product = products.find(p => p.id === stock.productId);
                          return total + (product ? product.costPrice * (stock.quantity || 0) : 0);
                        }, 0);
                        return totalValue.toFixed(2);
                      })()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowLocationDialog(false);
              resetLocationForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateLocation}>
              {editingLocation ? 'Update' : 'Create'} Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
