import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ProductWithStockStatus } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Search, Package, Filter, AlertTriangle, ArrowUp, ArrowDown, Plus, Minus } from "lucide-react";

// Inventory adjustment form schema
const adjustmentFormSchema = z.object({
  type: z.enum(['increase', 'decrease']),
  reason: z.string().min(1, "Reason is required"),
  notes: z.string().optional(),
  items: z.array(z.object({
    productId: z.number(),
    quantityBefore: z.number(),
    quantityAfter: z.number(),
    difference: z.number(),
  })).min(1, "At least one product must be selected"),
});

type AdjustmentForm = z.infer<typeof adjustmentFormSchema>;

export default function Inventory() {
  const { t } = useI18n();
  const { toast } = useToast();

  // State for UI controls
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [showLowStock, setShowLowStock] = useState(false);
  const [sortField, setSortField] = useState<string>("name");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [openAdjustmentDialog, setOpenAdjustmentDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithStockStatus | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'increase' | 'decrease'>('increase');
  const [adjustmentQuantity, setAdjustmentQuantity] = useState(0);

  // Fetch products
  const { data: products, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/products', showLowStock ? 'low-stock' : 'all'],
  });

  // Categories derived from products
  const categories = products 
    ? Array.from(new Set(products.map(p => p.category).filter(Boolean))) 
    : [];

  // Setup form
  const form = useForm<AdjustmentForm>({
    resolver: zodResolver(adjustmentFormSchema),
    defaultValues: {
      type: 'increase',
      reason: '',
      notes: '',
      items: [],
    },
  });

  // Create inventory adjustment mutation
  const adjustmentMutation = useMutation({
    mutationFn: async (data: AdjustmentForm) => {
      const payload = {
        adjustment: {
          type: data.type,
          reason: data.reason,
          notes: data.notes,
        },
        items: data.items,
      };
      const res = await apiRequest('POST', '/api/inventory/adjustments', payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: t('success'),
        description: t('inventory_adjustment_created'),
      });
      setOpenAdjustmentDialog(false);
      setSelectedProduct(null);
      setAdjustmentQuantity(0);
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : t('create_adjustment_error'),
        variant: "destructive",
      });
    },
  });

  // Filter and sort products
  const filteredProducts = () => {
    if (!products) return [];
    
    let filtered = [...products];
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        p => p.name.toLowerCase().includes(searchLower) || 
             (p.barcode && p.barcode.toLowerCase().includes(searchLower)) ||
             (p.description && p.description.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply category filter
    if (categoryFilter) {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }
    
    // Apply low stock filter
    if (showLowStock) {
      filtered = filtered.filter(p => p.stockStatus === 'low_stock' || p.stockStatus === 'out_of_stock');
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortField as keyof ProductWithStockStatus];
      const bValue = b[sortField as keyof ProductWithStockStatus];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }
      
      if (aValue === null) return sortDirection === 'asc' ? -1 : 1;
      if (bValue === null) return sortDirection === 'asc' ? 1 : -1;
      
      return sortDirection === 'asc' 
        ? (aValue as number) - (bValue as number) 
        : (bValue as number) - (aValue as number);
    });
    
    return filtered;
  };

  // Toggle sort direction
  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Handle inventory adjustment
  const openAdjustmentForm = (product: ProductWithStockStatus) => {
    setSelectedProduct(product);
    setAdjustmentType('increase');
    setAdjustmentQuantity(0);
    form.reset({
      type: 'increase',
      reason: '',
      notes: '',
      items: [
        {
          productId: product.id,
          quantityBefore: product.quantity,
          quantityAfter: product.quantity,
          difference: 0,
        }
      ],
    });
    setOpenAdjustmentDialog(true);
  };

  // Update quantity when adjustment type or amount changes
  const updateQuantity = (type: 'increase' | 'decrease', quantity: number) => {
    if (!selectedProduct) return;
    
    setAdjustmentType(type);
    setAdjustmentQuantity(quantity);
    
    const quantityBefore = selectedProduct.quantity;
    const difference = type === 'increase' ? quantity : -quantity;
    const quantityAfter = quantityBefore + difference;
    
    form.setValue('type', type);
    form.setValue('items', [
      {
        productId: selectedProduct.id,
        quantityBefore,
        quantityAfter,
        difference: Math.abs(difference),
      }
    ]);
  };

  // Handle form submission
  const onSubmit = (values: AdjustmentForm) => {
    adjustmentMutation.mutate(values);
  };

  // Status badge for stock level
  const StockStatusBadge = ({ status }: { status: 'in_stock' | 'low_stock' | 'out_of_stock' }) => {
    const colors = {
      in_stock: "bg-green-100 text-success",
      low_stock: "bg-orange-100 text-orange-600",
      out_of_stock: "bg-red-100 text-error"
    };
    
    const dotColors = {
      in_stock: "bg-success",
      low_stock: "bg-orange-600",
      out_of_stock: "bg-error"
    };
    
    return (
      <div className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${colors[status]}`}>
        <span className={`w-1.5 h-1.5 rounded-full mr-1 ${dotColors[status]}`}></span>
        {t(status)}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-10" />
        </div>
        <div className="mb-4">
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="mb-6">
          <Skeleton className="h-10 w-full" />
        </div>
        {[1, 2, 3, 4, 5].map(i => (
          <Card key={i} className="mb-3">
            <div className="p-4">
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-24 mb-2" />
              <div className="flex justify-between mt-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4">
        <Card className="bg-red-50 border border-red-200 p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-semibold">{t('error')}</h3>
          </div>
          <p className="mt-2 text-sm text-red-700">{t('inventory_load_error')}</p>
          <Button 
            onClick={() => refetch()} 
            variant="outline" 
            className="mt-4 text-red-700 border-red-300"
          >
            {t('retry')}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="p-4">
        {/* Header with Low Stock Filter */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold">{t('inventory')}</h1>
          <div className="flex gap-2">
            <Button 
              variant={showLowStock ? "destructive" : "outline"}
              size="sm"
              onClick={() => setShowLowStock(!showLowStock)}
            >
              <AlertTriangle className={`h-4 w-4 ${showLowStock ? 'mr-1' : ''}`} />
              {showLowStock && t('low_stock')}
            </Button>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="search"
            placeholder={t('search_products')}
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        {/* Filters */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{t('filters')}</span>
          </div>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="w-full grid grid-flow-col auto-cols-fr mb-2 p-0 h-full">
              <TabsTrigger 
                value="all" 
                className="text-xs py-1 px-2 data-[state=active]:bg-primary data-[state=active]:text-white rounded-md"
                onClick={() => setCategoryFilter(null)}
              >
                {t('all_categories')}
              </TabsTrigger>
              {categories.slice(0, 3).map(category => (
                <TabsTrigger 
                  key={category} 
                  value={category}
                  className="text-xs py-1 px-2 data-[state=active]:bg-primary data-[state=active]:text-white rounded-md"
                  onClick={() => setCategoryFilter(category)}
                >
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        
        {/* Sort Controls */}
        <div className="flex justify-between items-center mb-3 text-xs text-muted-foreground">
          <span>{filteredProducts().length} {t('items')}</span>
          <div className="flex gap-3">
            <button 
              className={`flex items-center ${sortField === 'name' ? 'text-primary font-medium' : ''}`}
              onClick={() => toggleSort('name')}
            >
              {t('product_name')}
              {sortField === 'name' && (
                sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
              )}
            </button>
            <button 
              className={`flex items-center ${sortField === 'quantity' ? 'text-primary font-medium' : ''}`}
              onClick={() => toggleSort('quantity')}
            >
              {t('quantity')}
              {sortField === 'quantity' && (
                sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
              )}
            </button>
            <button 
              className={`flex items-center ${sortField === 'minStockLevel' ? 'text-primary font-medium' : ''}`}
              onClick={() => toggleSort('minStockLevel')}
            >
              {t('min_stock_level')}
              {sortField === 'minStockLevel' && (
                sortDirection === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
              )}
            </button>
          </div>
        </div>
        
        {/* Products List */}
        {filteredProducts().length === 0 ? (
          <div className="text-center p-8">
            <Package className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-3" />
            <h3 className="font-medium text-muted-foreground">{t('no_results')}</h3>
          </div>
        ) : (
          filteredProducts().map(product => (
            <Card key={product.id} className="mb-3 card">
              <div className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-medium">{product.name}</h3>
                    {product.barcode && (
                      <p className="text-xs text-muted-foreground mt-0.5">{product.barcode}</p>
                    )}
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => openAdjustmentForm(product)}
                  >
                    {t('adjust')}
                  </Button>
                </div>
                <div className="flex justify-between mt-3 items-center">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-muted-foreground">{t('current')}:</span>
                    <span className="font-medium">{product.quantity} {t(product.unit || 'piece')}</span>
                    
                    <span className="text-muted-foreground">{t('min_level')}:</span>
                    <span className="font-medium">{product.minStockLevel || 0} {t(product.unit || 'piece')}</span>
                  </div>
                  <StockStatusBadge status={product.stockStatus} />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
      
      {/* Adjustment Dialog */}
      <Dialog open={openAdjustmentDialog} onOpenChange={setOpenAdjustmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('adjust_inventory')}</DialogTitle>
            <DialogDescription>
              {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Current Stock Info */}
              <div className="bg-muted p-3 rounded-md">
                <div className="grid grid-cols-2 gap-y-1 text-sm">
                  <span className="text-muted-foreground">{t('current_quantity')}:</span>
                  <span className="font-medium">{selectedProduct?.quantity} {t(selectedProduct?.unit || 'piece')}</span>
                  
                  <span className="text-muted-foreground">{t('min_stock_level')}:</span>
                  <span className="font-medium">{selectedProduct?.minStockLevel || 0} {t(selectedProduct?.unit || 'piece')}</span>
                </div>
              </div>
              
              {/* Adjustment Type */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('adjustment_type')}</FormLabel>
                    <div className="flex gap-4">
                      <Button 
                        type="button"
                        variant={adjustmentType === 'increase' ? 'default' : 'outline'}
                        onClick={() => updateQuantity('increase', adjustmentQuantity)}
                        className="flex-1"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {t('increase')}
                      </Button>
                      <Button 
                        type="button"
                        variant={adjustmentType === 'decrease' ? 'default' : 'outline'}
                        onClick={() => updateQuantity('decrease', adjustmentQuantity)}
                        className="flex-1"
                      >
                        <Minus className="h-4 w-4 mr-2" />
                        {t('decrease')}
                      </Button>
                    </div>
                  </FormItem>
                )}
              />
              
              {/* Adjustment Quantity */}
              <div>
                <FormLabel>{t('quantity')}</FormLabel>
                <Input
                  type="number"
                  min="0"
                  value={adjustmentQuantity}
                  onChange={(e) => updateQuantity(adjustmentType, parseInt(e.target.value) || 0)}
                  className="mb-1"
                />
                <div className="text-sm text-muted-foreground flex justify-between">
                  <span>{t('new_quantity')}:</span>
                  <span className="font-medium">
                    {selectedProduct 
                      ? adjustmentType === 'increase'
                        ? selectedProduct.quantity + adjustmentQuantity
                        : Math.max(0, selectedProduct.quantity - adjustmentQuantity)
                      : 0
                    } {t(selectedProduct?.unit || 'piece')}
                  </span>
                </div>
              </div>
              
              {/* Reason */}
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('reason')}</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('select_reason')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="physical_count">{t('physical_count')}</SelectItem>
                        <SelectItem value="damaged">{t('damaged')}</SelectItem>
                        <SelectItem value="expired">{t('expired')}</SelectItem>
                        <SelectItem value="returned">{t('returned')}</SelectItem>
                        <SelectItem value="initial_stock">{t('initial_stock')}</SelectItem>
                        <SelectItem value="other">{t('other')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('notes')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setOpenAdjustmentDialog(false)}
                >
                  {t('cancel')}
                </Button>
                <Button 
                  type="submit" 
                  disabled={adjustmentMutation.isPending || adjustmentQuantity <= 0}
                >
                  {adjustmentMutation.isPending ? t('loading') : t('save')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
