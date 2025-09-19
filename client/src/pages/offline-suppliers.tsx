import { useMemo, useState } from "react";
import { useOfflineSuppliers } from "@/hooks/use-offline-suppliers";
import { useOfflinePurchaseOrders } from "@/hooks/use-offline-purchase-orders";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { OfflineSupplier } from "@/lib/offline-storage";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Truck, Search, Plus, Edit, Trash2, Phone, Mail, MapPin, User, CreditCard, DollarSign, Receipt } from "lucide-react";

type Translator = (key: string, params?: { [key: string]: string | number }) => string;

type SupplierFormData = z.infer<
  ReturnType<typeof buildSupplierSchema>
>;

function buildSupplierSchema(t: Translator) {
  return z.object({
    name: z.string().min(1, t('supplier_name_required')),
    contactPerson: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email(t('invalid_email')).optional().or(z.literal("")),
    address: z.string().optional(),
    notes: z.string().optional()
  });
}

export default function OfflineSuppliers() {
  const { suppliers, loading, createSupplier, updateSupplier, deleteSupplier } = useOfflineSuppliers();
  const { orders } = useOfflinePurchaseOrders();
  const { t } = useI18n();
  const { toast } = useToast();
  const supplierSchema = useMemo(() => buildSupplierSchema(t), [t]);
  const formatCurrency = (value?: number) => `${(value ?? 0).toFixed(2)} ${t('currency')}`;
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<OfflineSupplier | null>(null);

  // Calculate supplier credit balance
  const getSupplierBalance = (supplierId: string) => {
    const supplierOrders = orders.filter(order => order.supplierId === supplierId);
    const totalOrders = supplierOrders.reduce((sum, order) => sum + order.total, 0);
    const totalPaid = supplierOrders.reduce((sum, order) => sum + (order.paidAmount || 0), 0);
    const totalOwed = totalOrders - totalPaid;
    
    return {
      totalOwed: Math.max(0, totalOwed), // Ensure no negative values
      totalPaid,
      totalOrders,
      orderCount: supplierOrders.length
    };
  };

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: "",
      contactPerson: "",
      phone: "",
      email: "",
      address: "",
      notes: ""
    }
  });

  const filteredSuppliers = suppliers.filter(supplier => 
    !searchQuery || 
    supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onSubmit = (data: SupplierFormData) => {
    try {
      if (editingSupplier) {
        updateSupplier(editingSupplier.id, {
          ...data,
          contactPerson: data.contactPerson || null,
          phone: data.phone || null,
          email: data.email || null,
          address: data.address || null,
          notes: data.notes || null
        });
        toast({
          title: t('success'),
          description: t('supplier_updated_successfully')
        });
      } else {
        createSupplier({
          ...data,
          contactPerson: data.contactPerson || null,
          phone: data.phone || null,
          email: data.email || null,
          address: data.address || null,
          notes: data.notes || null
        });
        toast({
          title: t('success'),
          description: t('supplier_created_successfully')
        });
      }
      
      setIsDialogOpen(false);
      setEditingSupplier(null);
      form.reset();
    } catch (error) {
      toast({
        title: t('error'),
        description: t('supplier_save_error'),
        variant: "destructive"
      });
    }
  };

  const handleEdit = (supplier: OfflineSupplier) => {
    setEditingSupplier(supplier);
    form.reset({
      name: supplier.name,
      contactPerson: supplier.contactPerson || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      notes: supplier.notes || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (supplier: OfflineSupplier) => {
    if (confirm(t('supplier_delete_confirm', { name: supplier.name }))) {
      deleteSupplier(supplier.id);
      toast({
        title: t('success'),
        description: t('supplier_deleted_successfully')
      });
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('suppliers')}</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('add_supplier')}
        </Button>
      </div>

      {/* Credit Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              {t('total_outstanding')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(
                suppliers.reduce((sum, supplier) => sum + getSupplierBalance(supplier.id).totalOwed, 0)
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              {t('total_paid')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(
                suppliers.reduce((sum, supplier) => sum + getSupplierBalance(supplier.id).totalPaid, 0)
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              {t('total_orders_count')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {suppliers.reduce((sum, supplier) => sum + getSupplierBalance(supplier.id).orderCount, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder={t('search_suppliers')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.map((supplier) => {
          const balance = getSupplierBalance(supplier.id);
          return (
            <Card key={supplier.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  {supplier.name}
                </h3>
                {supplier.contactPerson && (
                  <div className="flex items-center text-sm text-gray-600 mt-1">
                    <User className="w-3 h-3 mr-1" />
                    {supplier.contactPerson}
                  </div>
                )}
                {supplier.phone && (
                  <div className="flex items-center text-sm text-gray-600 mt-1">
                    <Phone className="w-3 h-3 mr-1" />
                    {supplier.phone}
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center text-sm text-gray-600 mt-1">
                    <Mail className="w-3 h-3 mr-1" />
                    {supplier.email}
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-center text-sm text-gray-600 mt-1">
                    <MapPin className="w-3 h-3 mr-1" />
                    {supplier.address}
                  </div>
                )}
                
                {/* Credit Balance Information */}
                <div className="mt-3 pt-3 border-t">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{t('total_orders')}:</span>
                      <span className="font-medium">{balance.orderCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{t('total_value')}:</span>
                      <span className="font-medium">{formatCurrency(balance.totalOrders)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{t('paid_amount')}:</span>
                      <span className="font-medium text-green-600">{formatCurrency(balance.totalPaid)}</span>
                    </div>
                    {balance.totalOwed > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{t('outstanding')}:</span>
                        <span className="font-medium text-red-600">{formatCurrency(balance.totalOwed)}</span>
                      </div>
                    )}
                    {balance.totalOwed > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {t('credit_badge_owed', { amount: formatCurrency(balance.totalOwed) })}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit(supplier)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(supplier)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {supplier.notes && (
              <p className="text-sm text-gray-600 mt-2 pt-2 border-t">{supplier.notes}</p>
            )}
          </Card>
          );
        })}
      </div>

      {filteredSuppliers.length === 0 && (
        <div className="text-center py-12">
          <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('no_suppliers_found')}</h3>
          <p className="text-gray-600">
            {searchQuery ? t('adjust_search_suppliers') : t('add_first_supplier_prompt')}
          </p>
        </div>
      )}

      {/* Supplier Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingSupplier ? t('edit_supplier') : t('add_new_supplier')}
            </DialogTitle>
            <DialogDescription>
              {editingSupplier ? t('update_supplier_description') : t('create_supplier_description')}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('supplier_name')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="contactPerson"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('contact_person')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('phone')}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('email')}</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('address')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
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
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t('cancel')}
                </Button>
                <Button type="submit">
                  {editingSupplier ? t('update_supplier') : t('create_supplier')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
