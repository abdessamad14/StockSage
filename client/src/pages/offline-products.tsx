import { useState, useEffect } from "react";
import { useOfflineProducts } from "@/hooks/use-offline-products";
import { useOfflineStockLocations } from "@/hooks/use-offline-stock-locations";
import { useOfflineStockTransactions } from "@/hooks/use-offline-stock-transactions";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { OfflineProduct, OfflineCategory, OfflineProductStock, offlineCategoryStorage, offlineProductStockStorage } from "@/lib/database-storage";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Package, Search, Plus, Edit, Trash2, Tag, Filter, Upload, X, Image } from "lucide-react";

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  barcode: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  costPrice: z.number().min(0, "Cost price must be positive"),
  sellingPrice: z.number().min(0, "Selling price must be positive"),
  semiWholesalePrice: z.number().min(0, "Semi-wholesale price must be positive").optional(),
  wholesalePrice: z.number().min(0, "Wholesale price must be positive").optional(),
  quantity: z.number().min(0, "Quantity must be positive"),
  minStockLevel: z.number().min(0, "Min stock level must be positive").optional(),
  unit: z.string().optional(),
  image: z.string().optional(),
  active: z.boolean().default(true)
});

const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  image: z.string().optional()
});

type ProductFormData = z.infer<typeof productSchema>;
type CategoryFormData = z.infer<typeof categorySchema>;

