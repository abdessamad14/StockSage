import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";
import { ProductWithStockStatus, insertProductSchema } from "@shared/schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Check, Package, Search, Plus, Edit, Trash2, FileScan, Filter, ArrowUp, ArrowDown } from "lucide-react";
import BarcodeScannerModal from "@/components/BarcodeScannerModal";

// Product form schema with client-side validation
const formSchema = insertProductSchema.extend({
  tenantId: z.string().optional(),
  name: z.string().min(1),
  barcode: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  costPrice: z.coerce.number().min(0),
  sellingPrice: z.coerce.number().min(0),
  quantity: z.coerce.number().int().min(0),
  minStockLevel: z.coerce.number().int().min(0).optional(),
  unit: z.string().optional(),
  active: z.boolean().optional(),
});

type ProductForm = z.infer<typeof formSchema>;

export default function Products() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { setScannerOpen } = useStore();

  // State for UI controls
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductWithStockStatus | null>(null);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showScanner, setShowScanner] = useState(false);

  // CRUD operations
  const { data: products, isLoading, isError, refetch } = useQuery({
    queryKey: ['/api/products', search, categoryFilter],
  });

  // Categories derived from products
  const categories = products 
    ? Array.from(new Set(products.map(p => p.category).filter(Boolean))) 
    : [];

  // Create product mutation
  const createMutation = useMutation({
    mutationFn: async (product: ProductForm) => {
      const res = await apiRequest('POST', '/api/products', product);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: t('success'),
        description: t('product_created_successfully'),
      });
      setOpenDialog(false);
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : t('create_product_error'),
        variant: "destructive",
      });
    },
  });

  // Update product mutation
  const updateMutation = useMutation({
    mutationFn: async (product: ProductForm & { id: number }) => {
      const { id, ...data } = product;
      const res = await apiRequest('PUT', `/api/products/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: t('success'),
        description: t('product_updated_successfully'),
      });
      setOpenDialog(false);
      setEditProduct(null);
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : t('update_product_error'),
        variant: "destructive",
      });
    },
  });

  // Delete product mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('DELETE', `/api/products/${id}`, undefined);
      return res.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: t('success'),
        description: t('product_deleted_successfully'),
      });
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : t('delete_product_error'),
        variant: "destructive",
      });
    },
  });

  // Form setup
  const form = useForm<ProductForm>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      barcode: '',
      description: '',
      category: '',
      costPrice: 0,
      sellingPrice: 0,
      quantity: 0,
      minStockLevel: 10,
      unit: 'piece',
      active: true,
    },
  });

  // Handle dialog open/close
  const handleOpenDialog = (product?: ProductWithStockStatus) => {
    if (product) {
      setEditProduct(product);
      form.reset({
        name: product.name,
        barcode: product.barcode || '',
        description: product.description || '',
        category: product.category || '',
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        quantity: product.quantity,
        minStockLevel: product.minStockLevel || 10,
        unit: product.unit || 'piece',
        active: product.active,
      });
    } else {
      setEditProduct(null);
      form.reset({
        name: '',
        barcode: '',
        description: '',
        category: '',
        costPrice: 0,
        sellingPrice: 0,
        quantity: 0,
        minStockLevel: 10,
        unit: 'piece',
        active: true,
      });
    }
    setOpenDialog(true);
  };

  // Handle form submission
  const onSubmit = (values: ProductForm) => {
    if (editProduct) {
      updateMutation.mutate({ ...values, id: editProduct.id });
    } else {
      createMutation.mutate(values);
    }
  };

  // Handle barcode scan result
  const handleProductScanned = (product: ProductWithStockStatus) => {
    handleOpenDialog(product);
  };

  // Handle delete product
  const handleDeleteProduct = async (id: number) => {
    if (confirm(t('confirm_delete_product'))) {
      deleteMutation.mutate(id);
    }
  };

  // Sort products
  const sortedProducts = () => {
    if (!products) return [];
    
    let sorted = [...products];
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      sorted = sorted.filter(
        p => p.name.toLowerCase().includes(searchLower) || 
             (p.barcode && p.barcode.toLowerCase().includes(searchLower)) ||
             (p.description && p.description.toLowerCase().includes(searchLower))
      );
    }
    
    // Apply category filter
    if (categoryFilter) {
      sorted = sorted.filter(p => p.category === categoryFilter);
    }
    
    // Apply sorting
    if (sortField) {
      sorted.sort((a, b) => {
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
    }
    
    return sorted;
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
          <p className="mt-2 text-sm text-red-700">{t('products_load_error')}</p>
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
        {/* Header with Add Button */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold">{t('products')}</h1>
          <Button size="sm" onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-1" />
            {t('add')}
          </Button>
        </div>
        
        {/* Search Bar */}
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
          <span>{sortedProducts().length} {t('items')}</span>
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
              className={`flex items-center ${sortField === 'sellingPrice' ? 'text-primary font-medium' : ''}`}
              onClick={() => toggleSort('sellingPrice')}
            >
              {t('price')}
              {sortField === 'sellingPrice' && (
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
          </div>
        </div>
        
        {/* Products List */}
        {sortedProducts().length === 0 ? (
          <div className="text-center p-8">
            <Package className="h-12 w-12 mx-auto text-muted-foreground opacity-20 mb-3" />
            <h3 className="font-medium text-muted-foreground">{t('no_results')}</h3>
          </div>
        ) : (
          sortedProducts().map(product => (
            <Card key={product.id} className="mb-3 card">
              <div className="p-4">
                <div className="flex justify-between">
                  <div>
                    <h3 className="font-medium">{product.name}</h3>
                    {product.barcode && (
                      <p className="text-xs text-muted-foreground mt-0.5">{product.barcode}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7"
                      onClick={() => handleOpenDialog(product)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDeleteProduct(product.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex justify-between mt-3 items-center">
                  <div className="flex flex-col">
                    <span className="font-semibold">{product.sellingPrice.toFixed(2)} {t('currency')}</span>
                    <span className="text-xs text-muted-foreground">{product.quantity} {t(product.unit || 'piece')}</span>
                  </div>
                  <StockStatusBadge status={product.stockStatus} />
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
      
      {/* Product Form Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editProduct ? t('edit_product') : t('add_product')}</DialogTitle>
            <DialogDescription>{editProduct ? t('edit_product_description') : t('add_product_description')}</DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('product_name')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="barcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('barcode')}</FormLabel>
                      <div className="flex">
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="ml-2"
                          onClick={() => setShowScanner(true)}
                        >
                          <FileScan className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('category')}</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value || ''}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t('select_category')} />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map(category => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                            <SelectItem value="other">{t('other')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="costPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('cost_price')}</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="sellingPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('selling_price')}</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('quantity')}</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="minStockLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('min_stock_level')}</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('unit')}</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value || 'piece'}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('select_unit')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="piece">{t('piece')}</SelectItem>
                          <SelectItem value="kg">{t('kg')}</SelectItem>
                          <SelectItem value="liter">{t('liter')}</SelectItem>
                          <SelectItem value="box">{t('box')}</SelectItem>
                          <SelectItem value="pack">{t('pack')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('description')}</FormLabel>
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
                  onClick={() => setOpenDialog(false)}
                >
                  {t('cancel')}
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    t('loading')
                  ) : (
                    editProduct ? t('update') : t('save')
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Barcode Scanner */}
      <BarcodeScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onProductScanned={handleProductScanned}
      />
    </>
  );
}
