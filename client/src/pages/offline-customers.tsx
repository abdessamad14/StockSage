import { useMemo, useState } from "react";
import { useOfflineCustomers } from "@/hooks/use-offline-customers";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";
import { OfflineCustomer } from "@/lib/offline-storage";
import { creditHelpers, CreditTransaction } from "@/lib/database-storage";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Search, Plus, Edit, Trash2, Phone, Mail, MapPin, CreditCard, DollarSign, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

type CustomerFormData = {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  creditBalance?: number;
  notes?: string;
};

export default function OfflineCustomers() {
  const { customers, loading, createCustomer, updateCustomer, deleteCustomer } = useOfflineCustomers();
  const { t } = useI18n();
  const { toast } = useToast();
  
  const customerSchema = useMemo(() => z.object({
    name: z.string().min(1, t('customer_name_required')),
    phone: z.string().optional(),
    email: z.string().email(t('invalid_email')).optional().or(z.literal('')),
    address: z.string().optional(),
    creditBalance: z.coerce.number().optional(),
    notes: z.string().optional()
  }), [t]);

  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<OfflineCustomer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<OfflineCustomer | null>(null);
  const [isCreditDialogOpen, setIsCreditDialogOpen] = useState(false);
  const [creditAmount, setCreditAmount] = useState(0);
  const [creditNote, setCreditNote] = useState("");
  const [creditInfo, setCreditInfo] = useState<{
    currentBalance: number;
    creditLimit: number;
    availableCredit: number;
    transactions: CreditTransaction[];
  } | null>(null);
  const [loadingCreditInfo, setLoadingCreditInfo] = useState(false);

  const formatCurrency = (value?: number) => `${(value ?? 0).toFixed(2)} ${t('currency')}`;
  const formatSignedCurrency = (value: number) => `${value > 0 ? '+' : value < 0 ? '-' : ''}${formatCurrency(Math.abs(value))}`;

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      creditBalance: 0,
      notes: ""
    }
  });

  const filteredCustomers = customers.filter(customer => 
    !searchQuery || 
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onSubmit = (data: CustomerFormData) => {
    try {
      if (editingCustomer) {
        updateCustomer(editingCustomer.id, {
          ...data,
          phone: data.phone || undefined,
          email: data.email || undefined,
          address: data.address || undefined,
          creditBalance: data.creditBalance || undefined,
          notes: data.notes || undefined
        });
        toast({
          title: t('success'),
          description: t('customer_updated_successfully')
        });
      } else {
        createCustomer({
          ...data,
          phone: data.phone || undefined,
          email: data.email || undefined,
          address: data.address || undefined,
          creditBalance: data.creditBalance || undefined,
          notes: data.notes || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        toast({
          title: t('success'),
          description: t('customer_created_successfully')
        });
      }
      
      setIsDialogOpen(false);
      setEditingCustomer(null);
      form.reset();
    } catch (error) {
      toast({
        title: t('error'),
        description: t('customer_save_error'),
        variant: "destructive"
      });
    }
  };

  const handleEdit = (customer: OfflineCustomer) => {
    setEditingCustomer(customer);
    form.reset({
      name: customer.name,
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      creditBalance: customer.creditBalance || 0,
      notes: customer.notes || ""
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (customer: OfflineCustomer) => {
    if (confirm(t('confirm_delete_customer', { name: customer.name }))) {
      deleteCustomer(customer.id);
      toast({
        title: t('success'),
        description: t('customer_deleted_successfully')
      });
    }
  };

  const loadCreditInfo = async (customer: OfflineCustomer) => {
    setLoadingCreditInfo(true);
    try {
      const info = await creditHelpers.getCustomerCreditInfo(customer);
      setCreditInfo(info);
    } catch (error) {
      console.error('Error loading credit info:', error);
      toast({
        title: t('error'),
        description: t('credit_load_error'),
        variant: "destructive"
      });
    } finally {
      setLoadingCreditInfo(false);
    }
  };

  const handleCreditAction = async () => {
    console.log('=== HANDLE CREDIT ACTION CALLED ===');
    console.log('Selected customer:', selectedCustomer);
    console.log('Credit amount:', creditAmount);
    console.log('Credit note:', creditNote);

    if (!selectedCustomer) {
      console.log('No customer selected');
      toast({
        title: t('error'),
        description: t('credit_no_customer_selected'),
        variant: "destructive"
      });
      return;
    }

    if (creditAmount <= 0) {
      console.log('Invalid amount:', creditAmount);
      toast({
        title: t('error'),
        description: t('credit_invalid_payment_amount'),
        variant: "destructive"
      });
      return;
    }

    try {
      console.log('Processing payment for customer:', selectedCustomer.name, 'ID:', selectedCustomer.id, 'Amount:', creditAmount);
      
      const paymentTransaction = await creditHelpers.addCreditPayment(
        selectedCustomer.id,
        creditAmount,
        creditNote || t('credit_payment_reference', { date: format(new Date(), 'MMM dd, yyyy') })
      );
      
      console.log('Payment transaction returned:', paymentTransaction);
      
      // Force reload credit info to show updated balance and new transaction
      console.log('Reloading credit info...');
      await loadCreditInfo(selectedCustomer);
      
      // Get fresh customer data
      const updatedCustomerInfo = await creditHelpers.getCustomerCreditInfo(selectedCustomer.id);
      console.log('Updated customer info:', updatedCustomerInfo);
      
      setSelectedCustomer(prev => prev ? {
        ...prev,
        creditBalance: updatedCustomerInfo.currentBalance
      } : null);
      
      toast({
        title: t('success'),
        description: t('credit_payment_success', {
          amount: formatCurrency(creditAmount),
          balance: formatCurrency(updatedCustomerInfo.currentBalance)
        })
      });

      setCreditAmount(0);
      setCreditNote("");
      
      console.log('=== PAYMENT PROCESSING COMPLETED ===');
    } catch (error) {
      console.error('Payment processing error:', error);
      toast({
        title: t('error'),
        description: t('credit_payment_error', {
          message: error instanceof Error ? error.message : t('unknown_error')
        }),
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
        <h1 className="text-3xl font-bold">{t('customers')}</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('add_customer')}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder={t('search_customers')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Customers Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('customer_name')}</TableHead>
              <TableHead>{t('phone')}</TableHead>
              <TableHead>{t('email')}</TableHead>
              <TableHead>{t('address')}</TableHead>
              <TableHead className="text-right">{t('credit_balance')}</TableHead>
              <TableHead className="text-right">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.map((customer) => (
              <TableRow key={customer.id} className="hover:bg-gray-50">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {customer.name}
                    {(customer.creditBalance || 0) > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {t('credit_badge_owed', { amount: formatCurrency(customer.creditBalance) })}
                      </Badge>
                    )}
                  </div>
                  {customer.notes && (
                    <p className="text-xs text-gray-500 mt-1">{customer.notes}</p>
                  )}
                </TableCell>
                <TableCell>
                  {customer.phone && (
                    <div className="flex items-center text-sm">
                      <Phone className="w-3 h-3 mr-1 text-gray-400" />
                      {customer.phone}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {customer.email && (
                    <div className="flex items-center text-sm">
                      <Mail className="w-3 h-3 mr-1 text-gray-400" />
                      {customer.email}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {customer.address && (
                    <div className="flex items-center text-sm">
                      <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                      {customer.address}
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {(customer.creditBalance || 0) > 0 ? (
                    <span className="font-medium text-red-600">
                      {formatCurrency(customer.creditBalance)}
                    </span>
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
                        setSelectedCustomer(customer);
                        setIsCreditDialogOpen(true);
                        await loadCreditInfo(customer);
                      }}
                      title={t('manage_credit')}
                    >
                      <CreditCard className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(customer)}
                      title={t('edit')}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(customer)}
                      title={t('delete')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('no_customers_found')}</h3>
          <p className="text-gray-600">
            {searchQuery ? t('adjust_search_prompt') : t('add_first_customer_prompt')}
          </p>
        </div>
      )}

      {/* Customer Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? t('edit_customer') : t('add_new_customer')}
            </DialogTitle>
            <DialogDescription>
              {editingCustomer ? t('update_customer_description') : t('create_customer_description')}
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
                      <FormLabel>{t('customer_name')}</FormLabel>
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
                  {editingCustomer ? t('update_customer') : t('create_customer')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Credit Management Dialog */}
      <Dialog open={isCreditDialogOpen} onOpenChange={setIsCreditDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t('credit_management_title', { name: selectedCustomer?.name ?? '' })}</DialogTitle>
            <DialogDescription>
              {t('credit_management_desc')}
            </DialogDescription>
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
                        {formatCurrency(creditInfo?.currentBalance)}
                      </p>
                    </Card>
                    
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="w-5 h-5 text-blue-500" />
                        <h3 className="font-semibold">{t('credit_limit')}</h3>
                      </div>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency(creditInfo?.creditLimit)}
                      </p>
                    </Card>
                    
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-5 h-5 text-green-500" />
                        <h3 className="font-semibold">{t('available_credit')}</h3>
                      </div>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(Math.max(0, creditInfo?.availableCredit ?? 0))}
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
                      <Input
                        value={creditNote}
                        onChange={(e) => setCreditNote(e.target.value)}
                        placeholder={t('optional_note_placeholder')}
                        className="mt-1"
                      />
                    </div>
                    
                    <Button 
                      onClick={handleCreditAction}
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
                          {formatCurrency(creditInfo?.currentBalance)}
                        </span>
                      </div>
                      {creditAmount > 0 && (
                        <div className="flex justify-between">
                          <span>{t('after_payment')}:</span>
                          <span className="font-medium text-green-600">
                            {formatCurrency(Math.max(0, (creditInfo?.currentBalance || 0) - creditAmount))}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="history" className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <History className="w-5 h-5" />
                  <h3 className="font-semibold">{t('credit_transaction_history')}</h3>
                </div>
                
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('date')}</TableHead>
                        <TableHead>{t('type')}</TableHead>
                        <TableHead>{t('amount')}</TableHead>
                        <TableHead>{t('description')}</TableHead>
                        <TableHead>{t('balance_after')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {creditInfo?.transactions && creditInfo.transactions.length > 0 ? (
                        creditInfo.transactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              {format(new Date(transaction.date), 'MMM dd, yyyy HH:mm')}
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={
                                  transaction.type === 'credit_sale' ? 'destructive' : 
                                  transaction.type === 'payment' ? 'default' : 
                                  'secondary'
                                }
                              >
                                {transaction.type === 'credit_sale' ? t('transaction_type_sale') : 
                                 transaction.type === 'payment' ? t('transaction_type_payment') : 
                                 transaction.type === 'adjustment' ? t('transaction_type_adjustment') : transaction.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className={transaction.amount > 0 ? 'text-red-600' : 'text-green-600'}>
                                {formatSignedCurrency(transaction.amount)}
                              </span>
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {transaction.description}
                            </TableCell>
                            <TableCell>
                              <span className="font-medium text-red-600">
                                {formatCurrency(transaction.balanceAfter)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                            {loadingCreditInfo ? t('loading_transactions') : t('no_credit_transactions')}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
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