export default function OfflineProducts() {
  const { products, createProduct, updateProduct, deleteProduct } = useOfflineProducts();
  const { stockLocations } = useOfflineStockLocations();
  const { createTransaction } = useOfflineStockTransactions();
  const { t } = useI18n();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<OfflineProduct | null>(null);
  const [editingCategory, setEditingCategory] = useState<OfflineCategory | null>(null);
  const [categories, setCategories] = useState<OfflineCategory[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedCategoryImage, setSelectedCategoryImage] = useState<string | null>(null);
  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  const [lastKeyTime, setLastKeyTime] = useState(0);
  const [productStocks, setProductStocks] = useState<Record<string, number>>({});

  // Get primary warehouse
  const primaryWarehouse = stockLocations.find(loc => loc.isPrimary) || stockLocations[0];

  // Function to refresh product stocks
  const refreshProductStocks = async () => {
    if (!primaryWarehouse) return;
    
    const stockMap: Record<string, number> = {};
    
    for (const product of products) {
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

  // Fetch product stocks from primary warehouse
  useEffect(() => {
    refreshProductStocks();
  }, [products, primaryWarehouse]);

  const formatPrice = (value?: number | null) => {
    const safeValue = typeof value === 'number' ? value : 0;
    return `${safeValue.toFixed(2)} ${t('currency')}`;
  };

  // Function to get warehouse-specific stock quantity
  const getWarehouseStock = (productId: string): number => {
    // Return stock from primary warehouse (from product_stock table)
    return productStocks[productId] || 0;
  };

  // Image handling functions
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: t('error'),
          description: t('image_size_limit'),
          variant: "destructive"
        });
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: t('error'), 
          description: t('select_valid_image'),
          variant: "destructive"
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setSelectedImage(base64);
        productForm.setValue('image', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    productForm.setValue('image', '');
  };

  const handleCategoryImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image size must be less than 5MB",
        variant: "destructive"
      });
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error", 
        description: "Please select a valid image file",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      setSelectedCategoryImage(base64);
      categoryForm.setValue('image', base64);
    };
    reader.readAsDataURL(file);
  };

  const removeCategoryImage = () => {
    setSelectedCategoryImage(null);
    categoryForm.setValue('image', '');
  };

  const productForm = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      barcode: "",
      description: "",
      categoryId: "none",
      costPrice: 0,
      sellingPrice: 0,
      quantity: 0,
      minStockLevel: 0,
      unit: "",
      image: "",
      active: true
    }
  });

  const categoryForm = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      description: "",
      image: ""
    }
  });

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoriesData = await offlineCategoryStorage.getAll();
        setCategories(categoriesData);
      } catch (error) {
        console.error('Error loading categories:', error);
        setCategories([]); // Fallback to empty array
      }
    };
    loadCategories();
  }, []);

  // Barcode scanner handler for modals
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      
      // Check if we're inside a modal dialog
      const isInModal = target.closest('[role="dialog"]') !== null || 
                       target.closest('.modal') !== null ||
                       document.querySelector('[role="dialog"]') !== null;
      
      const currentTime = Date.now();
      
      // Handle barcode scanning in modals - prevent Enter from closing modal
      if (isInModal) {
        // If Enter key is pressed and we have barcode buffer, it's from scanner
        if (event.key === 'Enter' && barcodeBuffer.length > 0) {
          event.preventDefault();
          event.stopPropagation();
          
          // If we're in the barcode input field, set the scanned value
          const barcodeInput = document.querySelector('input[name="barcode"]') as HTMLInputElement;
          if (barcodeInput && document.activeElement !== barcodeInput) {
            barcodeInput.value = barcodeBuffer;
            barcodeInput.focus();
            // Trigger form field update
            const event = new Event('input', { bubbles: true });
            barcodeInput.dispatchEvent(event);
          }
          
          setBarcodeBuffer('');
          setLastKeyTime(0);
          return;
        }
        
        // If it's a regular character and scanner is typing fast (< 100ms between keys)
        if (event.key && event.key.length === 1 && (currentTime - lastKeyTime < 100 || barcodeBuffer.length === 0)) {
          setBarcodeBuffer(prev => prev + event.key);
          setLastKeyTime(currentTime);
          return;
        }
        
        // If too much time passed, reset buffer (not a scanner)
        if (currentTime - lastKeyTime > 100) {
          setBarcodeBuffer('');
        }
        return;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [barcodeBuffer, lastKeyTime]);

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchQuery || 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategoryFilter === "all" || 
      product.categoryId === selectedCategoryFilter ||
      (selectedCategoryFilter === "uncategorized" && !product.categoryId);
    
    return matchesSearch && matchesCategory;
  });

  // Get category name by ID or name
  const getCategoryName = (categoryIdOrName: string | null | undefined) => {
    if (!categoryIdOrName) return t('uncategorized');
    
    // First try to find by ID (for backward compatibility)
    const categoryById = categories.find(c => c.id === categoryIdOrName);
    if (categoryById) return categoryById.name;
    
    // Then try to find by name (new format)
    const categoryByName = categories.find(c => c.name === categoryIdOrName);
    if (categoryByName) return categoryByName.name;
    
    // If it's already a category name that exists, return it
    if (categories.some(c => c.name === categoryIdOrName)) {
      return categoryIdOrName;
    }
    
    // Otherwise return the value as-is (it might be a valid category name not yet loaded)
    return categoryIdOrName || t('unknown_category');
  };

  // Product handlers
  const handleCreateProduct = async (data: ProductFormData) => {
    try {
      await createProduct({
        ...data,
        categoryId: data.categoryId === "none" ? undefined : data.categoryId ?? undefined,
        barcode: data.barcode ?? undefined,
        description: data.description ?? undefined,
        minStockLevel: data.minStockLevel ?? undefined,
        unit: data.unit ?? undefined,
        semiWholesalePrice: data.semiWholesalePrice ?? undefined,
        wholesalePrice: data.wholesalePrice ?? undefined,
        image: selectedImage ?? undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      // Refresh stock data after creating product
      await refreshProductStocks();
      
      toast({
        title: t('success'),
        description: t('product_created_successfully')
      });
      setIsProductDialogOpen(false);
      productForm.reset();
      setSelectedImage(null);
    } catch (error) {
      toast({
        title: t('error'),
        description: t('failed_to_create_product'),
        variant: "destructive"
      });
    }
  };

  const handleUpdateProduct = async (data: ProductFormData) => {
    if (!editingProduct) return;
    
    try {
      // Get current stock quantity before update
      const currentStock = getWarehouseStock(editingProduct.id);
      const newQuantity = data.quantity;
      
      // Debug logging
      console.log('Form data categoryId:', data.categoryId);
      console.log('Selected image:', selectedImage);
      
      // Update product information
      await updateProduct(editingProduct.id, {
        ...data,
        categoryId: data.categoryId === "none" ? undefined : data.categoryId,
        barcode: data.barcode ?? undefined,
        description: data.description ?? undefined,
        minStockLevel: data.minStockLevel ?? undefined,
        unit: data.unit ?? undefined,
        semiWholesalePrice: data.semiWholesalePrice ?? undefined,
        wholesalePrice: data.wholesalePrice ?? undefined,
        image: selectedImage ?? undefined,
        updatedAt: new Date().toISOString()
      });

      // Refresh stock data after updating product
      await refreshProductStocks();

      toast({
        title: t('success'),
        description: t('product_updated_successfully')
      });
      setIsProductDialogOpen(false);
      setEditingProduct(null);
      productForm.reset();
      setSelectedImage(null);
    } catch (error) {
      toast({
        title: t('error'),
        description: t('failed_to_update_product'),
        variant: "destructive"
      });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      deleteProduct(productId);
      toast({
        title: t('success'),
        description: t('product_deleted_successfully')
      });
    } catch (error) {
      toast({
        title: t('error'),
        description: t('failed_to_delete_product'),
        variant: "destructive"
      });
    }
  };

  const getProductStock = async (productId: string) => {
    // Get stock from primary warehouse instead of main product quantity
    try {
      const primaryLocation = stockLocations.find(loc => loc.isPrimary);
      if (primaryLocation) {
        const { offlineProductStockStorage } = await import('@/lib/database-storage');
        const stockRecord = await offlineProductStockStorage.getByProductAndLocation(productId, primaryLocation.id);
        return { quantity: stockRecord?.quantity || 0 };
      }
    } catch (error) {
      console.warn('Could not get primary warehouse stock, falling back to product quantity');
    }
    
    // Fallback to main product quantity
    const product = products.find(p => p.id === productId);
    return product ? { quantity: product.quantity } : { quantity: 0 };
  };

  // Category handlers
  const handleDeleteCategory = async (categoryId: string) => {
    try {
      await offlineCategoryStorage.delete(categoryId);
      const updatedCategories = await offlineCategoryStorage.getAll();
      setCategories(updatedCategories);
      toast({
        title: t('success'),
        description: t('category_deleted_successfully')
      });
    } catch (error) {
      toast({
        title: t('error'),
        description: t('failed_to_delete_category'),
        variant: "destructive"
      });
    }
  };

  const handleUpdateCategory = async (data: CategoryFormData) => {
    if (!editingCategory) return;
    try {
      await offlineCategoryStorage.update(editingCategory.id, {
        name: data.name,
        description: data.description || undefined,
        image: selectedCategoryImage || undefined
      });
      const updatedCategories = await offlineCategoryStorage.getAll();
      setCategories(updatedCategories);
      toast({
        title: t('success'),
        description: t('category_updated_successfully')
      });
      setIsCategoryDialogOpen(false);
      setEditingCategory(null);
      categoryForm.reset();
      setSelectedCategoryImage(null);
    } catch (error) {
      toast({
        title: t('error'),
        description: t('failed_to_update_category'),
        variant: "destructive"
      });
    }
  };

  const handleCreateCategory = async (data: CategoryFormData) => {
    try {
      await offlineCategoryStorage.create({
        name: data.name,
        description: data.description || undefined,
        image: selectedCategoryImage || undefined
      });
      
      // Reload categories
      const categoriesData = await offlineCategoryStorage.getAll();
      setCategories(categoriesData);
      
      setIsCategoryDialogOpen(false);
      categoryForm.reset();
      setSelectedCategoryImage(null);
      
      toast({
        title: t('success'),
        description: t('category_created_successfully'),
      });
    } catch (error) {
      console.error('Error creating category:', error);
      toast({
        title: t('error'),
        description: t('failed_to_create_category'),
        variant: "destructive",
      });
    }
  };

  const openProductDialog = (product?: OfflineProduct) => {
    if (product) {
      setEditingProduct(product);
      setSelectedImage(product.image || null);
      
      // Find category ID from category name (categoryId might contain the name instead of ID)
      let categoryIdForForm = product.categoryId || "none";
      if (product.categoryId) {
        // Check if it's a category name (not a number)
        const categoryByName = categories.find(c => c.name === product.categoryId);
        if (categoryByName) {
          categoryIdForForm = categoryByName.id;
        } else {
          // Check if it's already an ID
          const categoryById = categories.find(c => c.id === product.categoryId);
          categoryIdForForm = categoryById ? categoryById.id : "none";
        }
      }
      
      productForm.reset({
        name: product.name,
        barcode: product.barcode || "",
        description: product.description || "",
        categoryId: categoryIdForForm,
        costPrice: product.costPrice,
        sellingPrice: product.sellingPrice,
        semiWholesalePrice: product.semiWholesalePrice || 0,
        wholesalePrice: product.wholesalePrice || 0,
        quantity: product.quantity,
        minStockLevel: product.minStockLevel || 0,
        unit: product.unit || "",
        image: product.image || "",
        active: product.active
      });
    } else {
      setEditingProduct(null);
      setSelectedImage(null);
      productForm.reset();
    }
    setIsProductDialogOpen(true);
  };

  const openCategoryDialog = (category?: OfflineCategory) => {
    if (category) {
      setEditingCategory(category);
      setSelectedCategoryImage(category.image || null);
      categoryForm.reset({
        name: category.name,
        description: category.description || "",
        image: category.image || ""
      });
    } else {
      setEditingCategory(null);
      setSelectedCategoryImage(null);
      categoryForm.reset();
    }
    setIsCategoryDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('products_and_categories')}</h1>
        <div className="flex gap-2">
          <Button onClick={() => openCategoryDialog()} variant="outline">
            <Tag className="w-4 h-4 mr-2" />
            {t('manage_categories')}
          </Button>
          <Button onClick={() => openProductDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            {t('add_product')}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products">{t('products')}</TabsTrigger>
          <TabsTrigger value="categories">{t('categories')}</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder={t('search_products')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder={t('filter_by_category')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all_categories')}</SelectItem>
                <SelectItem value="uncategorized">{t('uncategorized')}</SelectItem>
                {(categories || []).map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Products Legacy List */}
          <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 shadow-sm overflow-hidden">
            <div className="hidden md:grid md:grid-cols-[5fr_4fr_2fr_1fr] gap-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-4 py-3 text-xs font-semibold tracking-wide text-white uppercase">
              <div>{t('product_list_product')}</div>
              <div className="pl-2">{t('product_list_pricing')}</div>
              <div>{t('product_list_stock')}</div>
              <div className="text-right">{t('product_list_actions')}</div>
            </div>
            <div className="divide-y divide-blue-100/60">
              {filteredProducts.length === 0 && (
                <div className="px-4 py-10 text-center text-sm text-gray-500">
                  {t('legacy_list_empty')}
                </div>
              )}
              {filteredProducts.map((product) => {
                const quantity = getWarehouseStock(product.id);
                const isLowStock = quantity <= (product.minStockLevel || 0);

                const stockLabel = `${quantity}${product.unit ? ` ${product.unit}` : ''}`;
                const profit = product.sellingPrice - product.costPrice;
                const marginPercentage = product.sellingPrice > 0 ? (profit / product.sellingPrice) * 100 : 0;
                const stockValue = product.costPrice * quantity;
                const profitColor = profit >= 0 ? 'text-emerald-600' : 'text-red-500';
                const marginColor = profit >= 0 ? 'text-emerald-700' : 'text-red-500';

                return (
                  <div
                    key={product.id}
                    className="flex flex-col gap-4 px-4 py-4 transition md:grid md:grid-cols-[5fr_4fr_2fr_1fr] md:gap-4 hover:bg-white/90 bg-white/70"
                  >
                    {/* Product column */}
                    <div className="flex gap-4">
                      <div className="w-20 h-20 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-100/60 via-white to-purple-100/60 flex items-center justify-center overflow-hidden">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-8 h-8 text-blue-500" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-base leading-tight text-slate-900">{product.name}</p>
                          <Badge className="bg-blue-100 text-blue-700 border border-blue-200">{getCategoryName(product.categoryId)}</Badge>
                          {!product.active && (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-700">
                              {t('inactive')}
                            </Badge>
                          )}
                        </div>
                        {product.description && (
                          <p className="text-xs text-slate-500 line-clamp-2">{product.description}</p>
                        )}
                        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                          {product.barcode && (
                            <span>{t('barcode')}: <span className="font-mono text-slate-700">{product.barcode}</span></span>
                          )}
                          {product.unit && (
                            <span>{t('unit')}: {product.unit}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Pricing column */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="space-y-1">
                        <p className="text-xs uppercase text-slate-500">{t('cost_price')}</p>
                        <p className="font-semibold text-slate-800">{formatPrice(product.costPrice)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs uppercase text-slate-500">{t('price')}</p>
                        <p className="font-semibold text-blue-600">{formatPrice(product.sellingPrice)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs uppercase text-slate-500">{t('profit_margin')}</p>
                        <p className={`font-semibold ${profitColor}`}>{formatPrice(profit)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs uppercase text-slate-500">{t('margin_percentage')}</p>
                        <p className={`font-semibold ${marginColor}`}>{marginPercentage.toFixed(1)}%</p>
                      </div>
                      {product.semiWholesalePrice !== undefined && (
                        <div className="space-y-1">
                          <p className="text-xs uppercase text-slate-500">{t('semi_wholesale_price')}</p>
                          <p className="font-semibold text-emerald-600">{formatPrice(product.semiWholesalePrice)}</p>
                        </div>
                      )}
                      {product.wholesalePrice !== undefined && (
                        <div className="space-y-1">
                          <p className="text-xs uppercase text-slate-500">{t('wholesale_price')}</p>
                          <p className="font-semibold text-emerald-700">{formatPrice(product.wholesalePrice)}</p>
                        </div>
                      )}
                    </div>

                    {/* Stock column */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase text-slate-500">{t('stock')}</span>
                        <span
                          className={`font-semibold px-2 py-1 rounded-full text-white ${
                            isLowStock ? 'bg-red-500' : 'bg-emerald-500'
                          }`}
                        >
                          {stockLabel}
                        </span>
                      </div>
                      {product.minStockLevel !== undefined && (
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{t('min_stock_level')}</span>
                          <span>{product.minStockLevel}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{t('stock_value')}</span>
                        <span className="font-semibold text-slate-700">{formatPrice(stockValue)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-start justify-end gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 border-blue-200 text-blue-600 hover:bg-blue-50"
                        onClick={() => openProductDialog(product)}
                        title={t('edit')}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleDeleteProduct(product.id)}
                        title={t('delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">{t('categories')}</h2>
            <Button onClick={() => openCategoryDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              {t('add_category')}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <Card key={category.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      {category.image ? (
                        <img 
                          src={category.image} 
                          alt={category.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div 
                          className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center" 
                        >
                          <Tag className="w-5 h-5 text-white" />
                        </div>
                      )}
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openCategoryDialog(category)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteCategory(category.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {category.description && (
                    <p className="text-sm text-gray-600 mb-2">{category.description}</p>
                  )}
                  <div className="text-sm text-gray-500">
                    {products.filter(p => p.categoryId === category.id).length} products
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Product Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? t('edit_product') : t('add_product')}
            </DialogTitle>
          </DialogHeader>
          <Form {...productForm}>
            <form onSubmit={productForm.handleSubmit(editingProduct ? handleUpdateProduct : handleCreateProduct)} className="space-y-4 overflow-y-auto flex-1 pr-2">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={productForm.control}
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
                <FormField
                  control={productForm.control}
                  name="barcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('barcode')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={productForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={productForm.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('category')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('select_category')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">{t('no_category')}</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={productForm.control}
                  name="costPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('cost_price')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={productForm.control}
                  name="sellingPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('selling_price')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Pricing Tiers */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={productForm.control}
                  name="semiWholesalePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('semi_wholesale_price_optional')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={productForm.control}
                  name="wholesalePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('wholesale_price_optional')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || undefined)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={productForm.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('quantity')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={productForm.control}
                  name="minStockLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('min_stock_level')}</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={productForm.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('unit')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="pcs, kg, etc." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Image Upload */}
              <FormField
                control={productForm.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('product_image')}</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        {selectedImage ? (
                          <div className="relative inline-block">
                            <img 
                              src={selectedImage} 
                              alt="Product preview" 
                              className="w-32 h-32 object-cover rounded-lg border"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                              onClick={removeImage}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                            <Image className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="mt-2">
                              <label htmlFor="image-upload" className="cursor-pointer">
                                <span className="mt-2 block text-sm font-medium text-gray-900">
                                  {t('upload_product_image')}
                                </span>
                                <span className="mt-1 block text-xs text-gray-500">
                                  PNG, JPG, GIF up to 5MB
                                </span>
                              </label>
                              <input
                                id="image-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="hidden"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="mt-2"
                              onClick={() => document.getElementById('image-upload')?.click()}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Choose Image
                            </Button>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
          <DialogFooter className="flex-shrink-0 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setIsProductDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" onClick={() => productForm.handleSubmit(editingProduct ? handleUpdateProduct : handleCreateProduct)()}>
              {editingProduct ? t('update') : t('create')} {t('product')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? t('edit_category') : t('add_category')}
            </DialogTitle>
          </DialogHeader>
          <Form {...categoryForm}>
            <form onSubmit={categoryForm.handleSubmit(editingCategory ? handleUpdateCategory : handleCreateCategory)} className="space-y-4">
              <FormField
                control={categoryForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('category_name')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={categoryForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category Image Upload */}
              <FormField
                control={categoryForm.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('category_image')}</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        {selectedCategoryImage ? (
                          <div className="relative">
                            <img 
                              src={selectedCategoryImage} 
                              alt="Category preview"
                              className="w-32 h-32 object-cover rounded-lg border"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={removeCategoryImage}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                            <Image className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="mt-2">
                              <label htmlFor="category-image-upload" className="cursor-pointer">
                                <span className="mt-2 block text-sm font-medium text-gray-900">
                                  {t('upload_category_image')}
                                </span>
                                <span className="mt-1 block text-xs text-gray-500">
                                  PNG, JPG, GIF up to 5MB
                                </span>
                              </label>
                              <input
                                id="category-image-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleCategoryImageUpload}
                                className="hidden"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="mt-2"
                              onClick={() => document.getElementById('category-image-upload')?.click()}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              {t('choose_image')}
                            </Button>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                  {t('cancel')}
                </Button>
                <Button type="submit">
                  {editingCategory ? t('update') : t('create')} {t('category')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
