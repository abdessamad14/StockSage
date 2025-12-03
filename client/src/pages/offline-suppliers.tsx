import { useMemo, useState } from "react";
import { useOfflineSuppliers } from "@/hooks/use-offline-suppliers";
import { useOfflinePurchaseOrders } from "@/hooks/use-offline-purchase-orders";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { OfflineSupplier } from "@/lib/offline-storage";
import { supplierCreditHelpers, SupplierCreditTransaction } from "@/lib/database-storage";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Truck, Search, Plus, Edit, Trash2, Phone, Mail, MapPin, User, CreditCard, DollarSign, Receipt, History } from "lucide-react";
import { format } from "date-fns";

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
  const formatSignedCurrency = (value: number) => `${value > 0 ? '+' : value < 0 ? '-' : ''}${formatCurrency(Math.abs(value))}`;
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<OfflineSupplier | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<OfflineSupplier | null>(null);
  const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState(0);
  const [creditNote, setCreditNote] = useState("");
  const [creditInfo, setCreditInfo] = useState<{
    currentBalance: number;
    creditLimit: number;
    availableCredit: number;
    transactions: SupplierCreditTransaction[];
  } | null>(null);
  const [loadingCreditInfo, setLoadingCreditInfo] = useState(false);

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

  const handleDelete = (supplierId: string) => {
    if (window.confirm(t('confirm_delete_supplier'))) {
      deleteSupplier(supplierId);
      toast({
        title: t('success'),
        description: t('supplier_deleted_successfully')
      });
    }
  };

  const loadCreditInfo = async (supplier: OfflineSupplier) => {
    setLoadingCreditInfo(true);
    try {
      const info = await supplierCreditHelpers.getSupplierCreditInfo(supplier);
      setCreditInfo(info);
    } catch (error) {
      console.error('Error loading supplier credit info:', error);
      toast({
        title: t('error'),
        description: t('credit_load_error'),
        variant: "destructive"
      });
    } finally {
      setLoadingCreditInfo(false);
    }
  };

  const handleCreditPayment = async () => {
    if (!selectedSupplier) {
      toast({
        title: t('error'),
        description: t('credit_no_supplier_selected'),
        variant: "destructive"
      });
      return;
    }

    if (creditAmount <= 0) {
      toast({
        title: t('error'),
        description: t('credit_amount_invalid'),
        variant: "destructive"
      });
      return;
    }

    try {
      await supplierCreditHelpers.recordSupplierPayment(
        selectedSupplier,
        creditAmount,
        creditNote
      );

      toast({
        title: t('success'),
        description: t('supplier_payment_recorded_successfully', { amount: formatCurrency(creditAmount) })
      });

      // Reload credit info
      await loadCreditInfo(selectedSupplier);
      setCreditAmount(0);
      setCreditNote("");
    } catch (error) {
      console.error('Error recording payment:', error);
      toast({
        title: t('error'),
        description: t('credit_payment_error'),
        variant: "destructive"
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

      {/* Suppliers Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('supplier_name')}</TableHead>
              <TableHead>{t('contact_person')}</TableHead>
              <TableHead>{t('phone')}</TableHead>
              <TableHead>{t('email')}</TableHead>
              <TableHead>{t('address')}</TableHead>
              <TableHead className="text-right">{t('total_orders')}</TableHead>
              <TableHead className="text-right">{t('outstanding')}</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSuppliers.map((supplier) => {
              const balance = getSupplierBalance(supplier.id);
              return (
                <TableRow key={supplier.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-gray-400" />
                      {supplier.name}
                    </div>
                    {supplier.notes && (
                      <p className="text-xs text-gray-500 mt-1">{supplier.notes}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {supplier.contactPerson && (
                      <div className="flex items-center text-sm">
                        <User className="w-3 h-3 mr-1 text-gray-400" />
                        {supplier.contactPerson}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {supplier.phone && (
                      <div className="flex items-center text-sm">
                        <Phone className="w-3 h-3 mr-1 text-gray-400" />
                        {supplier.phone}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {supplier.email && (
                      <div className="flex items-center text-sm">
                        <Mail className="w-3 h-3 mr-1 text-gray-400" />
                        {supplier.email}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {supplier.address && (
                      <div className="flex items-center text-sm">
                        <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                        {supplier.address}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="text-sm">
                      <div className="font-medium">{balance.orderCount}</div>
                      <div className="text-xs text-gray-500">{formatCurrency(balance.totalOrders)}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {balance.totalOwed > 0 ? (
                      <div>
                        <div className="font-medium text-red-600">
                          {formatCurrency(balance.totalOwed)}
                        </div>
                        <Badge variant="destructive" className="text-xs mt-1">
                          {t('credit_badge_owed', { amount: formatCurrency(balance.totalOwed) })}
                        </Badge>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          setSelectedSupplier(supplier);
                          setIsCreditDialogOpen(true);
                          await loadCreditInfo(supplier);
                        }}
                        title={t('manage_credit')}
                      >
                        <CreditCard className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(supplier)}
                        title={t('edit')}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(supplier.id)}
                        title={t('delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

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

      {/* Supplier Credit Management Dialog */}
      <Dialog open={isCreditDialogOpen} onOpenChange={setIsCreditDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t('supplier_credit_management_title', { name: selectedSupplier?.name ?? '' })}</DialogTitle>
          </DialogHeader>
          
          {loadingCreditInfo ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">{t('credit_overview')}</TabsTrigger>
                <TabsTrigger value="payment">{t('record_payment')}</TabsTrigger>
                <TabsTrigger value="history">{t('transaction_history')}</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-red-600" />
                        {t('amount_owed_to_supplier')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(creditInfo?.currentBalance || 0)}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="payment" className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">{t('payment_amount')}</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={creditAmount || ''}
                      onChange={(e) => setCreditAmount(parseFloat(e.target.value) || 0)}
                      placeholder={t('enter_payment_amount')}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      {t('current_balance')}: <span className="font-semibold text-red-600">{formatCurrency(creditInfo?.currentBalance || 0)}</span>
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">{t('note')}</label>
                    <Textarea
                      value={creditNote}
                      onChange={(e) => setCreditNote(e.target.value)}
                      placeholder={t('add_payment_note')}
                      rows={3}
                    />
                  </div>

                  <Button 
                    onClick={handleCreditPayment}
                    disabled={creditAmount <= 0}
                    className="w-full"
                  >
                    {t('record_payment_button')}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                <div className="border rounded-lg">
                  {creditInfo && creditInfo.transactions.length > 0 ? (
                    <div className="divide-y">
                      {creditInfo.transactions.map((transaction) => (
                        <div key={transaction.id} className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium">
                                {transaction.type === 'credit_purchase' ? t('credit_purchase') : t('payment')}
                              </div>
                              <div className="text-sm text-gray-600">
                                {format(new Date(transaction.date), 'PPpp')}
                              </div>
                              {transaction.note && (
                                <div className="text-sm text-gray-500 mt-1">{transaction.note}</div>
                              )}
                            </div>
                            <div className={`font-bold ${
                              transaction.type === 'credit_purchase' ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {transaction.type === 'credit_purchase' ? '+' : '-'}{formatCurrency(transaction.amount)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>{t('no_credit_transactions')}</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreditDialogOpen(false);
              setCreditInfo(null);
              setCreditAmount(0);
              setCreditNote("");
            }}>
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
