import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Order, Supplier, InsertOrder, InsertOrderItem } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, 
  Search, 
  FileText, 
  Trash2, 
  RefreshCw, 
  AlertTriangle,
  PackageOpen,
  Truck,
  CheckCircle,
  Clock,
  Filter
} from "lucide-react";

const orderItemSchema = z.object({
  productId: z.coerce.number().min(1, "Required"),
  quantity: z.coerce.number().min(1, "Minimum 1"),
  unitPrice: z.coerce.number().min(0.01, "Required")
});

const orderFormSchema = z.object({
  supplierId: z.coerce.number().nullable(),
  notes: z.string().optional(),
  items: z.array(orderItemSchema).min(1, "At least one item is required")
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

export default function Orders() {
  const { t } = useI18n();
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = user && user.role === 'admin';
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [supplierFilter, setSupplierFilter] = useState<number | null>(null);

  // Fetch orders
  const {
    data: orders = [],
    isLoading: isLoadingOrders,
    isError: isOrdersError,
    refetch: refetchOrders
  } = useQuery({
    queryKey: ['/api/orders'],
    enabled: isAdmin, // Only admins can view orders
  });

  // Fetch suppliers for the form
  const {
    data: suppliers = [],
    isLoading: isLoadingSuppliers
  } = useQuery({
    queryKey: ['/api/suppliers'],
  });

  // Fetch products for the form
  const {
    data: products = [],
    isLoading: isLoadingProducts
  } = useQuery({
    queryKey: ['/api/products'],
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (data: OrderFormValues) => {
      const res = await apiRequest('POST', '/api/orders', {
        order: {
          supplierId: data.supplierId,
          notes: data.notes,
          totalAmount: data.items.reduce(
            (sum, item) => sum + item.quantity * item.unitPrice, 
            0
          ),
          status: 'pending',
          orderNumber: `PO-${Date.now().toString().slice(-8)}`
        },
        items: data.items.map(item => ({
          ...item,
          totalPrice: item.quantity * item.unitPrice
        }))
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t('success'),
        description: t('order_created'),
      });
      form.reset();
      setIsOrderFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : t('create_order_error'),
        variant: "destructive",
      });
    }
  });

  // Update order status mutation
  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      const res = await apiRequest('PUT', `/api/orders/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t('success'),
        description: t('order_updated'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    },
    onError: (error) => {
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : t('update_order_error'),
        variant: "destructive",
      });
    }
  });

  // Form for creating new orders
  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      supplierId: null,
      notes: "",
      items: [{ productId: 0, quantity: 1, unitPrice: 0 }]
    }
  });

  // Helper to add items to the order
  const addOrderItem = () => {
    const items = form.getValues().items || [];
    form.setValue("items", [
      ...items,
      { productId: 0, quantity: 1, unitPrice: 0 }
    ]);
  };

  // Helper to remove items from the order
  const removeOrderItem = (index: number) => {
    const items = form.getValues().items || [];
    if (items.length > 1) {
      form.setValue("items", items.filter((_, i) => i !== index));
    }
  };

  // Handle form submission
  const onSubmit = (data: OrderFormValues) => {
    createOrderMutation.mutate(data);
  };

  // Get supplier name by ID
  const getSupplierName = (id: number | null) => {
    if (!id) return t('unknown_supplier');
    const supplier = suppliers.find(s => s.id === id);
    return supplier ? supplier.name : t('unknown_supplier');
  };

  // Get product name by ID
  const getProductName = (id: number) => {
    const product = products.find(p => p.id === id);
    return product ? product.name : t('unknown_product');
  };

  // Filter orders based on search and filters
  const filteredOrders = orders
    .filter(order => {
      // Text search
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const supplierName = getSupplierName(order.supplierId).toLowerCase();
        const orderNumber = order.orderNumber.toLowerCase();
        return (
          orderNumber.includes(searchLower) || 
          supplierName.includes(searchLower)
        );
      }
      return true;
    })
    .filter(order => {
      // Status filter
      if (statusFilter && statusFilter !== 'all') {
        return order.status === statusFilter;
      }
      return true;
    })
    .filter(order => {
      // Supplier filter
      if (supplierFilter && supplierFilter > 0) {
        return order.supplierId === supplierFilter;
      }
      return true;
    });

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" /> {t('pending')}</Badge>;
      case 'in_transit':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><Truck className="h-3 w-3 mr-1" /> {t('in_transit')}</Badge>;
      case 'received':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" /> {t('received')}</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><AlertTriangle className="h-3 w-3 mr-1" /> {t('cancelled')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // If not admin, show access denied
  if (!isAdmin) {
    return (
      <div className="p-4">
        <Card className="bg-amber-50 border border-amber-200 p-4">
          <div className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-semibold">{t('access_denied')}</h3>
          </div>
          <p className="mt-2 text-sm text-amber-700">{t('orders_admin_only')}</p>
        </Card>
      </div>
    );
  }

  // Loading state
  if (isLoadingOrders) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-9 w-32" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32 mb-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-6 w-full mb-2" />
            <Skeleton className="h-6 w-full mb-2" />
            <Skeleton className="h-6 w-full mb-2" />
            <Skeleton className="h-6 w-full mb-2" />
            <Skeleton className="h-6 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (isOrdersError) {
    return (
      <div className="p-4">
        <Card className="bg-red-50 border border-red-200 p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-semibold">{t('error')}</h3>
          </div>
          <p className="mt-2 text-sm text-red-700">{t('orders_load_error')}</p>
          <Button 
            onClick={() => refetchOrders()} 
            variant="outline" 
            className="mt-4 text-red-700 border-red-300"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('retry')}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <h1 className="text-xl font-bold">{t('orders')}</h1>
        
        <Button onClick={() => setIsOrderFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('new_order')}
        </Button>
      </div>
      
      {/* Filters */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="flex">
          <Input
            placeholder={t('search_orders')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        
        <div className="flex">
          <Select value={statusFilter || ""} onValueChange={(value) => setStatusFilter(value || null)}>
            <SelectTrigger className="w-full">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                {!statusFilter ? t('status_filter') : t(statusFilter as any)}
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all_statuses')}</SelectItem>
              <SelectItem value="pending">{t('pending')}</SelectItem>
              <SelectItem value="in_transit">{t('in_transit')}</SelectItem>
              <SelectItem value="received">{t('received')}</SelectItem>
              <SelectItem value="cancelled">{t('cancelled')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex">
          <Select 
            value={supplierFilter?.toString() || "all"}
            onValueChange={(value) => setSupplierFilter(value !== "all" ? parseInt(value) : null)}
          >
            <SelectTrigger className="w-full">
              <div className="flex items-center gap-2">
                <PackageOpen className="h-4 w-4" />
                {supplierFilter 
                  ? getSupplierName(supplierFilter) 
                  : t('supplier_filter')}
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('all_suppliers')}</SelectItem>
              {suppliers.map(supplier => (
                <SelectItem key={supplier.id} value={supplier.id.toString()}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Orders table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('order_list')}</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>{t('no_orders_found')}</p>
              <Button 
                variant="link" 
                onClick={() => setIsOrderFormOpen(true)}
                className="mt-2"
              >
                {t('create_first_order')}
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('order_number')}</TableHead>
                    <TableHead>{t('supplier')}</TableHead>
                    <TableHead>{t('date')}</TableHead>
                    <TableHead className="text-right">{t('total')}</TableHead>
                    <TableHead>{t('status')}</TableHead>
                    <TableHead className="text-right">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell>{getSupplierName(order.supplierId)}</TableCell>
                      <TableCell>
                        {new Date(order.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {order.totalAmount.toFixed(2)} {t('currency')}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(order.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Select 
                          value={order.status}
                          onValueChange={(value) => {
                            updateOrderStatusMutation.mutate({ id: order.id, status: value });
                          }}
                          disabled={updateOrderStatusMutation.isPending}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue placeholder={t('update_status')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">{t('pending')}</SelectItem>
                            <SelectItem value="in_transit">{t('in_transit')}</SelectItem>
                            <SelectItem value="received">{t('received')}</SelectItem>
                            <SelectItem value="cancelled">{t('cancelled')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* New Order Dialog */}
      <Dialog open={isOrderFormOpen} onOpenChange={setIsOrderFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t('create_order')}</DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('supplier')}</FormLabel>
                    <Select
                      value={field.value?.toString() || ""}
                      onValueChange={(value) => 
                        field.onChange(value ? parseInt(value) : null)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('select_supplier')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingSuppliers ? (
                          <SelectItem value="loading" disabled>
                            {t('loading')}
                          </SelectItem>
                        ) : (
                          suppliers.map((supplier) => (
                            <SelectItem
                              key={supplier.id}
                              value={supplier.id.toString()}
                            >
                              {supplier.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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
              
              <div>
                <h3 className="text-sm font-medium mb-3">{t('order_items')}</h3>
                
                {form.getValues().items.map((_, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                    <div className="col-span-5">
                      <FormField
                        control={form.control}
                        name={`items.${index}.productId`}
                        render={({ field }) => (
                          <FormItem>
                            <Select
                              value={field.value.toString()}
                              onValueChange={(value) => 
                                field.onChange(parseInt(value))
                              }
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={t('select_product')} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {isLoadingProducts ? (
                                  <SelectItem value="0" disabled>
                                    {t('loading')}
                                  </SelectItem>
                                ) : (
                                  products.map((product) => (
                                    <SelectItem
                                      key={product.id}
                                      value={product.id.toString()}
                                    >
                                      {product.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="col-span-3">
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder={t('quantity')}
                                min="1"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="col-span-3">
                      <FormField
                        control={form.control}
                        name={`items.${index}.unitPrice`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder={t('price')}
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="col-span-1 flex items-center justify-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOrderItem(index)}
                        disabled={form.getValues().items.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addOrderItem}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t('add_item')}
                </Button>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsOrderFormOpen(false)}
                >
                  {t('cancel')}
                </Button>
                <Button 
                  type="submit" 
                  disabled={createOrderMutation.isPending}
                >
                  {createOrderMutation.isPending ? t('creating') : t('create_order')}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}